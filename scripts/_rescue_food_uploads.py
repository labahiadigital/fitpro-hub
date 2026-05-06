"""Rescue: for every food image already on disk in scripts/generated_food_images/
whose corresponding DB row still has an empty image_url, re-upload the file
to R2 and update the DB. No API generation calls.

This recovers items the massive run paid for (image generated + saved to disk)
but failed to persist due to the transaction-mode pooler hitting a read-only
replica.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import psycopg2  # noqa: E402
from nanobanana2 import (  # noqa: E402
    DB_URL,
    SCRIPT_DIR,
    R2_PUBLIC_BASE,
    update_db_food_image_url,
    upload_food_to_r2,
)

IMG_DIR = os.path.join(SCRIPT_DIR, "generated_food_images")


def main() -> int:
    if not os.path.isdir(IMG_DIR):
        print(f"No image dir: {IMG_DIR}")
        return 1
    files = [f for f in os.listdir(IMG_DIR) if f.endswith(".png")]
    print(f"Found {len(files)} local images on disk")

    conn = psycopg2.connect(DB_URL)
    rescued = 0
    skipped_no_row = 0
    skipped_has_url = 0
    failed = 0
    with conn.cursor() as cur:
        for fname in sorted(files):
            food_id = fname[:-4]
            cur.execute(
                "SELECT name, image_url FROM foods WHERE id = %s",
                (food_id,),
            )
            row = cur.fetchone()
            if not row:
                skipped_no_row += 1
                continue
            name, current_url = row
            expected = f"{R2_PUBLIC_BASE}/foods/{food_id}.png"
            if current_url and current_url.startswith(expected):
                skipped_has_url += 1
                continue
            path = os.path.join(IMG_DIR, fname)
            try:
                with open(path, "rb") as f:
                    data = f.read()
                url = upload_food_to_r2(data, food_id)
                update_db_food_image_url(food_id, url)
                rescued += 1
                print(f"  [OK] {name:45s}  {url}")
            except Exception as e:
                failed += 1
                print(f"  [FAIL] {name:43s}  {str(e)[:200]}")
    conn.close()

    print()
    print(f"Rescued: {rescued}")
    print(f"Already had URL: {skipped_has_url}")
    print(f"No DB row for file: {skipped_no_row}")
    print(f"Failed: {failed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
