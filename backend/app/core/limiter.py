"""
Centralised rate limiter.

We provide a sane application-wide default so endpoints that forget to attach
their own @limiter.limit decorator are still protected from burst abuse.
Auth endpoints should keep their stricter per-route limits (e.g. 10/min for
login) and they WILL override the default.

Limits are keyed by client IP (X-Forwarded-For aware via slowapi util).

Storage choice:
- Production: Redis, so limits are consistent across multiple uvicorn workers.
- Development / no Redis reachable: in-memory (single-process), good enough
  for a dev box and prevents the server from refusing to start when Redis
  is not available.
"""
import logging

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

logger = logging.getLogger(__name__)


def _default_limits() -> list[str]:
    # Much more generous in dev so local testing isn't annoying.
    if settings.APP_ENV == "production":
        return ["300/minute", "3000/hour"]
    return ["1200/minute"]


def _pick_storage_uri() -> str | None:
    """Return a storage URI only if we can reasonably trust it to work.

    We never want a Redis connectivity issue to take the whole API down, so
    outside of production we fall back to in-memory storage when the URL
    is not reachable within a short timeout.
    """
    url = settings.REDIS_URL
    if not url:
        return None

    if settings.APP_ENV == "production":
        # Production *should* have Redis available; surface errors loudly.
        return url

    # Dev / staging: probe the TCP connection so we don't hang later.
    try:
        import socket
        from urllib.parse import urlparse

        parsed = urlparse(url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        with socket.create_connection((host, port), timeout=0.5):
            return url
    except OSError as exc:
        logger.warning(
            "Redis at %s not reachable (%s). Rate limiter will use in-memory storage.",
            url,
            exc,
        )
        return None


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=_default_limits(),
    storage_uri=_pick_storage_uri(),
    headers_enabled=True,  # Exposes X-RateLimit-* response headers
    # Sliding window counter spreads burst load more smoothly than fixed-window
    # without the memory cost of moving-window.
    strategy="sliding-window-counter",
)
