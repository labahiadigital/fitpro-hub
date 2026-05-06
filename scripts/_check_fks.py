"""List foreign keys that reference exercises.id."""
import psycopg2

DB_URL = "postgresql://postgres.ougfmkbjrpnjvujhuuyy:HeXMvHeo1Ebr8A4d@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"
TARGET_ID = "2e9f46b0-3873-4910-832b-55a79ebf91cd"

conn = psycopg2.connect(DB_URL)
with conn.cursor() as cur:
    cur.execute("""
        SELECT
            tc.table_name AS child_table,
            kcu.column_name AS child_column,
            rc.delete_rule AS on_delete
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON rc.unique_constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'exercises'
        ORDER BY tc.table_name, kcu.column_name
    """)
    fks = cur.fetchall()
    print("FKs referencing exercises.id:")
    for tbl, col, on_del in fks:
        print(f"  {tbl}.{col}  ON DELETE {on_del}")

    print(f"\nRow counts that reference target {TARGET_ID}:")
    for tbl, col, on_del in fks:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {tbl} WHERE {col} = %s", (TARGET_ID,))
            n = cur.fetchone()[0]
            print(f"  {tbl}.{col}: {n}  (on_delete={on_del})")
        except Exception as e:
            print(f"  {tbl}.{col}: error - {e}")
            conn.rollback()
conn.close()
