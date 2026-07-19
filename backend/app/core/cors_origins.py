"""CORS allow-list that includes registered workspace custom domains."""
from __future__ import annotations

import logging
import time
from typing import Optional
from urllib.parse import urlparse

from sqlalchemy import select

from app.core.config import settings
from app.core.workspace_url import normalize_hostname

logger = logging.getLogger(__name__)

_CACHE_TTL_S = 60.0
_cached_at: float = 0.0
_cached_hosts: set[str] = set()


async def _load_workspace_domains() -> set[str]:
    from app.core.database import AsyncSessionLocal
    from app.models.workspace import Workspace

    hosts: set[str] = set()
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Workspace.domain).where(Workspace.domain.is_not(None))
            )
            for (domain,) in result.all():
                host = normalize_hostname(domain)
                if host:
                    hosts.add(host)
    except Exception:
        logger.exception("Failed to load workspace custom domains for CORS")
    return hosts


async def refresh_workspace_domain_cache() -> set[str]:
    global _cached_at, _cached_hosts
    hosts = await _load_workspace_domains()
    _cached_hosts = hosts
    _cached_at = time.monotonic()
    return hosts


async def get_workspace_domain_hosts() -> set[str]:
    if time.monotonic() - _cached_at > _CACHE_TTL_S:
        return await refresh_workspace_domain_cache()
    return _cached_hosts


def get_workspace_domain_hosts_cached() -> set[str]:
    """Sync snapshot for exception handlers (may be slightly stale)."""
    return _cached_hosts


def _static_origin_allowed(origin: str) -> bool:
    allowed = settings.cors_origins_list
    if "*" in allowed:
        return True
    return origin in allowed


def _host_allowed(host: str | None, workspace_hosts: set[str]) -> bool:
    if not host:
        return False
    if host in workspace_hosts:
        return True
    # Allow http(s)://localhost during non-production even if misconfigured.
    if not settings.is_production and host in {"localhost", "127.0.0.1"}:
        return True
    return False


async def is_cors_origin_allowed(origin: Optional[str]) -> bool:
    if not origin:
        return False
    if _static_origin_allowed(origin):
        return True
    try:
        host = normalize_hostname(urlparse(origin).hostname)
    except Exception:
        return False
    hosts = await get_workspace_domain_hosts()
    return _host_allowed(host, hosts)


def is_cors_origin_allowed_sync(origin: Optional[str]) -> bool:
    if not origin:
        return False
    if _static_origin_allowed(origin):
        return True
    try:
        host = normalize_hostname(urlparse(origin).hostname)
    except Exception:
        return False
    return _host_allowed(host, get_workspace_domain_hosts_cached())
