"""
Tarea Celery que copia datos del proyecto Supabase de PROD al de DEV.

Se programa solo en el entorno DEV (a las 04:00 Europe/Madrid). Para evitar
catástrofes, la tarea se aborta si:
  - APP_ENV es "production"
  - Falta PROD_DATABASE_URL o DEV_DATABASE_URL
  - DEV_DATABASE_URL apunta al host del proyecto Supabase de prod
  - ENABLE_DB_SYNC != "true"

Internamente delega en `scripts/sync_supabase_prod_to_dev.sh`, que es el que
hace el trabajo pesado con pg_dump/pg_restore. El script es ejecutable también
de forma manual para una primera carga inicial.
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
from pathlib import Path

from celery.exceptions import Reject

from app.celery_app import celery_app
from app.core.config import settings

logger = logging.getLogger(__name__)

# Ruta al script bash dentro del container. El COPY del Dockerfile pone el
# repo en /app, así que scripts/ queda en /app/scripts/.
_SYNC_SCRIPT = Path("/app/scripts/sync_supabase_prod_to_dev.sh")

# Refs hardcodeados como tripwire — si la URL destino contiene este substring,
# abortamos. Mantener sincronizado con el ref de PROD en Supabase.
_PROD_PROJECT_REF = "ougfmkbjrpnjvujhuuyy"


def _enabled() -> bool:
    """Solo corremos el sync si está explícitamente activado y NO en prod."""
    if settings.is_production:
        logger.warning("[db_sync] ABORT: APP_ENV=production, no se sincroniza.")
        return False
    if os.getenv("ENABLE_DB_SYNC", "").lower() != "true":
        logger.info("[db_sync] ENABLE_DB_SYNC != 'true' → skip.")
        return False
    return True


@celery_app.task(
    name="app.tasks.db_sync.sync_prod_to_dev",
    bind=True,
    acks_late=True,
    # Esta tarea puede tardar minutos. Subimos el time limit por encima del
    # default de 5 min del celery_app general, sin quitarle techo.
    time_limit=60 * 30,        # 30 min hard kill
    soft_time_limit=60 * 25,   # 25 min soft warn
)
def sync_prod_to_dev(self) -> dict:
    """Copia datos prod → dev. Llamada por celery beat o manualmente."""
    if not _enabled():
        return {"status": "skipped", "reason": "disabled"}

    prod_url = os.getenv("PROD_DATABASE_URL", "").strip()
    dev_url = os.getenv("DEV_DATABASE_URL", "").strip() or settings.DATABASE_URL

    if not prod_url:
        logger.error("[db_sync] PROD_DATABASE_URL vacío.")
        raise Reject("PROD_DATABASE_URL is required", requeue=False)
    if not dev_url:
        logger.error("[db_sync] DEV_DATABASE_URL/DATABASE_URL vacío.")
        raise Reject("DEV_DATABASE_URL is required", requeue=False)

    if _PROD_PROJECT_REF in dev_url:
        logger.error(
            "[db_sync] ABORT: DEV_DATABASE_URL contiene el ref del proyecto "
            "Supabase de PROD (%s). Esto borraría producción.",
            _PROD_PROJECT_REF,
        )
        raise Reject("dev URL points to prod project", requeue=False)

    if not _SYNC_SCRIPT.exists():
        logger.error("[db_sync] No existe %s", _SYNC_SCRIPT)
        raise Reject(f"missing {_SYNC_SCRIPT}", requeue=False)

    bash = shutil.which("bash") or "/bin/bash"

    env = os.environ.copy()
    env["PROD_DATABASE_URL"] = prod_url
    env["DEV_DATABASE_URL"] = dev_url
    # Sanitizamos: el script convierte +asyncpg al formato estándar internamente
    # vía las URLs de Supabase Pooler, pero pg_dump espera postgresql://, así
    # que limpiamos cualquier sufijo +asyncpg.
    if "+asyncpg" in env["PROD_DATABASE_URL"]:
        env["PROD_DATABASE_URL"] = env["PROD_DATABASE_URL"].replace("+asyncpg", "")
    if "+asyncpg" in env["DEV_DATABASE_URL"]:
        env["DEV_DATABASE_URL"] = env["DEV_DATABASE_URL"].replace("+asyncpg", "")

    logger.info("[db_sync] Lanzando script de sincronización…")

    proc = subprocess.run(
        [bash, str(_SYNC_SCRIPT)],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    # Loguear stdout/stderr siempre, para diagnóstico.
    if proc.stdout:
        for line in proc.stdout.splitlines():
            logger.info("[db_sync][out] %s", line)
    if proc.stderr:
        for line in proc.stderr.splitlines():
            logger.warning("[db_sync][err] %s", line)

    if proc.returncode != 0:
        raise RuntimeError(
            f"sync_supabase_prod_to_dev.sh exited with {proc.returncode}"
        )

    logger.info("[db_sync] ✅ Sync completado correctamente.")
    return {"status": "ok", "stdout_tail": proc.stdout[-500:]}
