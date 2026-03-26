from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import secrets
import logging

from app.core.database import get_db
from app.core.storage import resolve_url
from app.core.config import settings
from app.core.security import get_password_hash, generate_verification_token, validate_password_strength
from app.models.user import User, UserRole, RoleType
from app.models.workspace import Workspace
from app.schemas.user import (
    UserResponse, UserUpdate, UserRoleResponse, 
    InviteUserRequest, UserWithRoleResponse, UserRoleUpdate
)
from app.middleware.auth import get_current_user, require_workspace, require_owner, require_staff, CurrentUser
from app.services.email import email_service, EmailTemplates
from pydantic import BaseModel, EmailStr

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=List[UserWithRoleResponse])
async def list_workspace_users(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar todos los usuarios del workspace actual.
    """
    result = await db.execute(
        select(UserRole, User)
        .join(User, UserRole.user_id == User.id)
        .where(UserRole.workspace_id == current_user.workspace_id)
    )
    
    users = []
    for user_role, user in result.all():
        users.append(UserWithRoleResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            avatar_url=await resolve_url(user.avatar_url),
            role=user_role.role,
            is_active=user.is_active
        ))
    
    return users


@router.post("/invite", response_model=UserRoleResponse, status_code=status.HTTP_201_CREATED)
async def invite_user(
    data: InviteUserRequest,
    current_user: CurrentUser = Depends(require_owner),
    db: AsyncSession = Depends(get_db)
):
    """
    Invite a user to the workspace (owner only).
    If the user already exists and has a password, they get added directly.
    If the user doesn't exist, a placeholder is created with an invite token
    so they can complete registration.
    """
    email_lower = data.email.lower().strip()

    result = await db.execute(
        select(User).where(User.email == email_lower)
    )
    user = result.scalar_one_or_none()
    is_new_user = user is None
    invite_token: Optional[str] = None

    if user:
        result = await db.execute(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.workspace_id == current_user.workspace_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El usuario ya pertenece a este workspace"
            )
    else:
        invite_token = secrets.token_urlsafe(32)
        user = User(
            email=email_lower,
            email_verification_token=invite_token,
            is_active=True,
            email_verified=False,
        )
        db.add(user)
        await db.flush()

    user_role = UserRole(
        user_id=user.id,
        workspace_id=current_user.workspace_id,
        role=data.role,
        is_default=is_new_user,
    )
    db.add(user_role)
    await db.commit()
    await db.refresh(user_role)

    if data.send_email:
        result = await db.execute(
            select(Workspace).where(Workspace.id == current_user.workspace_id)
        )
        workspace = result.scalar_one_or_none()
        workspace_name = workspace.name if workspace else "Trackfiz"
        inviter_name = current_user.user.full_name or current_user.email

        if is_new_user and invite_token:
            invitation_url = f"{settings.FRONTEND_URL}/auth/accept-invite?token={invite_token}"
        else:
            invitation_url = f"{settings.FRONTEND_URL}/auth/login"

        html_content = EmailTemplates.invitation_email(
            inviter_name=inviter_name,
            workspace_name=workspace_name,
            invitation_url=invitation_url,
        )

        try:
            await email_service.send_email(
                to_email=email_lower,
                to_name=user.full_name or email_lower,
                subject=f"Invitación a {workspace_name} en Trackfiz",
                html_content=html_content,
            )
            logger.info(f"Staff invitation email sent to {email_lower}")
        except Exception as e:
            logger.error(f"Failed to send staff invitation email: {e}")

    return UserRoleResponse(
        id=user_role.id,
        user_id=user_role.user_id,
        workspace_id=user_role.workspace_id,
        role=user_role.role,
        is_default=user_role.is_default,
        created_at=user_role.created_at
    )


class AcceptStaffInviteRequest(BaseModel):
    token: str
    full_name: str
    password: str


@router.post("/accept-invite")
async def accept_staff_invite(
    data: AcceptStaffInviteRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Accept a staff invitation by setting the user's name and password.
    The token was set as email_verification_token during invite.
    """
    result = await db.execute(
        select(User).where(User.email_verification_token == data.token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de invitación inválido o expirado"
        )

    if user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta cuenta ya fue activada. Inicia sesión normalmente."
        )

    is_valid, error_msg = validate_password_strength(data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    user.full_name = data.full_name
    user.password_hash = get_password_hash(data.password)
    user.email_verified = True
    user.email_verification_token = None

    await db.commit()

    result = await db.execute(
        select(UserRole).where(UserRole.user_id == user.id).limit(1)
    )
    role_record = result.scalar_one_or_none()

    return {
        "success": True,
        "message": "Cuenta activada correctamente. Ya puedes iniciar sesión.",
        "email": user.email,
        "role": role_record.role.value if role_record else None,
    }


@router.get("/validate-invite/{token}")
async def validate_staff_invite(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Validate a staff invite token and return the invited email.
    """
    result = await db.execute(
        select(User).where(User.email_verification_token == token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitación no encontrada o expirada"
        )

    if user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta invitación ya fue aceptada"
        )

    result = await db.execute(
        select(UserRole, Workspace)
        .join(Workspace, UserRole.workspace_id == Workspace.id)
        .where(UserRole.user_id == user.id)
        .limit(1)
    )
    row = result.first()

    return {
        "email": user.email,
        "workspace_name": row[1].name if row else "Trackfiz",
        "role": row[0].role.value if row else "collaborator",
    }


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de un usuario del workspace.
    """
    # Check if user belongs to workspace
    result = await db.execute(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.workspace_id == current_user.workspace_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado en este workspace"
        )
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar perfil de usuario.
    Solo el propio usuario o el owner del workspace pueden actualizar.
    """
    # Check permissions
    if user_id != current_user.id and not current_user.is_owner():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar este usuario"
        )
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            if field == "preferences" and isinstance(value, dict):
                current_prefs = user.preferences or {}
                current_prefs.update(value)
                user.preferences = current_prefs
            else:
                setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    
    return user


@router.put("/{user_id}/role", response_model=UserRoleResponse)
async def update_user_role(
    user_id: UUID,
    data: UserRoleUpdate,
    current_user: CurrentUser = Depends(require_owner),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar rol de un usuario en el workspace (solo propietario).
    """
    # Can't change own role
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes cambiar tu propio rol"
        )
    
    result = await db.execute(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.workspace_id == current_user.workspace_id
        )
    )
    user_role = result.scalar_one_or_none()
    
    if not user_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado en este workspace"
        )
    
    user_role.role = data.role
    await db.commit()
    await db.refresh(user_role)
    
    return UserRoleResponse(
        id=user_role.id,
        user_id=user_role.user_id,
        workspace_id=user_role.workspace_id,
        role=user_role.role,
        is_default=user_role.is_default,
        created_at=user_role.created_at
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_from_workspace(
    user_id: UUID,
    current_user: CurrentUser = Depends(require_owner),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un usuario del workspace (solo propietario).
    """
    # Can't remove self
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminarte a ti mismo del workspace"
        )
    
    result = await db.execute(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.workspace_id == current_user.workspace_id
        )
    )
    user_role = result.scalar_one_or_none()
    
    if not user_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado en este workspace"
        )
    
    await db.delete(user_role)
    await db.commit()

