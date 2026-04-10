from typing import Optional, List
from uuid import UUID
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole, RoleType

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    scheme_name="JWT",
    description="JWT Bearer token authentication",
    auto_error=True,
)

# ---------------------------------------------------------------------------
# URL prefix  →  permission resource mapping
# ---------------------------------------------------------------------------
# Maps the first segment of the API path (after /api/v1/) to the permission
# resource key used in DEFAULT_ROLE_PERMISSIONS.  Endpoints whose prefix is
# NOT listed here are exempt from granular checks (e.g. auth, account).
# ---------------------------------------------------------------------------
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
}

# HTTP method  →  permission action
_METHOD_TO_ACTION: dict[str, str] = {
    "GET": "read",
    "HEAD": "read",
    "OPTIONS": "read",
    "POST": "create",
    "PUT": "update",
    "PATCH": "update",
    "DELETE": "delete",
}


def _resolve_resource_and_action(request: Request) -> tuple[Optional[str], str]:
    """Extract the permission resource and action from the current request."""
    path = request.url.path
    method = request.method.upper()

    parts = path.strip("/").split("/")
    # Expected shape: api / v1 / <prefix> / ...
    prefix = None
    for i, part in enumerate(parts):
        if part == "v1" and i + 1 < len(parts):
            prefix = parts[i + 1]
            break

    resource = _PATH_TO_RESOURCE.get(prefix) if prefix else None
    action = _METHOD_TO_ACTION.get(method, "read")
    return resource, action


class CurrentUser:
    def __init__(
        self,
        user: User,
        workspace_id: Optional[UUID] = None,
        role: Optional[RoleType] = None,
        token_payload: Optional[dict] = None,
        user_role: Optional[UserRole] = None,
    ):
        self.user = user
        self.workspace_id = workspace_id
        self.role = role
        self.token_payload = token_payload
        self._user_role = user_role

    @property
    def id(self) -> UUID:
        return self.user.id

    @property
    def email(self) -> str:
        return self.user.email

    def has_role(self, roles: List[RoleType]) -> bool:
        return self.role in roles

    def is_owner(self) -> bool:
        return self.role == RoleType.owner

    def is_collaborator(self) -> bool:
        return self.role in [RoleType.owner, RoleType.collaborator]

    def is_client(self) -> bool:
        return self.role == RoleType.client

    def has_permission(self, resource: str, action: str) -> bool:
        if self._user_role:
            return self._user_role.has_permission(resource, action)
        return False

    def get_permissions(self) -> dict:
        if self._user_role:
            return self._user_role.get_permissions()
        return {}

    def get_assigned_clients(self) -> list:
        if self._user_role:
            return self._user_role.get_assigned_clients()
        return []


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> CurrentUser:
    """Validate JWT token and return current user with workspace context."""
    payload = decode_access_token(token)
    user = None
    
    if payload:
        user_id_str = payload.sub
        if user_id_str:
            try:
                user_id = UUID(user_id_str)
                result = await db.execute(
                    select(User).where(User.id == user_id)
                )
                user = result.scalar_one_or_none()
            except (ValueError, TypeError):
                pass
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado",
        )
    
    workspace_id = None
    role = None
    resolved_user_role = None

    token_workspace_id = None
    if hasattr(payload, 'workspace_id'):
        token_workspace_id = payload.workspace_id

    if token_workspace_id:
        try:
            workspace_id = UUID(token_workspace_id) if isinstance(token_workspace_id, str) else token_workspace_id
            result = await db.execute(
                select(UserRole).where(
                    UserRole.user_id == user.id,
                    UserRole.workspace_id == workspace_id
                )
            )
            resolved_user_role = result.scalar_one_or_none()
            if resolved_user_role:
                role = resolved_user_role.role
        except (ValueError, TypeError):
            pass

    if not workspace_id:
        result = await db.execute(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.is_default.is_(True)
            )
        )
        resolved_user_role = result.scalar_one_or_none()

        if resolved_user_role:
            workspace_id = resolved_user_role.workspace_id
            role = resolved_user_role.role
        else:
            result = await db.execute(
                select(UserRole).where(UserRole.user_id == user.id).limit(1)
            )
            resolved_user_role = result.scalar_one_or_none()
            if resolved_user_role:
                workspace_id = resolved_user_role.workspace_id
                role = resolved_user_role.role

    payload_dict = payload.model_dump() if hasattr(payload, 'model_dump') else (payload if isinstance(payload, dict) else {})

    return CurrentUser(
        user=user,
        workspace_id=workspace_id,
        role=role,
        token_payload=payload_dict,
        user_role=resolved_user_role,
    )


async def get_current_active_user(
    current_user: CurrentUser = Depends(get_current_user)
) -> CurrentUser:
    """Ensure user is active."""
    if not current_user.user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado"
        )
    return current_user


def require_workspace(
    current_user: CurrentUser = Depends(get_current_user)
) -> CurrentUser:
    """Ensure user has a workspace context."""
    if not current_user.workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requiere contexto de workspace"
        )
    return current_user


def require_roles(allowed_roles: List[RoleType]):
    """
    Dependency factory that checks if user has one of the allowed roles.
    Usage: Depends(require_roles([RoleType.OWNER, RoleType.COLLABORATOR]))
    """
    async def role_checker(
        current_user: CurrentUser = Depends(require_workspace)
    ) -> CurrentUser:
        if not current_user.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes rol asignado en este workspace"
            )
        
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción"
            )
        
        return current_user
    
    return role_checker


require_owner = require_roles([RoleType.owner])
require_any_role = require_roles([RoleType.owner, RoleType.collaborator, RoleType.client])


# ---------------------------------------------------------------------------
# require_staff – role check + automatic granular permission enforcement
# ---------------------------------------------------------------------------
# Owners pass unconditionally.  Collaborators are checked against their
# effective permissions (defaults merged with custom overrides) using the
# request URL prefix → resource and HTTP method → action mappings.
# ---------------------------------------------------------------------------

async def require_staff(
    request: Request,
    current_user: CurrentUser = Depends(require_workspace),
) -> CurrentUser:
    """Verify the user is owner or collaborator AND has the granular
    permission implied by the request path and HTTP method."""
    if not current_user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes rol asignado en este workspace",
        )

    if current_user.role not in (RoleType.owner, RoleType.collaborator):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción",
        )

    # Owners bypass granular checks
    if current_user.is_owner():
        return current_user

    resource, action = _resolve_resource_and_action(request)

    if resource and not current_user.has_permission(resource, action):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"No tienes permiso de '{action}' en '{resource}'",
        )

    return current_user


def require_permission(resource: str, action: str):
    """Dependency factory that checks granular permission on a resource.
    Owners always pass. For collaborators, custom overrides are respected."""
    async def permission_checker(
        current_user: CurrentUser = Depends(require_workspace)
    ) -> CurrentUser:
        if current_user.is_owner():
            return current_user
        if not current_user.has_permission(resource, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tienes permiso de '{action}' en '{resource}'"
            )
        return current_user
    return permission_checker
