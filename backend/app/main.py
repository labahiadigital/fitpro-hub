from contextlib import asynccontextmanager
import asyncio
import logging
import os
import time
import uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.limiter import limiter
from app.api.v1.router import api_router
from app.middleware.permissions import PermissionsMiddleware

import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
    force=True,
)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("alembic.runtime.plugins").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


def _mask_url(url: str) -> str:
    """Show host:port only, hide credentials."""
    if "@" in url:
        return url.split("@", 1)[-1]
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return f"{parsed.hostname}:{parsed.port}/{parsed.path.lstrip('/')}"


def _run_alembic_upgrade():
    """Apply pending Alembic migrations (sync, runs before the async loop).

    Guarded by RUN_MIGRATIONS_ON_STARTUP env var. When running multiple replicas
    behind a load balancer, leave it unset (or "false") on every replica and run
    migrations as a separate one-shot job to avoid concurrent upgrade races.
    """
    from alembic.config import Config
    from alembic import command

    alembic_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "alembic")
    ini_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "alembic.ini")

    if not os.path.isfile(ini_path):
        logger.warning("alembic.ini not found at %s — skipping auto-migration", ini_path)
        return

    cfg = Config(ini_path)
    cfg.set_main_option("script_location", alembic_dir)

    db_url = settings.DATABASE_URL
    if db_url and "+asyncpg" in db_url:
        db_url = db_url.replace("+asyncpg", "")
    cfg.set_main_option("sqlalchemy.url", db_url)

    try:
        command.upgrade(cfg, "head")
        logger.info("Alembic migrations applied successfully")
    except Exception as exc:
        logger.error("Alembic migration failed: %s", exc, exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s (env=%s)...", settings.APP_NAME, settings.APP_ENV)
    logger.info("REDIS_URL target -> %s", _mask_url(settings.REDIS_URL))
    logger.info("DATABASE_URL target -> %s", _mask_url(settings.DATABASE_URL) if settings.DATABASE_URL else "(empty)")

    # Only run migrations on startup when explicitly opted-in. In multi-replica deploys
    # you should run `alembic upgrade head` as a dedicated job step instead.
    should_run_migrations = os.getenv("RUN_MIGRATIONS_ON_STARTUP", "true").lower() in ("1", "true", "yes")
    if should_run_migrations:
        _run_alembic_upgrade()
    else:
        logger.info("RUN_MIGRATIONS_ON_STARTUP=false -> skipping migrations on boot")

    yield
    logger.info("Shutting down %s...", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    description="Plataforma SaaS multi-tenant para profesionales de fitness, wellness y salud",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
    redirect_slashes=False,
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error on %s %s: %s", request.method, request.url.path, exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        raise exc
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# NOTE: Starlette runs middleware in reverse registration order. We register the
# outermost layers (security headers, request IDs, gzip) first so they wrap
# everything, then CORS, then auth/rate-limit stuff closer to the route.

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach hardened security headers to every API response.

    Nginx already sets these for the static frontend, but API responses don't
    transit through nginx (they go straight through the app), so we replicate
    the relevant ones here.
    """

    _HSTS = "max-age=63072000; includeSubDomains; preload"

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        headers = response.headers
        headers.setdefault("X-Content-Type-Options", "nosniff")
        headers.setdefault("X-Frame-Options", "DENY")
        headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
        headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
        # Lock down API responses — they should never be interpreted as HTML.
        headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none';")
        if settings.is_production:
            headers.setdefault("Strict-Transport-Security", self._HSTS)
        return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a stable request id for log correlation and troubleshooting."""

    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex
        request.state.request_id = rid
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response


class ProxySchemeMiddleware(BaseHTTPMiddleware):
    """Force HTTPS scheme when behind a reverse proxy (Coolify/Traefik)."""

    async def dispatch(self, request: Request, call_next):
        if request.headers.get("x-forwarded-proto") == "https":
            request.scope["scheme"] = "https"
        return await call_next(request)


# GZip response bodies to cut bandwidth on JSON endpoints. minimum_size avoids
# wasting CPU on already-tiny payloads.
app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=5)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Workspace-ID", "X-Request-ID"],
    expose_headers=["X-Total-Count", "X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
    max_age=600,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIDMiddleware)

# Enforce application-wide rate limits so endpoints without an explicit
# @limiter.limit decorator still get protection.
app.add_middleware(SlowAPIMiddleware)

if settings.APP_ENV == "production":
    app.add_middleware(ProxySchemeMiddleware)

app.add_middleware(PermissionsMiddleware)

access_logger = logging.getLogger("api.access")

@app.middleware("http")
async def access_log_middleware(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - start) * 1000
        rid = getattr(request.state, "request_id", "-")
        logger.error(
            "UNHANDLED rid=%s %s %s %.0fms – %s",
            rid, request.method, request.url.path, elapsed_ms, exc,
            exc_info=True,
        )
        raise
    elapsed_ms = (time.perf_counter() - start) * 1000
    if request.url.path not in ("/health", "/"):
        log_fn = access_logger.warning if response.status_code >= 400 else access_logger.info
        rid = getattr(request.state, "request_id", "-")
        log_fn(
            "rid=%s %s %s %s %.0fms",
            rid,
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
    return response

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """Lightweight liveness probe — only checks the DB round-trip.

    Coolify hits this every 10s; anything heavier (Celery RPC, Redis ping) was
    turning the probe into a 5-second blocker whenever the workers were slow,
    so those moved to /health/deep for on-demand inspection.
    """
    from sqlalchemy import text
    from app.core.database import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as exc:
        logger.error("Health check - database failed: %s", exc)
        return JSONResponse(
            status_code=200,  # 200 on purpose: Coolify keeps traffic flowing while we alert.
            content={"status": "degraded", "database": "disconnected"},
        )


@app.get("/health/deep")
async def health_check_deep():
    """Full dependency probe — DB + Redis + Celery. Use for manual inspection
    or a separate monitoring job; too expensive for a per-10s liveness check.
    """
    from sqlalchemy import text
    from app.core.database import AsyncSessionLocal
    import redis.asyncio as async_redis

    checks: dict = {"status": "healthy"}
    is_unhealthy = False

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception as exc:
        logger.error("Health check - database failed: %s", exc)
        checks["database"] = "disconnected"
        is_unhealthy = True

    redis_target = _mask_url(settings.REDIS_URL)
    checks["redis_host"] = redis_target
    r = None
    try:
        r = async_redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        await r.ping()
        checks["redis"] = "connected"
    except Exception as exc:
        logger.warning("Health check - redis failed (target=%s): %s", redis_target, exc)
        checks["redis"] = "disconnected"
    finally:
        if r is not None:
            try:
                await r.aclose()
            except Exception:
                pass

    # Celery inspect is intrinsically blocking; push it to a worker thread so
    # a slow/down broker doesn't stall the event loop.
    try:
        from celery import Celery as _CeleryClass

        def _probe_workers() -> int:
            probe = _CeleryClass("probe", broker=settings.celery_broker)
            inspector = probe.control.inspect(timeout=1.5)
            pong = inspector.ping()
            return len(pong) if pong else 0

        worker_count = await asyncio.to_thread(_probe_workers)
        checks["celery_workers"] = (
            f"{worker_count} online" if worker_count else "none responding"
        )
    except Exception as exc:
        logger.warning("Health check - celery inspect failed: %s", exc)
        checks["celery_workers"] = "unavailable"

    if is_unhealthy:
        checks["status"] = "degraded"
    return checks


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
