"""Inspect the active workout program templates to see exercise_id presence."""
import json
import psycopg2

DB_URL = "postgresql://postgres.ougfmkbjrpnjvujhuuyy:HeXMvHeo1Ebr8A4d@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

conn = psycopg2.connect(DB_URL)
with conn.cursor() as cur:
    cur.execute("""
        SELECT id, name, client_id, template, executed_template
        FROM workout_programs
        WHERE is_active = true AND is_template = false
        ORDER BY created_at DESC
        LIMIT 3
    """)
    rows = cur.fetchall()
conn.close()

for pid, name, cid, template, exec_template in rows:
    print("=" * 80)
    print(f"Program: {name}  id={pid}  client={cid}")
    for label, tmpl in (("template", template), ("executed_template", exec_template)):
        if not tmpl:
            print(f"  [{label}] None")
            continue
        days = tmpl.get("days") or []
        print(f"  [{label}] days={len(days)}")
        for d_idx, day in enumerate(days[:1]):  # only inspect first day
            blocks = day.get("blocks") or []
            for b_idx, block in enumerate(blocks):
                exes = block.get("exercises") or []
                for e_idx, ex in enumerate(exes):
                    eid = ex.get("exercise_id")
                    nested = ex.get("exercise") or {}
                    nested_id = nested.get("id")
                    nested_name = nested.get("name") or ex.get("name")
                    nested_img = nested.get("image_url")
                    print(
                        f"    day{d_idx} block{b_idx} ex{e_idx}  "
                        f"name={nested_name!r}  exercise_id={eid}  nested_id={nested_id}  "
                        f"image_url={(nested_img or '')[:60]}"
                    )
