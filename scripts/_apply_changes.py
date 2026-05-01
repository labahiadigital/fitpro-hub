"""1) Delete duplicated exercise without image.
2) Regenerate 4 exercises whose styling is inconsistent with current set.
After regen, append a ?v=2 cache-buster to bypass Cloudflare edge cache.
"""
import os
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import psycopg2  # noqa: E402
from nanobanana2 import (  # noqa: E402
    DB_URL,
    fetch_exercise_by_id,
    generate_for_exercise,
)

DELETE_ID = "2e9f46b0-3873-4910-832b-55a79ebf91cd"
REGEN_IDS = [
    "b177d845-eda5-45d8-bf74-0038d77a54a4",  # Extensión Tríceps Cuerda Polea
    "5c341fe0-1572-4350-9126-830bc24be471",  # Hip Thrust con Barra
    "c078081b-1486-46e6-b4c0-5764c3be8634",  # Jalón al Pecho en Polea Alta
    "e2cf9700-b3df-4a45-920a-1fbc7ad979ad",  # Sentadilla en Multipower
]

WORKERS = 4
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


def _process(ex_id: str) -> dict:
    ex = fetch_exercise_by_id(ex_id)
    if not ex:
        return {"id": ex_id, "ok": False, "error": "not in DB"}
    _stagger()
    try:
        r = generate_for_exercise(ex, use_references=True, update_db=True)
        return {"id": ex_id, "name": r["name"], "ok": True, "url": r["url"]}
    except Exception as e:
        return {"id": ex_id, "name": ex.get("name"), "ok": False, "error": str(e)[:300]}


def main():
    # 1) DELETE
    conn = psycopg2.connect(DB_URL)
    with conn:
        with conn.cursor() as cur:
            cur.execute("SELECT name, image_url FROM exercises WHERE id = %s",
                        (DELETE_ID,))
            row = cur.fetchone()
            if not row:
                print(f"[delete] target {DELETE_ID} not found")
            else:
                print(f"[delete] {DELETE_ID}  {row[0]}  url={(row[1] or '')[:50]}")
                cur.execute("DELETE FROM exercises WHERE id = %s", (DELETE_ID,))
                print(f"[delete] OK  rows affected: {cur.rowcount}")
    conn.close()

    # 2) REGEN
    print("\n=== Regenerating 4 exercises with current NanoBanana 2 prompt ===\n")
    t0 = time.time()
    results = []
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = {pool.submit(_process, eid): eid for eid in REGEN_IDS}
        for fut in as_completed(futs):
            res = fut.result()
            results.append(res)
            tag = "OK  " if res["ok"] else "FAIL"
            print(f"  [{tag}] {res.get('name'):50s} {res.get('url') or res.get('error', '')}")

    ok = sum(1 for r in results if r["ok"])
    print(f"\n{ok}/{len(results)} regenerated in {time.time()-t0:.1f}s")

    # 3) CACHE-BUST: append ?v=3 to the 4 regenerated URLs (?v=2 was used earlier
    # for warm-ups, so use a higher number here).
    print("\n=== Cache-busting regenerated URLs ===")
    conn = psycopg2.connect(DB_URL)
    with conn:
        with conn.cursor() as cur:
            for r in results:
                if not r["ok"]:
                    continue
                cur.execute("SELECT image_url FROM exercises WHERE id = %s",
                            (r["id"],))
                row = cur.fetchone()
                if not row:
                    continue
                url = row[0]
                base = url.split("?v=")[0]
                new = f"{base}?v=3"
                cur.execute(
                    "UPDATE exercises SET image_url = %s WHERE id = %s",
                    (new, r["id"]),
                )
                print(f"  {r['name']}  ->  ...{new[-50:]}")
    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
