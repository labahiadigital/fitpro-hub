"""MASSIVE generation: all global foods missing image_url.

Mirrors scripts/generate_all.py for exercises:
  - Resumable: queries DB for foods missing image_url; rerun keeps progress.
  - Concurrent: 5 parallel workers + 350ms stagger to stay under
    Kie.ai rate limit (20 reqs / 10s).
  - Per-item retry with exponential backoff (3 attempts).
  - Incremental DB updates per item.
  - Failures are written to scripts/generate_all_foods_failures.json.
"""
import json
import os
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nanobanana2 import (  # noqa: E402
    fetch_foods_missing_image,
    generate_for_food,
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FAILURES_FILE = os.path.join(SCRIPT_DIR, "generate_all_foods_failures.json")

MAX_CONCURRENT = 5
PER_ITEM_ATTEMPTS = 3
BACKOFF_BASE_S = 8.0
SUBMIT_STAGGER_MS = 350

_submit_lock = threading.Lock()
_last_submit = 0.0

_progress_lock = threading.Lock()
_done = 0
_ok = 0
_fail = 0
_total = 0


def _stagger():
    global _last_submit
    with _submit_lock:
        now = time.time()
        wait = (_last_submit + SUBMIT_STAGGER_MS / 1000.0) - now
        if wait > 0:
            time.sleep(wait)
        _last_submit = time.time()


def _bump(success: bool):
    global _done, _ok, _fail
    with _progress_lock:
        _done += 1
        if success:
            _ok += 1
        else:
            _fail += 1
        print(f"    >>> progress: {_done}/{_total}  ok={_ok}  fail={_fail}",
              flush=True)


def _process(food: dict) -> dict:
    name = food["name"]
    food_id = str(food["id"])
    last_err = ""
    for attempt in range(1, PER_ITEM_ATTEMPTS + 1):
        try:
            _stagger()
            res = generate_for_food(food, update_db=True)
            _bump(True)
            return {"id": food_id, "name": name, "ok": True, "url": res["url"]}
        except Exception as e:
            last_err = str(e)[:400]
            wait = BACKOFF_BASE_S * (2 ** (attempt - 1))
            print(f"    [{name}] attempt {attempt} FAILED: {last_err[:160]} -> "
                  f"backoff {wait:.0f}s", flush=True)
            time.sleep(wait)
    _bump(False)
    return {"id": food_id, "name": name, "ok": False, "error": last_err}


def _save_failures(failures):
    if not failures:
        return
    with open(FAILURES_FILE, "w", encoding="utf-8") as f:
        json.dump(failures, f, ensure_ascii=False, indent=2)
    print(f"\nFailures saved to {FAILURES_FILE}", flush=True)


def main() -> int:
    global _total
    print("=" * 70)
    print("MASSIVE FOOD RUN - NanoBanana 2 -> R2 -> DB")
    print("=" * 70)
    pending = fetch_foods_missing_image()
    _total = len(pending)
    print(f"Pending foods (is_global, image_url empty): {_total}")
    if _total == 0:
        print("Nothing to do.")
        return 0

    by_cat = {}
    for f in pending:
        by_cat.setdefault(f.get("category") or "?", 0)
        by_cat[f.get("category") or "?"] += 1
    print("By category:")
    for c, n in sorted(by_cat.items(), key=lambda kv: -kv[1]):
        print(f"  {c:35s} {n}")

    print(f"\nWorkers: {MAX_CONCURRENT}    Stagger: {SUBMIT_STAGGER_MS}ms    "
          f"Per-item attempts: {PER_ITEM_ATTEMPTS}\n", flush=True)

    t0 = time.time()
    failures = []
    try:
        with ThreadPoolExecutor(max_workers=MAX_CONCURRENT) as pool:
            futs = {pool.submit(_process, f): f for f in pending}
            for fut in as_completed(futs):
                res = fut.result()
                if not res.get("ok"):
                    failures.append(res)
    except KeyboardInterrupt:
        print("\nInterrupted. Saving partial state ...", flush=True)

    elapsed = time.time() - t0
    print("\n" + "=" * 70)
    print(f"DONE  ok={_ok}  fail={_fail}  total={_total}  "
          f"elapsed={elapsed/60:.1f} min")
    _save_failures(failures)
    return 0 if _fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
