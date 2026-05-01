"""Massive run: generate images for all global exercises missing image_url.

- Reads exercises from DB at startup (single source of truth, no JSON file).
- Skips anything that already has image_url (resumable: just re-run if it dies).
- 5 concurrent workers (well under Kie's 20 req / 10 s limit).
- Per-exercise retry with exponential backoff (3 attempts).
- Incremental persistence: each success updates the DB immediately.
- Failures are written to scripts/generate_all_failures.json for inspection
  and can be reprocessed by re-running the script.
- Stops cleanly on KeyboardInterrupt and writes final summary.

Run from repo root:

    backend\\.venv\\Scripts\\python.exe scripts\\generate_all.py
"""
from __future__ import annotations

import json
import os
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nanobanana2 import (  # noqa: E402
    SCRIPT_DIR,
    fetch_exercises_missing_image,
    generate_for_exercise,
)

MAX_CONCURRENT = 5            # 5 parallel = ~15 req/10s polling, far below 20/10s
PER_EXERCISE_ATTEMPTS = 3
BACKOFF_BASE_S = 8.0          # 8s, 16s, 32s
SUBMIT_STAGGER_MS = 350       # spread starts a bit
FAILURES_FILE = os.path.join(SCRIPT_DIR, "generate_all_failures.json")

_submit_lock = threading.Lock()
_last_submit = 0.0
_progress_lock = threading.Lock()
_done = 0
_total = 0
_ok = 0
_fail = 0


def _stagger():
    global _last_submit
    with _submit_lock:
        now = time.time()
        wait = (_last_submit + SUBMIT_STAGGER_MS / 1000.0) - now
        if wait > 0:
            time.sleep(wait)
        _last_submit = time.time()


def _bump(success: bool, name: str, info: str = "") -> None:
    global _done, _ok, _fail
    with _progress_lock:
        _done += 1
        if success:
            _ok += 1
        else:
            _fail += 1
        tag = "OK  " if success else "FAIL"
        print(f"  [{_done:3d}/{_total}] [{tag}] {name}  {info}", flush=True)


def _process(ex: dict) -> dict:
    name = ex["name"]
    last_err = ""
    for attempt in range(1, PER_EXERCISE_ATTEMPTS + 1):
        _stagger()
        try:
            result = generate_for_exercise(ex, use_references=True, update_db=True)
            _bump(True, name, info=f"-> {result['url']}")
            return {"id": str(ex["id"]), "name": name, "ok": True, **result}
        except Exception as e:
            last_err = str(e)[:300]
            if attempt < PER_EXERCISE_ATTEMPTS:
                wait = BACKOFF_BASE_S * (2 ** (attempt - 1))
                time.sleep(wait)
    _bump(False, name, info=f"err: {last_err}")
    return {"id": str(ex["id"]), "name": name, "ok": False, "error": last_err}


def _save_failures(failures: list[dict]) -> None:
    if failures:
        with open(FAILURES_FILE, "w", encoding="utf-8") as f:
            json.dump(failures, f, ensure_ascii=False, indent=2)
        print(f"\nFailures persisted to: {FAILURES_FILE}", flush=True)


def main() -> int:
    global _total

    print("=" * 70)
    print("MASSIVE RUN - NanoBanana 2 -> R2 -> DB")
    print("=" * 70)

    pending = fetch_exercises_missing_image()
    _total = len(pending)
    print(f"Pending exercises (image_url IS NULL or empty): {_total}")
    if _total == 0:
        print("Nothing to do. Bye.")
        return 0

    by_cat: dict[str, int] = {}
    for ex in pending:
        by_cat[ex.get("category") or "?"] = by_cat.get(ex.get("category") or "?", 0) + 1
    for cat, n in sorted(by_cat.items()):
        print(f"  {cat:20s} {n}")
    print(f"\nWorkers: {MAX_CONCURRENT}  |  attempts/ex: {PER_EXERCISE_ATTEMPTS}  "
          f"|  backoff base: {BACKOFF_BASE_S}s")
    print("Resumable: re-run anytime; only exercises without image_url are picked.\n")

    t0 = time.time()
    failures: list[dict] = []
    try:
        with ThreadPoolExecutor(max_workers=MAX_CONCURRENT) as pool:
            futures = {pool.submit(_process, ex): ex for ex in pending}
            for fut in as_completed(futures):
                res = fut.result()
                if not res.get("ok"):
                    failures.append(res)
    except KeyboardInterrupt:
        print("\nInterrupted by user. Persisting partial state ...", flush=True)

    elapsed = time.time() - t0
    print("\n" + "=" * 70)
    print(f"FINISHED in {elapsed/60:.1f} min  ({elapsed:.0f}s)")
    print(f"  OK   : {_ok}")
    print(f"  FAIL : {_fail}")
    print(f"  TOTAL: {_done}")
    print("=" * 70)

    _save_failures(failures)
    if failures:
        print(f"\n{len(failures)} failures (most recent error per exercise):")
        for f_item in failures:
            print(f"  - {f_item['name']}  ::  {f_item.get('error','')[:200]}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
