"""Kie.ai NanoBanana 2 integration + R2 upload + DB update.

Reusable module used by:
  - test_one.py     (single image smoke test)
  - test_batch5.py  (5 images, parallel, rate-limit aware)
  - generate_all.py (massive run for all missing exercises)

Env vars expected:
  KIE_API_KEY
  DB_URL          (Supabase / Postgres)

The R2 bucket and naming scheme MATCH the existing setup so URLs stay stable:
  bucket: trackfiz-platform
  key:    exercises/{exercise_id}.png
  url:    https://trackfiz-platform.trackfiz.com/exercises/{exercise_id}.png
"""
from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import tempfile
import time
from typing import Any

import requests

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(SCRIPT_DIR, "..", "web")

KIE_API_KEY = os.environ.get("KIE_API_KEY", "a74e90f36061f461ef8e147a169a43f4")
KIE_BASE = "https://api.kie.ai"
KIE_CREATE_URL = f"{KIE_BASE}/api/v1/jobs/createTask"
KIE_INFO_URL = f"{KIE_BASE}/api/v1/jobs/recordInfo"

DB_URL = os.environ.get(
    "DB_URL",
    # Session-mode pooler (port 5432) avoids the transaction-mode pooler
    # occasionally routing to a read-only replica, which broke UPDATEs in
    # parallel runs. Session mode is write-safe.
    "postgresql://postgres.ougfmkbjrpnjvujhuuyy:HeXMvHeo1Ebr8A4d@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
)

R2_BUCKET = "trackfiz-platform"
R2_PUBLIC_BASE = "https://trackfiz-platform.trackfiz.com"

REFERENCE_URLS: list[str] = [
    "https://trackfiz-platform.trackfiz.com/exercises/f9f75531-eaab-42b5-9b05-ba4fddf394af.png",
    "https://trackfiz-platform.trackfiz.com/exercises/d52de40a-c70b-44c5-bf61-a59633d2927c.png",
    "https://trackfiz-platform.trackfiz.com/exercises/b1332921-e64a-41d6-86b1-92b17749f0e8.png",
    "https://trackfiz-platform.trackfiz.com/exercises/cc417b35-b60d-49ba-bdf8-f7920151faa0.png",
    "https://trackfiz-platform.trackfiz.com/exercises/227ff024-5b63-4b55-8462-5ba17429c268.png",
    "https://trackfiz-platform.trackfiz.com/exercises/0a39ed90-df3b-4beb-a4e5-ed00775e4d54.png",
    "https://trackfiz-platform.trackfiz.com/exercises/c0d7c61a-09cc-4b36-834f-d586e9115c68.png",
]

# We import the existing exercise->english-action mapping (uses category/muscles/equipment).
# This keeps us aligned with the previous prompt mapping work.
sys.path.insert(0, SCRIPT_DIR)
from generate_exercise_images import build_exercise_description  # noqa: E402


def build_prompt(exercise_name: str, posture_en: str) -> str:
    """Build the cinematic editorial prompt for NanoBanana 2.

    Mirrors the user-provided template, with character consistency anchored to
    the reference images supplied via image_input.
    """
    return (
        "A high-resolution, cinematographic-quality fitness editorial photograph. "
        "The subject is a fit, muscular middle-aged Caucasian man with short brown "
        "hair, exactly as seen in the reference images provided. He wears his "
        "signature attire: a tightly fitted, subtly textured dark grey sports "
        "t-shirt and black athletic shorts (matching the reference images). His "
        "expression is intense and of extreme effort, gritting his teeth with "
        "exertion. He is in a modern, industrial-style gym with polished "
        "concrete-look walls, large mirror panels, and a dark grey rubber mat "
        "floor. Dramatic, cinematic studio track lighting highlights muscle "
        "definition. The specific action is: "
        f"{posture_en}. "
        "A solid black rectangular banner is fixed in the top-left corner of the "
        f"image, containing the specific white text: '{exercise_name}' in a bold "
        "sans-serif font. The perspective is a medium-wide shot. Extreme "
        "photorealism, 8k. Do NOT add watermarks, logos, extra letters, "
        "misspelled titles or duplicated faces."
    )


def kie_create_task(
    prompt: str,
    image_input: list[str] | None = None,
    aspect_ratio: str = "4:5",
    resolution: str = "1K",
) -> str:
    """Submit a NanoBanana 2 generation. Returns taskId."""
    headers = {
        "Authorization": f"Bearer {KIE_API_KEY}",
        "Content-Type": "application/json",
    }
    payload: dict[str, Any] = {
        "model": "nano-banana-2",
        "input": {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "output_format": "png",
        },
    }
    if image_input:
        payload["input"]["image_input"] = image_input

    resp = requests.post(KIE_CREATE_URL, headers=headers, json=payload, timeout=60)
    data = resp.json()
    if resp.status_code != 200 or data.get("code") != 200:
        raise RuntimeError(
            f"createTask failed (HTTP {resp.status_code}, code {data.get('code')}): "
            f"{data.get('msg')} | {data}"
        )
    task_id = data["data"]["taskId"]
    return task_id


def kie_poll_task(
    task_id: str,
    timeout_s: int = 600,
    poll_interval_s: float = 4.0,
) -> dict:
    """Poll until task completes. Returns the data dict on success.

    Raises RuntimeError on failure or timeout.
    """
    headers = {"Authorization": f"Bearer {KIE_API_KEY}"}
    deadline = time.time() + timeout_s
    last_state = ""
    while time.time() < deadline:
        resp = requests.get(
            KIE_INFO_URL,
            headers=headers,
            params={"taskId": task_id},
            timeout=30,
        )
        data = resp.json()
        if data.get("code") != 200:
            raise RuntimeError(f"recordInfo error: {data}")
        d = data["data"]
        state = d.get("state")
        if state != last_state:
            print(f"    [task {task_id[:12]}...] state={state}")
            last_state = state
        if state == "success":
            return d
        if state == "fail":
            raise RuntimeError(
                f"task failed: code={d.get('failCode')} msg={d.get('failMsg')}"
            )
        time.sleep(poll_interval_s)
    raise RuntimeError(f"task {task_id} timed out after {timeout_s}s")


def download_result_image(task_data: dict) -> bytes:
    raw = task_data.get("resultJson")
    if not raw:
        raise RuntimeError(f"no resultJson in task data: {task_data}")
    parsed = json.loads(raw) if isinstance(raw, str) else raw
    urls = parsed.get("resultUrls") or []
    if not urls:
        raise RuntimeError(f"no resultUrls in resultJson: {parsed}")
    url = urls[0]
    print(f"    downloading {url}")
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    return r.content


def upload_to_r2(image_bytes: bytes, exercise_id: str) -> str:
    """Upload image to R2 with the same key as the existing setup."""
    key = f"exercises/{exercise_id}.png"
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name
    try:
        cmd = (
            f'wrangler r2 object put "{R2_BUCKET}/{key}" '
            f'--file="{tmp_path}" --content-type="image/png" --remote'
        )
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            cwd=WEB_DIR,
            timeout=60,
        )
        if result.returncode != 0:
            err = (
                result.stderr.decode("utf-8", errors="replace")
                if isinstance(result.stderr, bytes)
                else str(result.stderr)
            )
            err = err.encode("ascii", errors="replace").decode("ascii")
            raise RuntimeError(f"wrangler upload failed: {err[:500]}")
        return f"{R2_PUBLIC_BASE}/{key}"
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def save_to_disk(image_bytes: bytes, exercise_id: str) -> str:
    out_dir = os.path.join(SCRIPT_DIR, "generated_images")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"{exercise_id}.png")
    with open(path, "wb") as f:
        f.write(image_bytes)
    return path


def update_db_image_url(exercise_id: str, image_url: str) -> None:
    import psycopg2

    conn = psycopg2.connect(DB_URL)
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE exercises SET image_url = %s WHERE id = %s",
                    (image_url, exercise_id),
                )
    finally:
        conn.close()


def fetch_exercises_missing_image(limit: int | None = None) -> list[dict]:
    """Return list of exercises missing an image_url (is_global=true)."""
    import psycopg2

    sql = """
        SELECT id, name, category, muscle_groups, equipment
        FROM exercises
        WHERE is_global = true
          AND (image_url IS NULL OR image_url = '')
        ORDER BY category, name
    """
    if limit:
        sql += f" LIMIT {int(limit)}"
    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            cols = [c.name for c in cur.description]
            return [dict(zip(cols, r)) for r in cur.fetchall()]
    finally:
        conn.close()


def fetch_exercise_by_id(exercise_id: str) -> dict | None:
    import psycopg2

    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, category, muscle_groups, equipment, image_url "
                "FROM exercises WHERE id = %s",
                (exercise_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            cols = [c.name for c in cur.description]
            return dict(zip(cols, row))
    finally:
        conn.close()


def fetch_exercise_by_name(name: str) -> dict | None:
    import psycopg2

    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, category, muscle_groups, equipment, image_url "
                "FROM exercises WHERE name = %s AND is_global = true",
                (name,),
            )
            row = cur.fetchone()
            if not row:
                return None
            cols = [c.name for c in cur.description]
            return dict(zip(cols, row))
    finally:
        conn.close()


# ============================================================================
# FOODS PIPELINE  (mirrors the exercise pipeline, but for the foods table)
# ============================================================================

def build_food_prompt(food_name: str, food_description_en: str) -> str:
    """Build the editorial food-photography prompt for NanoBanana 2.

    The visual language matches the gym/fitness aesthetic of the exercise images:
    dark, cinematic, professional, with a top-left black banner showing the
    food name in white sans-serif (same UI cue as exercise images).
    """
    return (
        "A high-resolution, cinematographic-quality editorial food photograph, "
        "shot for a premium fitness and nutrition app. "
        "Subject: "
        f"{food_description_en}. "
        "Realistic everyday portion, fresh and appetizing, with natural texture, "
        "subtle steam or moisture if appropriate, no plastic packaging, no human "
        "hands, no cutlery in motion. "
        "Plating: served on simple matte ceramic dishware (off-white or charcoal "
        "grey) or directly on a dark wooden cutting board, depending on the food. "
        "Background: clean, slightly textured dark grey slate or charcoal-brushed "
        "concrete surface, evoking a modern industrial kitchen. "
        "Lighting: dramatic cinematic studio lighting from a 45-degree side-back "
        "angle, soft falloff, shallow depth of field, food fully and crisply "
        "lit, gentle highlights catching the natural surface texture. "
        "Camera: medium-wide overhead 3/4 angle, 50mm lens look, slight bokeh "
        "in the background. "
        "A solid black rectangular banner is fixed in the top-left corner of "
        f"the image, containing the specific white text: '{food_name}' in a "
        "bold sans-serif font. "
        "Extreme photorealism, true-to-life colors, 8k. Do NOT add watermarks, "
        "logos, brand labels, extra letters, misspelled titles, captions, or "
        "garnish that does not belong to the dish."
    )


def upload_food_to_r2(image_bytes: bytes, food_id: str) -> str:
    """Upload a food image to R2 under foods/{food_id}.png."""
    key = f"foods/{food_id}.png"
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name
    try:
        cmd = (
            f'wrangler r2 object put "{R2_BUCKET}/{key}" '
            f'--file="{tmp_path}" --content-type="image/png" --remote'
        )
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            cwd=WEB_DIR,
            timeout=60,
        )
        if result.returncode != 0:
            err = (
                result.stderr.decode("utf-8", errors="replace")
                if isinstance(result.stderr, bytes)
                else str(result.stderr)
            )
            err = err.encode("ascii", errors="replace").decode("ascii")
            raise RuntimeError(f"wrangler upload failed: {err[:500]}")
        return f"{R2_PUBLIC_BASE}/{key}"
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def save_food_to_disk(image_bytes: bytes, food_id: str) -> str:
    out_dir = os.path.join(SCRIPT_DIR, "generated_food_images")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"{food_id}.png")
    with open(path, "wb") as f:
        f.write(image_bytes)
    return path


def update_db_food_image_url(food_id: str, image_url: str) -> None:
    import psycopg2

    conn = psycopg2.connect(DB_URL)
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE foods SET image_url = %s WHERE id = %s",
                    (image_url, food_id),
                )
    finally:
        conn.close()


def fetch_foods_missing_image(limit: int | None = None) -> list[dict]:
    import psycopg2

    sql = """
        SELECT id, name, category, brand
        FROM foods
        WHERE is_global = true
          AND (image_url IS NULL OR image_url = '')
        ORDER BY category, name
    """
    if limit:
        sql += f" LIMIT {int(limit)}"
    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            cols = [c.name for c in cur.description]
            return [dict(zip(cols, r)) for r in cur.fetchall()]
    finally:
        conn.close()


def fetch_food_by_name(name: str) -> dict | None:
    import psycopg2

    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, category, brand, image_url "
                "FROM foods WHERE name = %s AND is_global = true",
                (name,),
            )
            row = cur.fetchone()
            if not row:
                return None
            cols = [c.name for c in cur.description]
            return dict(zip(cols, row))
    finally:
        conn.close()


# Curated mapping of category -> default presentation hints. Keeps prompts
# realistic and category-appropriate without needing a per-item description.
FOOD_CATEGORY_HINTS: dict[str, str] = {
    "Frutas": "shown whole and freshly cut, on a dark wooden board",
    "Verduras": "shown raw and freshly cut, on a dark wooden board",
    "Carnes": "shown raw and trimmed on a butcher block, plus a cooked portion plated on a matte ceramic dish",
    "Pescados y Mariscos": "shown fresh, on crushed ice or on a matte slate plate",
    "Cereales y Derivados": "served in a matte ceramic bowl, slightly textured",
    "Legumbres": "served in a matte ceramic bowl",
    "Leche y Derivados": "served in matching matte ceramic dishware",
    "Huevos": "shown whole in shell next to a cracked one in a small bowl",
    "Aceites y Grasas": "shown in a small clear glass cruet or bowl",
    "Frutos Secos y Deshidratados": "served in a small matte ceramic bowl",
    "Dulces y Chocolate": "plated on a matte ceramic dish",
    "Bebidas": "served in a clean glass on a slate surface",
    "Suplementos Deportivos": "shown as a portion of powder in a matte scoop next to a shaker",
}


def build_food_description(name: str, category: str | None, brand: str | None) -> str:
    """Tiny helper: produce the English description used inside the prompt."""
    cat = (category or "").strip()
    hint = FOOD_CATEGORY_HINTS.get(cat, "presented naturally on a clean surface")
    brand_part = f" ({brand})" if brand else ""
    return f"a fresh portion of {name}{brand_part}, {hint}"


def generate_for_food(
    food: dict,
    update_db: bool = True,
) -> dict:
    """Full pipeline for a single food item. Returns dict with status info."""
    name = food["name"]
    food_id = str(food["id"])
    description = build_food_description(
        name=name,
        category=food.get("category"),
        brand=food.get("brand"),
    )
    prompt = build_food_prompt(name, description)

    print(f"\n  ==> {name}  ({food_id})")
    print(f"      description: {description}")
    print(f"      prompt[:220]: {prompt[:220]}...")

    # Foods don't need a character-consistency reference, so no image_input.
    task_id = kie_create_task(
        prompt,
        image_input=None,
        aspect_ratio="4:5",
        resolution="1K",
    )
    print(f"    taskId: {task_id}")

    task_data = kie_poll_task(task_id)
    image_bytes = download_result_image(task_data)
    print(f"    downloaded {len(image_bytes)} bytes")

    disk_path = save_food_to_disk(image_bytes, food_id)
    print(f"    saved -> {disk_path}")

    public_url = upload_food_to_r2(image_bytes, food_id)
    print(f"    uploaded -> {public_url}")

    if update_db:
        update_db_food_image_url(food_id, public_url)
        print(f"    db updated")

    return {
        "id": food_id,
        "name": name,
        "task_id": task_id,
        "url": public_url,
        "size": len(image_bytes),
        "description": description,
    }


# ============================================================================
# ORIGINAL EXERCISE PIPELINE
# ============================================================================

def generate_for_exercise(
    exercise: dict,
    use_references: bool = True,
    update_db: bool = True,
) -> dict:
    """Full pipeline for a single exercise. Returns dict with status info."""
    name = exercise["name"]
    ex_id = str(exercise["id"])
    posture = build_exercise_description(
        name=name,
        category=exercise.get("category") or "",
        muscles=exercise.get("muscle_groups") or [],
        equipment=exercise.get("equipment") or [],
    )
    prompt = build_prompt(name, posture)

    print(f"\n  ==> {name}  ({ex_id})")
    print(f"      posture: {posture}")
    print(f"      prompt[:200]: {prompt[:200]}...")

    image_input = REFERENCE_URLS if use_references else None
    task_id = kie_create_task(prompt, image_input=image_input)
    print(f"    taskId: {task_id}")

    task_data = kie_poll_task(task_id)
    image_bytes = download_result_image(task_data)
    print(f"    downloaded {len(image_bytes)} bytes")

    disk_path = save_to_disk(image_bytes, ex_id)
    print(f"    saved -> {disk_path}")

    public_url = upload_to_r2(image_bytes, ex_id)
    print(f"    uploaded -> {public_url}")

    if update_db:
        update_db_image_url(ex_id, public_url)
        print(f"    db updated")

    return {
        "id": ex_id,
        "name": name,
        "task_id": task_id,
        "url": public_url,
        "size": len(image_bytes),
        "posture": posture,
    }
