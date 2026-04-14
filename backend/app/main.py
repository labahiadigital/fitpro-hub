from contextlib import asynccontextmanager
import logging
import time
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.limiter import limiter
from app.api.v1.router import api_router
from app.middleware.permissions import PermissionsMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    force=True,
)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


def _mask_url(url: str) -> str:
    """Show host:port only, hide credentials."""
    if "@" in url:
        return url.split("@", 1)[-1]
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return f"{parsed.hostname}:{parsed.port}/{parsed.path.lstrip('/')}"


def _run_alembic_upgrade():
    """Apply pending Alembic migrations (sync, runs before the async loop)."""
    from alembic.config import Config
    from alembic import command
    import os

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
    logger.info("Starting %s...", settings.APP_NAME)
    logger.info("REDIS_URL target → %s", _mask_url(settings.REDIS_URL))
    logger.info("DATABASE_URL target → %s", _mask_url(settings.DATABASE_URL) if settings.DATABASE_URL else "(empty)")
    _run_alembic_upgrade()
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Workspace-ID"],
    expose_headers=["X-Total-Count"],
    max_age=600,
)


class ProxySchemeMiddleware(BaseHTTPMiddleware):
    """Force HTTPS scheme when behind a reverse proxy (Coolify/Traefik)."""
    async def dispatch(self, request: Request, call_next):
        if request.headers.get("x-forwarded-proto") == "https":
            request.scope["scheme"] = "https"
        return await call_next(request)


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
        logger.error(
            "UNHANDLED %s %s %.0fms – %s",
            request.method, request.url.path, elapsed_ms, exc,
            exc_info=True,
        )
        raise
    elapsed_ms = (time.perf_counter() - start) * 1000
    if request.url.path not in ("/health", "/"):
        log_fn = access_logger.warning if response.status_code >= 400 else access_logger.info
        log_fn(
            "%s %s %s %.0fms",
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
    from sqlalchemy import text
    from app.core.database import AsyncSessionLocal
    import redis as redis_lib

    checks: dict = {"status": "healthy"}
    is_unhealthy = False

    # Database check
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception as exc:
        logger.error("Health check - database failed: %s", exc)
        checks["database"] = "disconnected"
        is_unhealthy = True

    # Redis check (informational — does not block deploy)
    redis_target = _mask_url(settings.REDIS_URL)
    r = None
    try:
        r = redis_lib.from_url(settings.REDIS_URL, socket_connect_timeout=3)
        r.ping()
        checks["redis"] = "connected"
        checks["redis_host"] = redis_target
    except Exception as exc:
        logger.warning("Health check - redis failed (target=%s): %s", redis_target, exc)
        checks["redis"] = "disconnected"
        checks["redis_host"] = redis_target
    finally:
        if r:
            try:
                r.close()
            except Exception:
                pass

    # Celery workers check — use a lightweight Celery instance to avoid
    # importing heavy task modules that can fail inside the API process.
    try:
        from celery import Celery as _CeleryClass
        _probe = _CeleryClass("probe", broker=settings.celery_broker)
        inspector = _probe.control.inspect(timeout=5)
        ping_result = inspector.ping()
        if ping_result:
            worker_count = len(ping_result)
            checks["celery_workers"] = f"{worker_count} online"
        else:
            checks["celery_workers"] = "none responding"
    except Exception as exc:
        logger.warning("Health check - celery inspect failed: %s", exc)
        checks["celery_workers"] = "unavailable"

    if is_unhealthy:
        checks["status"] = "degraded"
        return JSONResponse(status_code=200, content=checks)

    return checks


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
