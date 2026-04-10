"""Custom role management endpoints."""
import logging
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel as PydanticBase
from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_workspace, CurrentUser
from app.models.custom_role import CustomRole

logger = logging.getLogger(__name__)

router = APIRouter()


class RoleCreate(PydanticBase):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "blue"
    permissions: Dict[str, List[str]] = {}


class RoleUpdate(PydanticBase):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    permissions: Optional[Dict[str, List[str]]] = None


class RoleResponse(PydanticBase):
    id: UUID
    name: str
    description: Optional[str]
    color: Optional[str]
    is_system: bool
    permissions: Dict[str, List[str]]

    model_config = {"from_attributes": True}


@router.get("", response_model=List[RoleResponse])
async def list_roles(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(CustomRole)
            .where(CustomRole.workspace_id == current_user.workspace_id)
            .order_by(CustomRole.is_system.desc(), CustomRole.name)
        )
        return result.scalars().all()
    except ProgrammingError:
        await db.rollback()
        return []


@router.post("", response_model=RoleResponse)
async def create_role(
    body: RoleCreate,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    role = CustomRole(
        workspace_id=current_user.workspace_id,
        name=body.name,
        description=body.description,
        color=body.color,
        is_system=False,
        permissions=body.permissions,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: UUID,
    body: RoleUpdate,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CustomRole).where(
            CustomRole.id == role_id,
            CustomRole.workspace_id == current_user.workspace_id,
        )
    )
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    if body.name is not None:
        role.name = body.name
    if body.description is not None:
        role.description = body.description
    if body.color is not None:
        role.color = body.color
    if body.permissions is not None:
        role.permissions = body.permissions

    await db.commit()
    await db.refresh(role)
    return role


@router.delete("/{role_id}")
async def delete_role(
    role_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CustomRole).where(
            CustomRole.id == role_id,
            CustomRole.workspace_id == current_user.workspace_id,
        )
    )
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    if role.is_system:
        raise HTTPException(status_code=400, detail="No se pueden eliminar roles del sistema")

    await db.delete(role)
    await db.commit()
    return {"ok": True}
