"""Re-upload the 5 already-generated food images from disk to R2,
then update the foods.image_url in DB. No API generation calls.
Run ONLY after `wrangler login` is refreshed.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nanobanana2 import (  # noqa: E402
    SCRIPT_DIR,
    update_db_food_image_url,
    upload_food_to_r2,
)

PAIRS = [
    ("a848ec05-a19a-431f-a4ea-b63f0f1ea4f4", "Pechuga de pollo"),
    ("1691bb69-3839-43bf-a8e4-b424e976f496", "Salmon"),
    ("f3d14895-4e2b-4b37-be59-85df25d5bd85", "Brocoli"),
    ("744f0122-3f32-4113-8aa9-dd5244834359", "Avena"),
    ("d9fb5d24-cf57-4b74-a2d2-482a0637003e", "Huevo Entero"),
]


def main() -> int:
    img_dir = os.path.join(SCRIPT_DIR, "generated_food_images")
    ok = 0
    for food_id, name in PAIRS:
        path = os.path.join(img_dir, f"{food_id}.png")
        if not os.path.exists(path):
            print(f"  [MISS] {name}  (no file at {path})")
            continue
        with open(path, "rb") as f:
            data = f.read()
        try:
            url = upload_food_to_r2(data, food_id)
            update_db_food_image_url(food_id, url)
            print(f"  [OK]   {name:25s}  {url}")
            ok += 1
        except Exception as e:
            print(f"  [FAIL] {name:25s}  {str(e)[:200]}")
    print(f"\n{ok}/{len(PAIRS)} re-uploaded")
    return 0 if ok == len(PAIRS) else 1


if __name__ == "__main__":
    sys.exit(main())
