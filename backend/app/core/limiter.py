"""
Centralised rate limiter.

We provide a sane application-wide default so endpoints that forget to attach
their own @limiter.limit decorator are still protected from burst abuse.
Auth endpoints should keep their stricter per-route limits (e.g. 10/min for
login) and they WILL override the default.

Keying strategy:
-   For AUTHENTICATED requests we use the user id, so shared corporate NATs
    (gym + 20 trainers behind the same IP) don't exhaust each other's quota.
-   For ANONYMOUS requests we fall back to the real client IP, resolved from
    proxy headers. `slowapi.util.get_remote_address` reads `request.client.host`
    which behind Cloudflare + Coolify is ALWAYS the proxy IP → the entire
    platform would share a single counter and a single abuser could lock the
    site. This module walks the forwarded-for chain with a Cloudflare-first
    preference to get the actual origin IP.

Storage choice:
- Production: Redis, so limits are consistent across multiple uvicorn workers.
- Development / no Redis reachable: in-memory (single-process), good enough
  for a dev box and prevents the server from refusing to start when Redis
  is not available.
"""
import logging

from slowapi import Limiter
from starlette.requests import Request

from app.core.config import settings

logger = logging.getLogger(__name__)


def _first_ip(header_value: str | None) -> str | None:
    """Return the leftmost IP from a comma-separated Forwarded-For header."""
    if not header_value:
        return None
    first = header_value.split(",", 1)[0].strip()
    return first or None


def client_ip(request: Request) -> str:
    """Best-effort real client IP for rate-limit bucketing.

    Priority:
    1. CF-Connecting-IP      — set by Cloudflare, spoof-proof when CF is in front.
    2. True-Client-IP        — Akamai / enterprise CDN equivalent.
    3. X-Forwarded-For (1st) — standard proxy chain.
    4. X-Real-IP             — Nginx/Traefik default.
    5. request.client.host   — socket peer, only useful with no proxy.

    We only honour these headers in production; in dev they're attacker-
    controlled and we shouldn't trust them.
    """
    if settings.APP_ENV == "production":
        for header in ("cf-connecting-ip", "true-client-ip"):
            ip = request.headers.get(header)
            if ip:
                return ip.strip()
        ip = _first_ip(request.headers.get("x-forwarded-for"))
        if ip:
            return ip
        ip = request.headers.get("x-real-ip")
        if ip:
            return ip.strip()

    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def rate_limit_key(request: Request) -> str:
    """Use the authenticated user id when available, else the real client IP.

    We check several common ways the auth layer attaches identity to the
    request scope. None of them are guaranteed by FastAPI, so we defensively
    try each. This runs once per request.
    """
    state = getattr(request, "state", None)
    if state is not None:
        for attr in ("user_id", "current_user_id"):
            uid = getattr(state, attr, None)
            if uid:
                return f"user:{uid}"
        user = getattr(state, "user", None)
        if user is not None:
            uid = getattr(user, "id", None)
            if uid:
                return f"user:{uid}"
    return f"ip:{client_ip(request)}"


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
    key_func=rate_limit_key,
    default_limits=_default_limits(),
    storage_uri=_pick_storage_uri(),
    headers_enabled=True,  # Exposes X-RateLimit-* response headers
    # Sliding window counter spreads burst load more smoothly than fixed-window
    # without the memory cost of moving-window.
    strategy="sliding-window-counter",
)
