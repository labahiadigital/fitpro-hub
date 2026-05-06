"""Quick audit of image_url presence for the items shown in the user screenshots."""
import psycopg2

DB_URL = "postgresql://postgres.ougfmkbjrpnjvujhuuyy:HeXMvHeo1Ebr8A4d@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

EX = [
    "Eliptica", "Elíptica",
    "Abdominales con Elevacion de Piernas Tumbado",
    "Abdominales con Elevación de Piernas Tumbado",
    "Box Jumps",
    "Elevacion Frontal con Barra Z",
    "Elevación Frontal con Barra Z",
]
FD = ["Avena", "Huevo Clara", "Huevo Entero", "Pan Integral", "Pavo (pechuga)"]

conn = psycopg2.connect(DB_URL)
with conn.cursor() as cur:
    print("=== EXERCISES ===")
    cur.execute(
        "SELECT id, name, COALESCE(image_url, '') FROM exercises "
        "WHERE name = ANY(%s) ORDER BY name",
        (EX,),
    )
    for r in cur.fetchall():
        print(f"  {r[1][:50]:50s}  url='{r[2][:80]}'  id={r[0]}")

    print("\n=== FOODS ===")
    cur.execute(
        "SELECT id, name, COALESCE(image_url, '') FROM foods "
        "WHERE name = ANY(%s) ORDER BY name",
        (FD,),
    )
    for r in cur.fetchall():
        print(f"  {r[1][:50]:50s}  url='{r[2][:80]}'  id={r[0]}")

    # Stats
    print("\n=== STATS ===")
    cur.execute("SELECT COUNT(*), COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url <> '') FROM exercises")
    t, w = cur.fetchone()
    print(f"  exercises: {w}/{t} con imagen")
    cur.execute("SELECT COUNT(*), COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url <> '') FROM foods WHERE is_global = true")
    t, w = cur.fetchone()
    print(f"  foods (global): {w}/{t} con imagen")
conn.close()
