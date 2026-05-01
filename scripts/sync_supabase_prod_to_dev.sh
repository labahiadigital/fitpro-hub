#!/usr/bin/env bash
# =============================================================================
# Trackfiz — Sincroniza datos de Supabase PROD → DEV (schema public)
# -----------------------------------------------------------------------------
# Uso (manual):
#   PROD_DATABASE_URL="postgresql://...prod..."  \
#   DEV_DATABASE_URL="postgresql://...dev..."    \
#   bash scripts/sync_supabase_prod_to_dev.sh
#
# Uso (Celery): se invoca desde app.tasks.db_sync.sync_prod_to_dev a las 04:00
# Europe/Madrid (ver app/celery_app.py beat_schedule).
#
# Qué hace:
#   1. Verifica que la URL destino NO es la de producción (defensa en profundidad).
#   2. pg_dump --data-only --schema=public de PROD → archivo custom-format.
#   3. En DEV: deshabilita triggers, TRUNCATE de todas las tablas excepto las
#      excluidas, pg_restore --data-only --disable-triggers, reactiva triggers.
#   4. Resetea secuencias para que los nuevos INSERTs no choquen con IDs copiados.
#   5. Hook opcional: ejecuta DB_SYNC_POST_SQL_FILE si está definido (p.ej. para
#      resetear passwords de users a un valor conocido en dev).
#
# Tablas excluidas por defecto (modificable con DB_SYNC_EXCLUDE_TABLES, separadas
# por comas):
#   - alembic_version          (no romper versioning Alembic de dev)
#   - google_calendar_tokens   (tokens OAuth válidos = riesgo seguridad)
#
# Requisitos:
#   - postgresql-client-17 (pg_dump y pg_restore versión 17)
#   - psql en PATH
# =============================================================================
set -euo pipefail

# --- Validación de entrada ---------------------------------------------------
: "${PROD_DATABASE_URL:?PROD_DATABASE_URL is required}"
: "${DEV_DATABASE_URL:?DEV_DATABASE_URL is required}"

EXCLUDE_TABLES_DEFAULT="alembic_version,google_calendar_tokens"
EXCLUDE_TABLES="${DB_SYNC_EXCLUDE_TABLES:-$EXCLUDE_TABLES_DEFAULT}"

# Extrae el host de cada URL para loggear y validar
prod_host=$(printf '%s' "$PROD_DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
dev_host=$(printf '%s' "$DEV_DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')

echo "==[ Trackfiz DB sync ]==========================================="
echo "  PROD host: $prod_host"
echo "  DEV  host: $dev_host"
echo "  Excluded:  $EXCLUDE_TABLES"
echo "================================================================="

# --- Defensa en profundidad: dev y prod NO pueden ser el mismo host ---------
if [[ "$prod_host" == "$dev_host" ]]; then
  echo "❌ ABORT: PROD_DATABASE_URL y DEV_DATABASE_URL apuntan al MISMO host." >&2
  echo "   Esto borraría datos de producción. Revisa las variables." >&2
  exit 1
fi

# --- Defensa en profundidad: DEV_DATABASE_URL no debe contener host de prod -
# El host de prod actual es ougfmkbjrpnjvujhuuyy. Hardcoded como tripwire.
if [[ "$dev_host" == *"ougfmkbjrpnjvujhuuyy"* ]]; then
  echo "❌ ABORT: DEV_DATABASE_URL apunta al proyecto Supabase de PROD." >&2
  echo "   Proyecto prod ref = ougfmkbjrpnjvujhuuyy" >&2
  exit 1
fi

# --- Verificar que pg_dump y pg_restore están disponibles -------------------
for tool in pg_dump pg_restore psql; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "❌ ABORT: '$tool' no está instalado en el PATH." >&2
    echo "   En Debian/Ubuntu: apt install postgresql-client-17" >&2
    exit 1
  fi
done

# --- Verificar versión pg_dump (debe ser >= 17 para Supabase Postgres 17) ---
pgdump_major=$(pg_dump --version | sed -E 's/.*\) ([0-9]+).*/\1/')
if [[ "$pgdump_major" -lt 17 ]]; then
  echo "⚠️  WARN: pg_dump $pgdump_major es < 17. Supabase usa Postgres 17."
  echo "   Es posible que el dump falle. Instala postgresql-client-17."
fi

# --- Workspace temporal ------------------------------------------------------
WORK_DIR="$(mktemp -d -t trackfiz-sync-XXXXXX)"
trap 'rm -rf "$WORK_DIR"' EXIT
DUMP_FILE="$WORK_DIR/prod_data.dump"

# --- Construir argumentos de exclusión para pg_dump --------------------------
exclude_args=()
IFS=',' read -ra _excluded <<< "$EXCLUDE_TABLES"
for t in "${_excluded[@]}"; do
  t_trim="$(echo "$t" | xargs)"
  [[ -z "$t_trim" ]] && continue
  exclude_args+=(--exclude-table-data="public.$t_trim")
done

# --- 1) Dump desde PROD ------------------------------------------------------
echo "▶ pg_dump (PROD → $DUMP_FILE)"
pg_dump \
  --data-only \
  --schema=public \
  --format=custom \
  --no-owner \
  --no-privileges \
  --no-comments \
  --quote-all-identifiers \
  "${exclude_args[@]}" \
  --file="$DUMP_FILE" \
  "$PROD_DATABASE_URL"

dump_size=$(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE")
echo "  ✅ dump OK (${dump_size} bytes)"

# --- 2) En DEV: TRUNCATE todas las tablas excepto las excluidas -------------
echo "▶ TRUNCATE de tablas en DEV (preserva las excluidas)"

# Construir lista SQL de exclusión: 'tabla1','tabla2',...
sql_excluded_list=$(printf "'%s'," "${_excluded[@]}" | sed 's/,$//')

psql "$DEV_DATABASE_URL" --quiet --no-psqlrc --set=ON_ERROR_STOP=1 <<SQL
SET session_replication_role = 'replica';

DO \$\$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT tablename
      FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename NOT IN ($sql_excluded_list)
  ) LOOP
    EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
  END LOOP;
END \$\$;
SQL

# --- 3) Restaurar datos en DEV ----------------------------------------------
echo "▶ pg_restore (DUMP → DEV)"
# --single-transaction: si algo falla, rollback completo. Más seguro.
# --disable-triggers: necesario porque hay triggers/FK constraints.
pg_restore \
  --data-only \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  --single-transaction \
  --dbname="$DEV_DATABASE_URL" \
  "$DUMP_FILE"

# --- 4) Reactivar triggers + resetear secuencias ----------------------------
echo "▶ Reset secuencias"
psql "$DEV_DATABASE_URL" --quiet --no-psqlrc --set=ON_ERROR_STOP=1 <<'SQL'
SET session_replication_role = 'origin';

-- Reset cada secuencia al máximo + 1 de su tabla/columna asociada.
-- Necesario porque al copiar datos con IDs, las secuencias siguen apuntando
-- al inicio y los próximos INSERTs en dev colisionan con UNIQUE keys.
DO $$
DECLARE
  r record;
  max_val bigint;
BEGIN
  FOR r IN (
    SELECT c.oid::regclass::text AS tbl, a.attname AS col, s.relname AS seq
      FROM pg_class s
      JOIN pg_depend d ON d.objid = s.oid AND d.deptype = 'a'
      JOIN pg_class c ON c.oid = d.refobjid
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.refobjsubid
     WHERE s.relkind = 'S'
       AND c.relnamespace = 'public'::regnamespace
  ) LOOP
    EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %s', r.col, r.tbl) INTO max_val;
    EXECUTE format('SELECT setval(%L, GREATEST(%s, 1))', r.seq, max_val);
  END LOOP;
END $$;
SQL

# --- 5) Hook post-sync (opcional) -------------------------------------------
if [[ -n "${DB_SYNC_POST_SQL_FILE:-}" && -f "${DB_SYNC_POST_SQL_FILE}" ]]; then
  echo "▶ Ejecutando hook post-sync: $DB_SYNC_POST_SQL_FILE"
  psql "$DEV_DATABASE_URL" --quiet --no-psqlrc --set=ON_ERROR_STOP=1 \
    --file="$DB_SYNC_POST_SQL_FILE"
fi

echo "✅ Sync completado: PROD → DEV"
