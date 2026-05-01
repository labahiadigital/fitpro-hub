"""Batch test: generate 5 images in parallel.

Picks 5 exercises across 3 categories (estiramiento, core, fuerza) to make sure
the prompt mapping behaves well for each one. Runs them concurrently with a
thread pool, throttled to be safely below Kie's 20 req / 10 s limit.

Run from repo root:

    backend\\.venv\\Scripts\\python.exe scripts\\test_batch5.py
"""
from __future__ import annotations

import os
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nanobanana2 import (  # noqa: E402
    fetch_exercise_by_name,
    generate_for_exercise,
)

TARGETS: list[str] = [
    "Estiramiento de Cuádriceps de Pie",  # estiramiento
    "Plancha Sobre Antebrazos",            # core - bodyweight floor
    "Sentadilla Goblet con Talones Elevados",  # fuerza - dumbbell
    "Curl de Biceps de Pie con Mancuernas",    # fuerza - dumbbell standing
    "Face Pull con Cuerda en Polea",           # fuerza - cable
]

MAX_CONCURRENT = 5             # well below 20 req / 10s
STAGGER_MS = 350               # tiny delay between submissions to avoid bursting

_submit_lock = threading.Lock()
_last_submit = 0.0


def _stagger():
    """Spread submissions ~350ms apart so we never burst > 20 in 10s, even if
    other tasks are running at the same time."""
    global _last_submit
    with _submit_lock:
        now = time.time()
        wait = (_last_submit + STAGGER_MS / 1000.0) - now
        if wait > 0:
            time.sleep(wait)
        _last_submit = time.time()


def _process(name: str) -> dict:
    ex = fetch_exercise_by_name(name)
    if not ex:
        return {"name": name, "ok": False, "error": "not found in DB"}
    _stagger()
    try:
        result = generate_for_exercise(ex, use_references=True, update_db=True)
        return {"name": name, "ok": True, **result}
    except Exception as e:
        return {"name": name, "ok": False, "error": str(e)[:300]}


def main() -> int:
    print("=" * 60)
    print(f"BATCH TEST: {len(TARGETS)} images in parallel (max {MAX_CONCURRENT})")
    print("=" * 60)
    for t in TARGETS:
        print(f"  - {t}")

    t0 = time.time()
    results: list[dict] = []
    with ThreadPoolExecutor(max_workers=MAX_CONCURRENT) as pool:
        futures = {pool.submit(_process, n): n for n in TARGETS}
        for fut in as_completed(futures):
            res = fut.result()
            results.append(res)
            tag = "OK " if res.get("ok") else "FAIL"
            print(f"\n  [{tag}] {res['name']}")
            if res.get("ok"):
                print(f"        url: {res['url']}")
            else:
                print(f"        err: {res.get('error')}")

    elapsed = time.time() - t0
    ok = sum(1 for r in results if r.get("ok"))
    print("\n" + "=" * 60)
    print(f"BATCH DONE in {elapsed:.1f}s   |   {ok}/{len(TARGETS)} OK")
    print("=" * 60)
    if ok == len(TARGETS):
        print("All 5 generated. Public URLs:")
        for r in results:
            if r.get("ok"):
                print(f"  {r['name']:50s}  {r['url']}")
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
