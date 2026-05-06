-- =============================================================================
-- Hook post-sync OPCIONAL — se ejecuta tras copiar datos prod → dev
-- -----------------------------------------------------------------------------
-- Para activarlo:
--   1. Copia este archivo a `scripts/sync_supabase_post_dev.sql`
--   2. Define en el entorno del Celery worker:
--        DB_SYNC_POST_SQL_FILE=/app/scripts/sync_supabase_post_dev.sql
--
-- IMPORTANTE: este archivo se ejecuta SOLO en la base de datos de DEV
-- (la conexión la establece el script padre). Aún así, las queries deben ser
-- idempotentes y no asumir nada destructivo sobre datos no controlados.
--
-- Bloques recomendados (descomentar según prefieras):
-- =============================================================================

-- ─── 1) Resetear contraseñas de TODOS los usuarios a una conocida en dev ───
-- Útil si tu auth es propio (campos en public.users) para que nadie pueda
-- loggearse en pre con credenciales reales de prod.
-- Ajusta el campo (hashed_password / password_hash) y el bcrypt al esquema real.
--
-- UPDATE public.users
--    SET hashed_password = '$2b$12$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVabcdef.0123';
-- -- Hash de bcrypt para "trackfizdev2026" (genera el tuyo con passlib).


-- ─── 2) Bloquear todos los usuarios menos un admin de pruebas ──────────────
-- UPDATE public.users SET is_active = false;
-- UPDATE public.users SET is_active = true WHERE email = 'admin-dev@trackfiz.com';


-- ─── 3) Anonimizar datos personales de clientes ────────────────────────────
-- UPDATE public.clients SET
--   email = 'cliente_' || id::text || '@dev.trackfiz.com',
--   phone = NULL;


-- ─── 4) Limpiar info bancaria/facturación sensible ─────────────────────────
-- UPDATE public.invoice_settings SET
--   certificate_data = NULL,
--   certificate_password = NULL;


-- ─── 5) Marcar visualmente que estamos en dev ──────────────────────────────
UPDATE public.workspaces
   SET name = name || ' (DEV)'
 WHERE name NOT LIKE '%(DEV)%';
