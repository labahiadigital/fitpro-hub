"""Custom role management endpoints."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import CustomRole, RoleType, DEFAULT_ROLE_PERMISSIONS
from app.middleware.auth import require_workspace, require_owner, CurrentUser

router = APIRouter()


# ============ SCHEMAS ============

class CustomRoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#2D6A4F"
    base_role: RoleType = RoleType.COLLABORATOR
    permissions: Optional[dict] = None


class CustomRoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    base_role: Optional[RoleType] = None
    permissions: Optional[dict] = None
    is_active: Optional[bool] = None


class CustomRoleResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str]
    color: str
    base_role: RoleType
    permissions: dict
    is_active: bool
    
    class Config:
        from_attributes = True


class PermissionInfo(BaseModel):
    resource: str
    actions: List[str]
    description: str


# ============ ENDPOINTS ============

@router.get("/default-permissions")
async def get_default_permissions(
    current_user: CurrentUser = Depends(require_workspace),
):
    """
    Obtener permisos por defecto para cada tipo de rol.
    """
    return {
        "roles": {
            role.value: {
                "name": role.value.title(),
                "permissions": perms
            }
            for role, perms in DEFAULT_ROLE_PERMISSIONS.items()
        },
        "available_resources": [
            {"resource": "clients", "description": "Gestión de clientes", "actions": ["create", "read", "update", "delete"]},
            {"resource": "workouts", "description": "Programas de entrenamiento", "actions": ["create", "read", "update", "delete"]},
            {"resource": "nutrition", "description": "Planes nutricionales", "actions": ["create", "read", "update", "delete"]},
            {"resource": "calendar", "description": "Calendario y reservas", "actions": ["create", "read", "update", "delete"]},
            {"resource": "payments", "description": "Pagos y facturación", "actions": ["create", "read", "update", "delete"]},
            {"resource": "team", "description": "Gestión de equipo", "actions": ["create", "read", "update", "delete"]},
            {"resource": "settings", "description": "Configuración", "actions": ["read", "update"]},
            {"resource": "reports", "description": "Informes y analíticas", "actions": ["read"]},
            {"resource": "chat", "description": "Chat y mensajería", "actions": ["read", "send"]},
            {"resource": "automations", "description": "Automatizaciones", "actions": ["create", "read", "update", "delete"]},
        ]
    }


@router.get("", response_model=List[CustomRoleResponse])
async def list_custom_roles(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar roles personalizados del workspace.
    """
    result = await db.execute(
        select(CustomRole).where(
            CustomRole.workspace_id == current_user.workspace_id
        ).order_by(CustomRole.name)
    )
    return result.scalars().all()


@router.post("", response_model=CustomRoleResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_role(
    data: CustomRoleCreate,
    current_user: CurrentUser = Depends(require_owner),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo rol personalizado.
    """
    # Check if role with same name exists
    result = await db.execute(
        select(CustomRole).where(
            CustomRole.workspace_id == current_user.workspace_id,
            CustomRole.name == data.name
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un rol con este nombre"
        )
    
    role = CustomRole(
        workspace_id=current_user.workspace_id,
        name=data.name,
        description=data.description,
        color=data.color,
        base_role=data.base_role,
        permissions=data.permissions or {},
        is_active=True
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@router.get("/{role_id}", response_model=CustomRoleResponse)
async def get_custom_role(
    role_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de un rol personalizado.
    """
    result = await db.execute(
        select(CustomRole).where(
            CustomRole.id == role_id,
            CustomRole.workspace_id == current_user.workspace_id
        )
    )
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado"
        )
    
    return role


@router.put("/{role_id}", response_model=CustomRoleResponse)
async def update_custom_role(
    role_id: UUID,
    data: CustomRoleUpdate,
    current_user: CurrentUser = Depends(require_owner),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar un rol personalizado.
    """
    result = await db.execute(
        select(CustomRole).where(
            CustomRole.id == role_id,
            CustomRole.workspace_id == current_user.workspace_id
        )
    )
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado"
        )
    
    # Check name uniqueness if changing
    if data.name and data.name != role.name:
        result = await db.execute(
            select(CustomRole).where(
                CustomRole.workspace_id == current_user.workspace_id,
                CustomRole.name == data.name,
                CustomRole.id != role_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un rol con este nombre"
            )
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(role, field, value)
    
    await db.commit()
    await db.refresh(role)
    return role


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_role(
    role_id: UUID,
    current_user: CurrentUser = Depends(require_owner),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un rol personalizado.
    """
    result = await db.execute(
        select(CustomRole).where(
            CustomRole.id == role_id,
            CustomRole.workspace_id == current_user.workspace_id
        )
    )
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado"
        )
    
    # TODO: Check if role is assigned to any users before deleting
    
    await db.delete(role)
    await db.commit()
