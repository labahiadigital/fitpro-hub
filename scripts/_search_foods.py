import psycopg2
DB = "postgresql://postgres.ougfmkbjrpnjvujhuuyy:HeXMvHeo1Ebr8A4d@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"
c = psycopg2.connect(DB)
cur = c.cursor()
cur.execute("""SELECT name, category FROM foods
               WHERE (name ILIKE '%salm%'
                      OR name ILIKE '%huev%'
                      OR name ILIKE '%aceite%'
                      OR name ILIKE '%lent%')
                 AND is_global=true
               ORDER BY category, name""")
for r in cur.fetchall():
    print(r)
c.close()
