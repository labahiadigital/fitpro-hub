"""Audit which exercise images are broken (URL set in DB but R2 object missing
or unreadable). Prints a list of broken ones and writes the IDs to a file.

Run from repo root:
    backend\\.venv\\Scripts\\python.exe scripts\\_audit_broken.py
"""
import json
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import psycopg2
import requests

DB_URL = "postgresql://postgres.ougfmkbjrpnjvujhuuyy:HeXMvHeo1Ebr8A4d@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_FILE = os.path.join(SCRIPT_DIR, "_broken_exercises.json")
WORKERS = 16


def head(url: str) -> tuple[int, int]:
    """Return (status_code, content_length). status=-1 on connection error."""
    try:
        r = requests.head(url, timeout=10, allow_redirects=True)
        size = int(r.headers.get("Content-Length") or 0)
        return r.status_code, size
    except Exception:
        return -1, 0


def main():
    conn = psycopg2.connect(DB_URL)
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, name, category, image_url
            FROM exercises
            WHERE is_global = true
              AND image_url IS NOT NULL AND image_url <> ''
            ORDER BY category, name
        """)
        rows = cur.fetchall()
    conn.close()

    print(f"Auditing {len(rows)} exercise image URLs ...\n")
    broken: list[dict] = []
    suspicious: list[dict] = []
    lock = threading.Lock()
    done = 0
    total = len(rows)

    def check(row):
        nonlocal done
        ex_id, name, cat, url = row
        status, size = head(url)
        with lock:
            done += 1
            if done % 25 == 0:
                print(f"  {done}/{total} checked ...", flush=True)
            if status >= 400 or status == -1:
                broken.append({"id": str(ex_id), "name": name, "category": cat,
                               "url": url, "status": status, "size": size})
            elif size < 50_000:  # tiny files are probably empty/error placeholders
                suspicious.append({"id": str(ex_id), "name": name, "category": cat,
                                   "url": url, "status": status, "size": size})

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = [pool.submit(check, r) for r in rows]
        for _ in as_completed(futs):
            pass

    print("\n" + "=" * 70)
    print(f"BROKEN ({len(broken)}):")
    for b in sorted(broken, key=lambda x: (x["category"], x["name"])):
        print(f"  [{b['category']:15s}] {b['name']:50s}  status={b['status']}")

    if suspicious:
        print(f"\nSUSPICIOUS / very small files ({len(suspicious)}):")
        for s in sorted(suspicious, key=lambda x: (x["category"], x["size"])):
            print(f"  [{s['category']:15s}] {s['name']:50s}  size={s['size']}B")

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump({"broken": broken, "suspicious": suspicious}, f,
                  ensure_ascii=False, indent=2)
    print(f"\nResults saved to {OUT_FILE}")


if __name__ == "__main__":
    main()
