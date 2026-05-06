"""Hidratacion de imagenes en JSONB de programas de entrenamiento y planes nutricionales.

Tanto el endpoint de entrenador como el del cliente leen JSONB
``template`` (workouts) o ``plan`` (nutrition). Esos blobs guardan un
*snapshot* del Exercise / Food en el momento de crear la plantilla, asi
que la ``image_url`` puede:

  * No existir (plantillas creadas antes de tener fotos).
  * Ser una URL R2 firmada caducada (``ExpiredRequest``).
  * Apuntar a un Exercise/Food cuya foto se haya cambiado despues.

Para resolverlo, antes de devolver el JSONB:

  1. Recolectamos los ``exercise_id`` / ``food_id`` referenciados.
  2. Hacemos un único ``SELECT ... WHERE id IN (...)`` a la tabla viva.
  3. Pisamos la ``image_url`` (canonica) en cada snapshot.
  4. Refirmamos todas las URLs R2 con ``resolve_image_urls_in_obj`` para
     que el navegador reciba presigned URLs vigentes.

Este modulo concentra esa logica para que tanto los endpoints del
entrenador como los del cliente la compartan sin duplicar codigo.
"""
from __future__ import annotations

import copy
from typing import Iterable
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import resolve_image_urls_in_obj
from app.models.exercise import Exercise
from app.models.nutrition import Food


# ---------------------------------------------------------------------------
# Workouts
# ---------------------------------------------------------------------------

def _iter_workout_exercise_dicts(template: dict | None):
    """Recorre cada dict de ejercicio embebido en un ``template``.

    Soporta los layouts modernos (``days[].blocks[].exercises[]``) y los
    legacy (``weeks[].days[].exercises[]`` y ``blocks[]`` raiz).
    """
    if not isinstance(template, dict):
        return
    days = template.get("days")
    if isinstance(days, list):
        for day in days:
            if not isinstance(day, dict):
                continue
            for block in day.get("blocks") or []:
                if not isinstance(block, dict):
                    continue
                for ex in block.get("exercises") or []:
                    if isinstance(ex, dict):
                        yield ex
    weeks = template.get("weeks")
    if isinstance(weeks, list):
        for week in weeks:
            if not isinstance(week, dict):
                continue
            for day in week.get("days") or []:
                if not isinstance(day, dict):
                    continue
                for block in day.get("blocks") or []:
                    if isinstance(block, dict):
                        for ex in block.get("exercises") or []:
                            if isinstance(ex, dict):
                                yield ex
                for ex in day.get("exercises") or []:
                    if isinstance(ex, dict):
                        yield ex
    for block in template.get("blocks") or []:
        if not isinstance(block, dict):
            continue
        for ex in block.get("exercises") or []:
            if isinstance(ex, dict):
                yield ex


def collect_exercise_ids(*templates) -> set[str]:
    """``{exercise_id}`` referenciados en cualquiera de los templates."""
    ids: set[str] = set()
    for tmpl in templates:
        for ex in _iter_workout_exercise_dicts(tmpl):
            eid = ex.get("exercise_id") or (ex.get("exercise") or {}).get("id")
            if eid:
                ids.add(str(eid))
    return ids


def _apply_exercise_media(template: dict | None, media: dict[str, dict]) -> None:
    """Pisa ``image_url`` / ``video_url`` de cada ejercicio con la info viva."""
    if not isinstance(template, dict) or not media:
        return
    for ex in _iter_workout_exercise_dicts(template):
        eid = ex.get("exercise_id") or (ex.get("exercise") or {}).get("id")
        if not eid:
            continue
        info = media.get(str(eid))
        if not info:
            continue
        nested = ex.get("exercise")
        if not isinstance(nested, dict):
            nested = {"id": str(eid)}
            ex["exercise"] = nested
        if info.get("name") and not nested.get("name"):
            nested["name"] = info["name"]
        # Siempre pisamos image_url con la URL canonica viva: es la unica
        # forma de garantizar que la firma posterior se haga sobre algo
        # que existe en R2 y sin querystring obsoleto.
        if info.get("image_url"):
            nested["image_url"] = info["image_url"]
        if info.get("video_url") and not nested.get("video_url"):
            nested["video_url"] = info["video_url"]


async def fetch_exercise_media(
    db: AsyncSession, exercise_ids: Iterable[str]
) -> dict[str, dict]:
    """``{exercise_id: {name, image_url, video_url}}`` para los ids dados."""
    valid_ids: list[UUID] = []
    for raw in exercise_ids or []:
        try:
            valid_ids.append(UUID(str(raw)))
        except (ValueError, TypeError):
            continue
    if not valid_ids:
        return {}
    result = await db.execute(
        select(Exercise.id, Exercise.name, Exercise.image_url, Exercise.video_url).where(
            Exercise.id.in_(valid_ids)
        )
    )
    return {
        str(row.id): {
            "name": row.name,
            "image_url": row.image_url,
            "video_url": row.video_url,
        }
        for row in result.all()
    }


async def hydrate_workout_templates(
    db: AsyncSession, *templates: dict | None
) -> list[dict | None]:
    """Devuelve copias hidratadas (con imagenes vivas + URLs refirmadas).

    Llamadores tipicos:

        new_tpl, new_exec = await hydrate_workout_templates(
            db, program.template, program.executed_template
        )
    """
    ids = collect_exercise_ids(*templates)
    media = await fetch_exercise_media(db, ids) if ids else {}
    out: list[dict | None] = []
    for tmpl in templates:
        if not tmpl:
            out.append(tmpl)
            continue
        clone = copy.deepcopy(tmpl)
        if media:
            _apply_exercise_media(clone, media)
        await resolve_image_urls_in_obj(clone)
        out.append(clone)
    return out


# ---------------------------------------------------------------------------
# Meal plans
# ---------------------------------------------------------------------------

def _iter_meal_food_items(plan: dict | None):
    if not isinstance(plan, dict):
        return
    layouts: list[list] = []
    weeks = plan.get("weeks")
    if isinstance(weeks, list):
        for week in weeks:
            if isinstance(week, dict) and isinstance(week.get("days"), list):
                layouts.append(week["days"])
    days = plan.get("days")
    if isinstance(days, list):
        layouts.append(days)
    for day_list in layouts:
        for day in day_list:
            if not isinstance(day, dict):
                continue
            for meal in day.get("meals") or []:
                if not isinstance(meal, dict):
                    continue
                for item in meal.get("items") or []:
                    if isinstance(item, dict):
                        yield item


def collect_food_ids(*plans) -> set[str]:
    ids: set[str] = set()
    for plan in plans:
        for item in _iter_meal_food_items(plan):
            if item.get("type") and item.get("type") != "food":
                continue
            fid = item.get("food_id") or (item.get("food") or {}).get("id")
            if fid:
                ids.add(str(fid))
    return ids


def _apply_food_media(plan: dict | None, media: dict[str, str]) -> None:
    if not isinstance(plan, dict) or not media:
        return
    for item in _iter_meal_food_items(plan):
        if item.get("type") and item.get("type") != "food":
            continue
        fid = item.get("food_id") or (item.get("food") or {}).get("id")
        if not fid:
            continue
        url = media.get(str(fid))
        if not url:
            continue
        food = item.get("food")
        if not isinstance(food, dict):
            food = {"id": str(fid)}
            item["food"] = food
        food["image_url"] = url


async def fetch_food_media(
    db: AsyncSession, food_ids: Iterable[str]
) -> dict[str, str]:
    valid_ids: list[UUID] = []
    for raw in food_ids or []:
        try:
            valid_ids.append(UUID(str(raw)))
        except (ValueError, TypeError):
            continue
    if not valid_ids:
        return {}
    result = await db.execute(
        select(Food.id, Food.image_url).where(
            Food.id.in_(valid_ids), Food.image_url.is_not(None)
        )
    )
    return {str(row.id): row.image_url for row in result.all() if row.image_url}


async def hydrate_meal_plans(
    db: AsyncSession, *plans: dict | None
) -> list[dict | None]:
    """Devuelve copias hidratadas (con imagenes vivas + URLs refirmadas)."""
    ids = collect_food_ids(*plans)
    media = await fetch_food_media(db, ids) if ids else {}
    out: list[dict | None] = []
    for plan in plans:
        if not plan:
            out.append(plan)
            continue
        clone = copy.deepcopy(plan)
        if media:
            _apply_food_media(clone, media)
        await resolve_image_urls_in_obj(clone)
        out.append(clone)
    return out
