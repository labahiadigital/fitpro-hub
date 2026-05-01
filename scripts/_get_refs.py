"""Get image URLs for the reference exercises requested."""
import psycopg2

DB_URL = "postgresql://postgres.ougfmkbjrpnjvujhuuyy:HeXMvHeo1Ebr8A4d@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

REF_NAMES = [
    "Activación de Glúteos con Banda Elástica",
    "Assault Bike",
    "Battle Ropes",
    "Carrera Continua",
    "Sentadilla sin Peso",
    "Rotación de Caderas",
    "Rotación Torácica en Cuadrupedia",
]

conn = psycopg2.connect(DB_URL)
cur = conn.cursor()
cur.execute("""
    SELECT id, name, image_url
    FROM exercises
    WHERE is_global = true
      AND name = ANY(%s)
    ORDER BY name
""", (REF_NAMES,))

rows = cur.fetchall()
print(f"Found {len(rows)} of {len(REF_NAMES)} reference exercises:")
for r in rows:
    print(f"  - {r[1]}")
    print(f"    id:  {r[0]}")
    print(f"    url: {r[2]}")

found_names = {r[1] for r in rows}
missing = [n for n in REF_NAMES if n not in found_names]
if missing:
    print("\nNOT FOUND:")
    for n in missing:
        print(f"  - {n}")

conn.close()
