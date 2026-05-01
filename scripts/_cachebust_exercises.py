"""Add a cache-busting query string to image_urls of broken (cached 0B) images.

The R2 objects are correct; only the Cloudflare edge has cached the old 0-byte
response. Adding ?v=2 changes the cache key and forces the edge to re-fetch.
"""
import json
import os
import psycopg2

DB_URL = "postgresql://postgres.ougfmkbjrpnjvujhuuyy:HeXMvHeo1Ebr8A4d@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(SCRIPT_DIR, "_broken_exercises.json"), "r", encoding="utf-8") as f:
    data = json.load(f)

ids = [b["id"] for b in data.get("suspicious", [])]
print(f"Cache-busting {len(ids)} exercises")

conn = psycopg2.connect(DB_URL)
with conn:
    with conn.cursor() as cur:
        for ex_id in ids:
            cur.execute("SELECT image_url FROM exercises WHERE id = %s", (ex_id,))
            row = cur.fetchone()
            if not row:
                continue
            url = row[0]
            if "?v=" in url:
                base = url.split("?v=")[0]
                new = f"{base}?v=2"
            else:
                new = f"{url}?v=2"
            cur.execute(
                "UPDATE exercises SET image_url = %s WHERE id = %s",
                (new, ex_id),
            )
            print(f"  {ex_id}  ->  ...{new[-40:]}")
conn.close()
print("Done.")
