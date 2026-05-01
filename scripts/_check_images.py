"""Quick check of which exercises don't have an image_url."""
import psycopg2
import json

DB_URL = "postgresql://postgres.ougfmkbjrpnjvujhuuyy:HeXMvHeo1Ebr8A4d@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

print("=" * 60)
print("EXERCISES WITHOUT image_url BY CATEGORY (is_global=true)")
print("=" * 60)
cur.execute("""
    SELECT category,
           COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') AS sin_imagen,
           COUNT(*) AS total
    FROM exercises
    WHERE is_global = true
    GROUP BY category
    ORDER BY category
""")
total_sin = 0
total_all = 0
for cat, sin, tot in cur.fetchall():
    print(f"  {cat or '(null)':25s}  sin imagen: {sin:4d} / {tot:4d}")
    total_sin += sin
    total_all += tot
print(f"  {'TOTAL':25s}  sin imagen: {total_sin:4d} / {total_all:4d}")

print("\n" + "=" * 60)
print("EXERCISES WITH image_url BY CATEGORY")
print("=" * 60)
cur.execute("""
    SELECT category,
           COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url <> '') AS con_imagen
    FROM exercises
    WHERE is_global = true
    GROUP BY category
    ORDER BY category
""")
for cat, con in cur.fetchall():
    print(f"  {cat or '(null)':25s}  con imagen: {con:4d}")

print("\n" + "=" * 60)
print("SAMPLE OF EXERCISES WITHOUT IMAGE (first 20)")
print("=" * 60)
cur.execute("""
    SELECT id, name, category
    FROM exercises
    WHERE is_global = true
      AND (image_url IS NULL OR image_url = '')
    ORDER BY category, name
    LIMIT 20
""")
for row in cur.fetchall():
    print(f"  [{row[2] or '?':15s}] {row[1]}  ({row[0]})")

print("\n" + "=" * 60)
print("EXAMPLE image_url FORMAT (exercises that DO have one)")
print("=" * 60)
cur.execute("""
    SELECT name, image_url
    FROM exercises
    WHERE is_global = true
      AND image_url IS NOT NULL
      AND image_url <> ''
    LIMIT 5
""")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

conn.close()
