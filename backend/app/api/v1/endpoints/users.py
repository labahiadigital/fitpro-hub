from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.user import User, UserRole, RoleType
from app.schemas.user import (
    UserResponse, UserUpdate, UserRoleResponse, 
    InviteUserRequest, UserWithRoleResponse, UserRoleUpdate
)
from app.middleware.auth import get_current_user, require_workspace, require_owner, require_staff, CurrentUser

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
            avatar_url=user.avatar_url,
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
    Invitar a un usuario al workspace (solo propietario).
    """
    # Check if user already exists
    result = await db.execute(
        select(User).where(User.email == data.email)
    )
    user = result.scalar_one_or_none()
    
    if user:
        # Check if already in workspace
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
        # Create placeholder user (will be completed when they register)
        user = User(email=data.email)
        db.add(user)
        await db.flush()
    
    # Create user role
    user_role = UserRole(
        user_id=user.id,
        workspace_id=current_user.workspace_id,
        role=data.role
    )
    db.add(user_role)
    await db.commit()
    
    # TODO: Send invitation email if data.send_email is True
    
    await db.refresh(user_role)
    
    return UserRoleResponse(
        id=user_role.id,
        user_id=user_role.user_id,
        workspace_id=user_role.workspace_id,
        role=user_role.role,
        is_default=user_role.is_default,
        created_at=user_role.created_at
    )


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

