from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)


def _mask_url(url: str) -> str:
    """Show host:port only, hide credentials."""
    if "@" in url:
        return url.split("@", 1)[-1]
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return f"{parsed.hostname}:{parsed.port}/{parsed.path.lstrip('/')}"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s...", settings.APP_NAME)
    logger.info("REDIS_URL target → %s", _mask_url(settings.REDIS_URL))
    logger.info("DATABASE_URL target → %s", _mask_url(settings.DATABASE_URL) if settings.DATABASE_URL else "(empty)")
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
)

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
    try:
        r = redis_lib.from_url(settings.REDIS_URL, socket_connect_timeout=3)
        r.ping()
        checks["redis"] = "connected"
        checks["redis_host"] = redis_target
        r.close()
    except Exception as exc:
        logger.warning("Health check - redis failed (target=%s): %s", redis_target, exc)
        checks["redis"] = "disconnected"
        checks["redis_host"] = redis_target

    # Celery workers check (informational — does not block deploy)
    try:
        from app.celery_app import celery_app as _celery
        inspector = _celery.control.inspect(timeout=3)
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
