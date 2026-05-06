"""Find the exercises the user wants to delete or regenerate."""
import psycopg2

DB_URL = "postgresql://postgres.ougfmkbjrpnjvujhuuyy:HeXMvHeo1Ebr8A4d@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

DELETE_NAMES = [
    "Curl de biceps + press de hombro con mancuernas",
]
REGEN_NAMES = [
    "Extensión de Tríceps con Cuerda en Polea Alta",
    "Hip Thrust con Barra",
    "Jalón al Pecho en Polea Alta",
    "Sentadilla en Multipower",
]

conn = psycopg2.connect(DB_URL)
with conn.cursor() as cur:
    print("=== DELETE candidates (fuzzy search) ===")
    for n in DELETE_NAMES:
        cur.execute(
            "SELECT id, name, category, image_url FROM exercises "
            "WHERE name ILIKE %s",
            (f"%{n}%",),
        )
        for row in cur.fetchall():
            print(f"  {row[0]}  [{row[2]}]  {row[1]}  url={(row[3] or '')[:60]}")

    print("\n=== REGEN candidates ===")
    for n in REGEN_NAMES:
        cur.execute(
            "SELECT id, name, category, image_url FROM exercises "
            "WHERE name = %s OR name ILIKE %s",
            (n, f"%{n}%"),
        )
        rows = cur.fetchall()
        if not rows:
            print(f"  NOT FOUND -> '{n}'")
        for row in rows:
            print(f"  {row[0]}  [{row[2]}]  {row[1]}  url={(row[3] or '')[:60]}")

    print("\n=== Foreign-key dependencies for the deletion candidate ===")
    cur.execute(
        "SELECT id FROM exercises WHERE name = ANY(%s)",
        (DELETE_NAMES,),
    )
    rows = cur.fetchall()
    if rows:
        ex_id = rows[0][0]
        for tbl, col in [
            ("workout_exercises", "exercise_id"),
            ("workout_session_exercises", "exercise_id"),
            ("exercise_favorites", "exercise_id"),
            ("workout_template_exercises", "exercise_id"),
        ]:
            try:
                cur.execute(
                    f"SELECT COUNT(*) FROM {tbl} WHERE {col} = %s",
                    (ex_id,),
                )
                n = cur.fetchone()[0]
                print(f"  {tbl}.{col}: {n} rows")
            except Exception as e:
                print(f"  {tbl}.{col}: error - {e}")
        # rollback after errors
        conn.rollback()
conn.close()
