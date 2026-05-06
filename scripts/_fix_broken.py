"""Regenerate the broken (zero-byte) exercise images detected by _audit_broken.py."""
import json
import os
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nanobanana2 import (  # noqa: E402
    fetch_exercise_by_id,
    generate_for_exercise,
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IN_FILE = os.path.join(SCRIPT_DIR, "_broken_exercises.json")
WORKERS = 5
STAGGER_MS = 350

_submit_lock = threading.Lock()
_last_submit = 0.0


def _stagger():
    global _last_submit
    with _submit_lock:
        now = time.time()
        wait = (_last_submit + STAGGER_MS / 1000.0) - now
        if wait > 0:
            time.sleep(wait)
        _last_submit = time.time()


def _process(item: dict) -> dict:
    ex = fetch_exercise_by_id(item["id"])
    if not ex:
        return {"name": item["name"], "ok": False, "error": "not in DB"}
    _stagger()
    try:
        r = generate_for_exercise(ex, use_references=True, update_db=True)
        return {"name": item["name"], "ok": True, "url": r["url"]}
    except Exception as e:
        return {"name": item["name"], "ok": False, "error": str(e)[:300]}


def main():
    with open(IN_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    targets = data.get("broken", []) + data.get("suspicious", [])
    print(f"Regenerating {len(targets)} broken/suspicious images "
          f"with {WORKERS} workers ...\n")
    for t in targets:
        print(f"  - [{t['category']}] {t['name']}")
    print()

    t0 = time.time()
    results = []
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = {pool.submit(_process, t): t for t in targets}
        for fut in as_completed(futs):
            res = fut.result()
            results.append(res)
            tag = "OK  " if res["ok"] else "FAIL"
            extra = res.get("url") or res.get("error", "")
            print(f"  [{tag}] {res['name']}  {extra}")

    ok = sum(1 for r in results if r["ok"])
    print(f"\n{ok}/{len(results)} regenerated in {time.time()-t0:.1f}s")


if __name__ == "__main__":
    main()
