"""Tiny in-process TTL cache for hot polling endpoints.

Designed for high-frequency, low-stakes data (unread counters, status badges)
where the UI polls every few seconds and a 3-10s window of staleness is
acceptable. Prevents the "thundering herd" pattern where every tab hits the
database every 15-30 seconds.

Not a replacement for Redis / Celery / any distributed cache. This cache is
per-worker and disappears on restart.
"""
from __future__ import annotations

import time
from typing import Any, Dict, Tuple


_CACHE: Dict[str, Tuple[float, Any]] = {}


def get(key: str) -> Any | None:
    entry = _CACHE.get(key)
    if entry is None:
        return None
    expires_at, value = entry
    if expires_at < time.monotonic():
        _CACHE.pop(key, None)
        return None
    return value


def set(key: str, value: Any, ttl: float = 5.0) -> None:
    _CACHE[key] = (time.monotonic() + ttl, value)


def invalidate(key: str) -> None:
    _CACHE.pop(key, None)


def invalidate_prefix(prefix: str) -> None:
    """Drop every entry whose key starts with `prefix`. O(n)."""
    for k in list(_CACHE.keys()):
        if k.startswith(prefix):
            _CACHE.pop(k, None)
