from typing import Optional, List
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_supabase_token
from app.models.user import User, UserRole, RoleType


security = HTTPBearer()


class CurrentUser:
    def __init__(
        self,
        user: User,
        workspace_id: Optional[UUID] = None,
        role: Optional[RoleType] = None,
        token_payload: Optional[dict] = None
    ):
        self.user = user
        self.workspace_id = workspace_id
        self.role = role
        self.token_payload = token_payload
    
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


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> CurrentUser:
    """
    Validate JWT token and return current user with workspace context.
    """
    token = credentials.credentials
    payload = decode_supabase_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user by auth_id (Supabase user ID)
    auth_id = payload.get("sub")
    if not auth_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    
    result = await db.execute(
        select(User).where(User.auth_id == auth_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado",
        )
    
    # Get workspace context - first try app_metadata, then default workspace
    workspace_id = None
    role = None
    
    app_metadata = payload.get("app_metadata", {})
    workspace_id_str = app_metadata.get("workspace_id")
    
    if workspace_id_str:
        workspace_id = UUID(workspace_id_str)
        # Get user role in this workspace
        result = await db.execute(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.workspace_id == workspace_id
            )
        )
        user_role = result.scalar_one_or_none()
        if user_role:
            role = user_role.role
    else:
        # No workspace in token, try to get user's default workspace
        result = await db.execute(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.is_default == True
            )
        )
        default_role = result.scalar_one_or_none()
        
        if default_role:
            workspace_id = default_role.workspace_id
            role = default_role.role
        else:
            # No default, get first workspace
            result = await db.execute(
                select(UserRole).where(UserRole.user_id == user.id).limit(1)
            )
            first_role = result.scalar_one_or_none()
            if first_role:
                workspace_id = first_role.workspace_id
                role = first_role.role
    
    return CurrentUser(
        user=user,
        workspace_id=workspace_id,
        role=role,
        token_payload=payload
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


# Pre-defined role checkers
require_owner = require_roles([RoleType.owner])
require_staff = require_roles([RoleType.owner, RoleType.collaborator])
require_any_role = require_roles([RoleType.owner, RoleType.collaborator, RoleType.client])

