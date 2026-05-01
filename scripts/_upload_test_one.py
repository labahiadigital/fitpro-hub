"""Re-upload the already-generated test image (no new API call)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nanobanana2 import (  # noqa: E402
    SCRIPT_DIR,
    update_db_image_url,
    upload_to_r2,
)

EX_ID = "62f5f6b3-0298-49e8-a22c-a59ea4634d62"  # Crunch Abdominal
PATH = os.path.join(SCRIPT_DIR, "generated_images", f"{EX_ID}.png")

if not os.path.exists(PATH):
    print(f"NO image found at {PATH}")
    raise SystemExit(1)

with open(PATH, "rb") as f:
    image = f.read()

print(f"Uploading {len(image)} bytes -> R2 ...")
url = upload_to_r2(image, EX_ID)
print(f"  ok -> {url}")

print("Updating DB ...")
update_db_image_url(EX_ID, url)
print("  ok")

print("\nDONE")
print(f"  Public URL (presigned via backend): {url}")
