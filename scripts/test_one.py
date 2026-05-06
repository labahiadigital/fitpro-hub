"""Smoke test: generate ONE image and validate the full pipeline.

Picks 'Crunch Abdominal' (simple, clear, easy to verify the banner text and
posture). Run from repo root:

    backend\\.venv\\Scripts\\python.exe scripts\\test_one.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from nanobanana2 import (  # noqa: E402
    fetch_exercise_by_name,
    generate_for_exercise,
)

TEST_EXERCISE_NAME = "Crunch Abdominal"


def main() -> int:
    print("=" * 60)
    print(f"SMOKE TEST: 1 image -> {TEST_EXERCISE_NAME}")
    print("=" * 60)

    ex = fetch_exercise_by_name(TEST_EXERCISE_NAME)
    if not ex:
        print(f"ERROR: exercise '{TEST_EXERCISE_NAME}' not found in DB")
        return 1
    print(f"  id={ex['id']} category={ex['category']} "
          f"muscles={ex['muscle_groups']} equipment={ex['equipment']}")

    try:
        result = generate_for_exercise(ex, use_references=True, update_db=True)
    except Exception as e:
        print(f"\nFAILED: {e}")
        return 2

    print("\n" + "=" * 60)
    print("SUCCESS")
    print(f"  url: {result['url']}")
    print(f"  task_id: {result['task_id']}")
    print(f"  size: {result['size']} bytes")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
