"""Inspect the foods table: how many globals, how many missing image, samples."""
import psycopg2

DB_URL = "postgresql://postgres.ougfmkbjrpnjvujhuuyy:HeXMvHeo1Ebr8A4d@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

conn = psycopg2.connect(DB_URL)
with conn.cursor() as cur:
    cur.execute("""
        SELECT COUNT(*) FROM foods WHERE is_global = true
    """)
    total_global = cur.fetchone()[0]

    cur.execute("""
        SELECT COUNT(*) FROM foods
        WHERE is_global = true AND (image_url IS NULL OR image_url = '')
    """)
    missing_global = cur.fetchone()[0]

    cur.execute("""
        SELECT COUNT(*) FROM foods
    """)
    total_all = cur.fetchone()[0]

    cur.execute("""
        SELECT category, COUNT(*) AS total,
               COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') AS sin_img
        FROM foods
        WHERE is_global = true
        GROUP BY category
        ORDER BY total DESC
    """)
    by_cat = cur.fetchall()

    cur.execute("""
        SELECT id, name, category, brand, image_url
        FROM foods
        WHERE is_global = true
        ORDER BY name
        LIMIT 20
    """)
    samples = cur.fetchall()

    cur.execute("""
        SELECT image_url
        FROM foods
        WHERE image_url IS NOT NULL AND image_url <> ''
        LIMIT 5
    """)
    url_samples = cur.fetchall()
conn.close()

print("=" * 70)
print(f"foods total: {total_all}    is_global: {total_global}    "
      f"missing image (global): {missing_global}")
print("=" * 70)
print("\nGlobal foods by category (total / sin imagen):")
for cat, total, sin in by_cat:
    print(f"  {str(cat):30s}  {total:5d}   sin_img: {sin}")

print("\nSample global foods:")
for fid, name, cat, brand, url in samples:
    print(f"  - [{cat}] {name}  brand={brand}  url={(url or '')[:60]}")

print("\nExisting image_url samples (any food):")
for (u,) in url_samples:
    print(f"  {u}")
