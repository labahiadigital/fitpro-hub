"""Smoke test: generate ONE food image end-to-end (NanoBanana 2 -> R2 -> DB)."""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nanobanana2 import fetch_food_by_name, generate_for_food  # noqa: E402

TARGET = os.environ.get("FOOD_NAME", "Aguacate")


def main() -> int:
    food = fetch_food_by_name(TARGET)
    if not food:
        print(f"Food '{TARGET}' not found in foods (is_global=true).")
        return 1
    print(f"Target food: {food['name']}  id={food['id']}  "
          f"category={food.get('category')}  brand={food.get('brand')}")
    if food.get("image_url"):
        print(f"WARN: food already has image_url={food['image_url']}")

    t0 = time.time()
    res = generate_for_food(food, update_db=True)
    print("\n" + "=" * 70)
    print(f"OK in {time.time()-t0:.1f}s")
    print(f"  url:  {res['url']}")
    print(f"  size: {res['size']} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
