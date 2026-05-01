"""Batch test: 5 food images from different categories, in parallel,
respecting Kie.ai rate limit (20 reqs / 10s).
"""
import os
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nanobanana2 import (  # noqa: E402
    fetch_food_by_name,
    generate_for_food,
)

TARGETS = [
    "Pechuga de pollo",                # Carnes
    "Salmon",                          # Pescados y Mariscos
    "Brocoli",                         # Verduras
    "Avena",                           # Cereales y Derivados
    "Huevo Entero",                    # Huevos
]

WORKERS = 5
STAGGER_MS = 350
_lock = threading.Lock()
_last = 0.0


def _stagger():
    global _last
    with _lock:
        now = time.time()
        wait = (_last + STAGGER_MS / 1000.0) - now
        if wait > 0:
            time.sleep(wait)
        _last = time.time()


def _process(name: str) -> dict:
    food = fetch_food_by_name(name)
    if not food:
        return {"name": name, "ok": False, "error": "not in DB"}
    _stagger()
    try:
        res = generate_for_food(food, update_db=True)
        return {"name": name, "ok": True, "url": res["url"], "id": res["id"]}
    except Exception as e:
        return {"name": name, "ok": False, "error": str(e)[:300]}


def main() -> int:
    print("=" * 70)
    print(f"FOOD BATCH-5 TEST  (workers={WORKERS}, stagger={STAGGER_MS}ms)")
    print("=" * 70)
    for n in TARGETS:
        print(f"  - {n}")
    print()

    t0 = time.time()
    results = []
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = {pool.submit(_process, n): n for n in TARGETS}
        for fut in as_completed(futs):
            res = fut.result()
            results.append(res)
            tag = "OK  " if res["ok"] else "FAIL"
            extra = res.get("url") or res.get("error", "")
            print(f"  [{tag}] {res['name']:40s}  {extra}")

    ok = sum(1 for r in results if r["ok"])
    print("\n" + "=" * 70)
    print(f"{ok}/{len(results)} generated in {time.time()-t0:.1f}s")
    return 0 if ok == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
