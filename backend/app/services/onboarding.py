"""Helpers shared by onboarding flows."""
from __future__ import annotations

import base64
import binascii
from datetime import date, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.core.storage import generate_filename, upload_workspace_file
from app.models.client import Client
from app.models.exercise import ClientMeasurement


ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}


def _normalize_gender(raw: str | None) -> str:
    value = (raw or "").strip().lower()
    return "female" if value in {"female", "femenino", "mujer", "f"} else "male"


def _normalize_goal(raw: str | None) -> str:
    value = (raw or "").strip().lower()
    if value in {"lose_weight", "fat_loss", "definition", "weight_loss"}:
        return "fat_loss"
    if value in {"gain_muscle", "muscle_gain", "hypertrophy"}:
        return "muscle_gain"
    return "maintenance"


def _calculate_age(birth_date: str | None) -> int:
    if not birth_date:
        return 30
    try:
        born = date.fromisoformat(str(birth_date).split("T")[0])
    except (TypeError, ValueError):
        return 30
    today = date.today()
    return max(1, today.year - born.year - ((today.month, today.day) < (born.month, born.day)))


def _calculate_bmr(
    *,
    weight_kg: float,
    height_cm: float,
    age: int,
    gender: str,
    body_fat_pct: float | None,
    formula: str,
) -> float:
    if formula == "katch" and body_fat_pct and body_fat_pct > 0:
        lean_mass = weight_kg * (1 - body_fat_pct / 100)
        return 370 + (21.6 * lean_mass)
    if formula == "harris":
        if gender == "male":
            return 66.5 + (13.75 * weight_kg) + (5.003 * height_cm) - (6.75 * age)
        return 655.1 + (9.563 * weight_kg) + (1.850 * height_cm) - (4.676 * age)
    if gender == "male":
        return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161


def enrich_onboarding_health_data(
    *,
    health_data: dict[str, Any] | None,
    birth_date: str | None,
    gender: str | None,
    height_cm: float | None,
    weight_kg: float | None,
) -> dict[str, Any]:
    """Persist the initial nutrition target generated during onboarding.

    The client profile UI reads ``health_data.nutrition_calculations_history``.
    Older onboarding paths only stored raw inputs, so the history appeared empty
    until a trainer manually recalculated. This helper creates the first
    calculation entry from onboarding data and keeps the latest targets in the
    top-level health_data fields.
    """
    data = dict(health_data or {})
    if data.get("nutrition_calculations_history"):
        return data

    try:
        weight = float(weight_kg or 0)
        height = float(height_cm or 0)
    except (TypeError, ValueError):
        return data
    if weight <= 0 or height <= 0:
        return data

    age = _calculate_age(birth_date)
    normalized_gender = _normalize_gender(gender)
    formula = str(data.get("formula_used") or "mifflin")
    activity_level = str(data.get("activity_level") or "moderate")
    goal_type = _normalize_goal(str(data.get("goal_type") or data.get("fitness_goal") or "maintenance"))
    body_fat_pct = data.get("body_fat_pct")
    try:
        body_fat = float(body_fat_pct) if body_fat_pct is not None else None
    except (TypeError, ValueError):
        body_fat = None

    bmr = _calculate_bmr(
        weight_kg=weight,
        height_cm=height,
        age=age,
        gender=normalized_gender,
        body_fat_pct=body_fat,
        formula=formula,
    )
    tdee = bmr * ACTIVITY_MULTIPLIERS.get(activity_level, ACTIVITY_MULTIPLIERS["moderate"])
    target_calories = round(tdee * 0.8) if goal_type == "fat_loss" else round(tdee * 1.15) if goal_type == "muscle_gain" else round(tdee)
    target_protein = round(weight * (1.8 if goal_type == "maintenance" else 2.2))
    target_fat = round((target_calories * 0.28) / 9)
    target_carbs = round((target_calories - (target_protein * 4) - (target_fat * 9)) / 4)
    calculated_at = datetime.utcnow().isoformat()

    entry = {
        "calculated_at": calculated_at,
        "weight_kg": round(weight, 1),
        "height_cm": round(height, 1),
        "age": age,
        "gender": normalized_gender,
        "body_fat_pct": body_fat,
        "activity_level": activity_level,
        "goal_type": goal_type,
        "formula_used": formula,
        "bmr": round(bmr),
        "tdee": round(tdee),
        "target_calories": target_calories,
        "target_protein": target_protein,
        "target_carbs": target_carbs,
        "target_fat": target_fat,
        "notes": "Cálculo inicial generado desde onboarding",
    }

    data.update({
        "goal_type": goal_type,
        "formula_used": formula,
        "bmr": entry["bmr"],
        "tdee": entry["tdee"],
        "target_calories": target_calories,
        "target_protein": target_protein,
        "target_carbs": target_carbs,
        "target_fat": target_fat,
        "calculated_at": calculated_at,
        "nutrition_calculations_history": [entry],
    })
    return data


async def attach_onboarding_progress_photo(
    *,
    db: AsyncSession,
    client: Client,
    data_url: str | None,
    photo_type: str = "front",
) -> None:
    """Attach an optional onboarding progress photo from a browser data URL."""
    if not data_url:
        return
    if "," not in data_url:
        return
    header, encoded = data_url.split(",", 1)
    content_type = "image/jpeg"
    if "image/png" in header:
        content_type = "image/png"
    elif "image/webp" in header:
        content_type = "image/webp"
    elif "image/jpeg" not in header and "image/jpg" not in header:
        return
    try:
        content = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        return
    if not content or len(content) > 10 * 1024 * 1024:
        return

    extension = "png" if content_type == "image/png" else "webp" if content_type == "image/webp" else "jpg"
    filename = generate_filename(f"onboarding.{extension}")
    public_url = await upload_workspace_file(
        content,
        client.workspace_id,
        "clients",
        str(client.id),
        "progress-photos",
        filename,
        content_type=content_type,
    )
    photo_data = {
        "url": public_url,
        "type": photo_type,
        "notes": "Foto inicial subida desde onboarding",
        "uploaded_at": datetime.utcnow().isoformat(),
        "measurement_date": str(date.today()),
        "filename": filename,
    }
    measurement = ClientMeasurement(
        client_id=client.id,
        measured_at=datetime.utcnow(),
        weight_kg=float(client.weight_kg) if client.weight_kg else None,
        photos=[photo_data],
        notes="Primer progreso desde onboarding",
    )
    db.add(measurement)
    flag_modified(measurement, "photos")
