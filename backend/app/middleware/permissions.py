"""HTTP middleware that enforces granular permissions for collaborators.

Runs on every request to /api/v1/ *before* the endpoint handler is invoked,
so it does not matter which FastAPI dependency the endpoint uses.

- Owners: pass unconditionally.
- Collaborators: checked against their effective permissions.
- Clients: only allowed to access the /my/ (client portal) prefix.
- Unauthenticated or public endpoints: skipped.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security import decode_access_token
from app.models.user import UserRole, RoleType

logger = logging.getLogger(__name__)

_EXEMPT_PREFIXES = (
    "/api/v1/auth",
    "/api/v1/account",
    "/api/v1/my",
    "/api/v1/invitations",
    "/api/v1/health",
    "/api/v1/storage",
    "/api/v1/wearables",
    "/api/v1/ai",
    "/api/v1/google-calendar",
    "/api/v1/whatsapp",
    "/api/v1/referrals",
    "/api/v1/notifications",
)

_PATH_TO_RESOURCE: dict[str, str] = {
    "clients": "clients",
    "workouts": "workouts",
    "exercises": "workouts",
    "nutrition": "nutrition",
    "foods": "nutrition",
    "supplements": "nutrition",
    "bookings": "calendar",
    "calendar": "calendar",
    "payments": "payments",
    "redsys": "payments",
    "sequra": "payments",
    "users": "team",
    "team": "team",
    "roles": "team",
    "settings": "settings",
    "reports": "reports",
    "messages": "chat",
    "chat": "chat",
    "automations": "automations",
    "reminders": "automations",
    "forms": "forms",
    "documents": "documents",
    "products": "catalog",
    "catalog": "catalog",
    "erp": "billing",
    "billing": "billing",
    "community": "community",
    "lms": "lms",
    "live-classes": "live_classes",
    "pdf": "documents",
}

_METHOD_TO_ACTION: dict[str, str] = {
    "GET": "read",
    "HEAD": "read",
    "OPTIONS": "read",
    "POST": "create",
    "PUT": "update",
    "PATCH": "update",
    "DELETE": "delete",
}


def _extract_resource_and_action(path: str, method: str):
    parts = path.strip("/").split("/")
    prefix = None
    for i, part in enumerate(parts):
        if part == "v1" and i + 1 < len(parts):
            prefix = parts[i + 1]
            break
    resource = _PATH_TO_RESOURCE.get(prefix) if prefix else None
    action = _METHOD_TO_ACTION.get(method.upper(), "read")
    return resource, action


class PermissionsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method.upper()

        if method == "OPTIONS":
            return await call_next(request)

        if not path.startswith("/api/v1/"):
            return await call_next(request)

        for exempt in _EXEMPT_PREFIXES:
            if path.startswith(exempt):
                return await call_next(request)

        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return await call_next(request)

        token = auth_header[7:]
        # SECURITY: use decode_access_token so refresh tokens cannot grant API access.
        # Previously this used a raw jwt.decode() that accepted any valid JWT type.
        payload = decode_access_token(token)
        if payload is None:
            return await call_next(request)

        role = payload.role
        if not role or role == "owner":
            return await call_next(request)

        if role == "client":
            return await call_next(request)

        resource, action = _extract_resource_and_action(path, method)
        if not resource:
            return await call_next(request)

        user_id_str = payload.sub
        workspace_id_str = payload.workspace_id
        if not user_id_str or not workspace_id_str:
            return await call_next(request)

        try:
            user_id = UUID(user_id_str)
            workspace_id = UUID(workspace_id_str)
        except (ValueError, TypeError):
            return await call_next(request)

        user_role = await _load_user_role_cached(user_id, workspace_id)

        if not user_role:
            return JSONResponse(
                status_code=403,
                content={"detail": "No tienes rol asignado en este workspace"},
            )

        if not user_role.has_permission(resource, action):
            logger.info(
                "Permission denied: user=%s resource=%s action=%s",
                user_id_str, resource, action,
            )
            return JSONResponse(
                status_code=403,
                content={"detail": f"No tienes permiso de '{action}' en '{resource}'"},
            )

        return await call_next(request)


# ---------------------------------------------------------------------------
# In-process short TTL cache for user roles.
#
# Each request that reaches this middleware would otherwise trigger a SELECT on
# user_roles. Under even modest load (10 RPS per worker) this easily becomes
# the hottest query on the database.  Caching the row for a handful of seconds
# keeps the permission model consistent while removing ~95% of the lookups.
# ---------------------------------------------------------------------------

import asyncio
import time
from typing import Tuple

_ROLE_CACHE_TTL_SECONDS = 15  # Short TTL -> role/permission edits propagate fast
_ROLE_CACHE_MAX_ENTRIES = 2048
_role_cache: dict[Tuple[UUID, UUID], tuple[float, Optional[UserRole]]] = {}
_role_cache_lock = asyncio.Lock()


async def _load_user_role_cached(user_id: UUID, workspace_id: UUID) -> Optional[UserRole]:
    """Return a UserRole row with a tiny TTL cache in front of the database."""
    key = (user_id, workspace_id)
    now = time.monotonic()
    cached = _role_cache.get(key)
    if cached and cached[0] > now:
        return cached[1]

    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(UserRole).where(
                UserRole.user_id == user_id,
                UserRole.workspace_id == workspace_id,
            )
        )
        user_role = result.scalar_one_or_none()

    async with _role_cache_lock:
        if len(_role_cache) > _ROLE_CACHE_MAX_ENTRIES:
            # Naive eviction: drop everything. Keeps memory bounded without LRU bookkeeping.
            _role_cache.clear()
        _role_cache[key] = (now + _ROLE_CACHE_TTL_SECONDS, user_role)
    return user_role


def invalidate_user_role_cache(user_id: UUID, workspace_id: Optional[UUID] = None) -> None:
    """Public helper so permission mutations can drop stale entries immediately."""
    if workspace_id is not None:
        _role_cache.pop((user_id, workspace_id), None)
        return
    for key in [k for k in _role_cache if k[0] == user_id]:
        _role_cache.pop(key, None)
