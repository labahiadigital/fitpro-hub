"""Team groups management endpoints."""
import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel as PydanticModel
from sqlalchemy import select, and_, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.middleware.auth import require_workspace, CurrentUser
from app.models.team_group import TeamGroup, TeamGroupMember

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ SCHEMAS ============

class GroupCreate(PydanticModel):
    name: str
    description: Optional[str] = None
    color: str = "blue"
    custom_role_id: Optional[UUID] = None
    assigned_clients: Optional[List[str]] = []


class GroupUpdate(PydanticModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    custom_role_id: Optional[UUID] = None
    assigned_clients: Optional[List[str]] = None


class GroupPermissionsUpdate(PydanticModel):
    permissions: dict


class GroupMemberAdd(PydanticModel):
    user_ids: List[UUID]


class GroupMemberResponse(PydanticModel):
    id: UUID
    group_id: UUID
    user_id: UUID

    class Config:
        from_attributes = True


class GroupResponse(PydanticModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str]
    color: Optional[str]
    permissions: dict
    custom_role_id: Optional[UUID] = None
    assigned_clients: Optional[List[str]] = []
    members: List[GroupMemberResponse] = []
    created_at: object
    updated_at: object

    class Config:
        from_attributes = True


# ============ ENDPOINTS ============

@router.get("", response_model=List[GroupResponse])
async def list_groups(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(TeamGroup)
            .where(TeamGroup.workspace_id == current_user.workspace_id)
            .options(selectinload(TeamGroup.members))
            .order_by(TeamGroup.name)
        )
        return result.scalars().all()
    except Exception as e:
        await db.rollback()
        error_msg = str(e).lower()
        if "does not exist" in error_msg or "no such table" in error_msg or "undefined table" in error_msg:
            return []
        logger.exception("Error listing groups: %s", e)
        raise HTTPException(status_code=500, detail="Error al obtener grupos")


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    data: GroupCreate,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        group = TeamGroup(
            workspace_id=current_user.workspace_id,
            name=data.name,
            description=data.description,
            color=data.color,
        )
        db.add(group)
        await db.commit()
        await db.refresh(group, ["members"])
        return group
    except Exception as e:
        await db.rollback()
        logger.exception("Error creating group: %s", e)
        raise HTTPException(status_code=500, detail="Error al crear grupo")


@router.patch("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: UUID,
    data: GroupUpdate,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(TeamGroup)
            .where(and_(TeamGroup.id == group_id, TeamGroup.workspace_id == current_user.workspace_id))
            .options(selectinload(TeamGroup.members))
        )
        group = result.scalar_one_or_none()
        if not group:
            raise HTTPException(status_code=404, detail="Grupo no encontrado")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(group, field, value)

        await db.commit()
        await db.refresh(group, ["members"])
        return group
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.exception("Error updating group: %s", e)
        raise HTTPException(status_code=500, detail="Error al actualizar grupo")


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(TeamGroup).where(
                and_(TeamGroup.id == group_id, TeamGroup.workspace_id == current_user.workspace_id)
            )
        )
        group = result.scalar_one_or_none()
        if not group:
            raise HTTPException(status_code=404, detail="Grupo no encontrado")

        await db.delete(group)
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.exception("Error deleting group: %s", e)
        raise HTTPException(status_code=500, detail="Error al eliminar grupo")


@router.post("/{group_id}/members", response_model=GroupResponse)
async def add_members(
    group_id: UUID,
    data: GroupMemberAdd,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(TeamGroup)
            .where(and_(TeamGroup.id == group_id, TeamGroup.workspace_id == current_user.workspace_id))
            .options(selectinload(TeamGroup.members))
        )
        group = result.scalar_one_or_none()
        if not group:
            raise HTTPException(status_code=404, detail="Grupo no encontrado")

        existing_user_ids = {m.user_id for m in group.members}
        for user_id in data.user_ids:
            if user_id not in existing_user_ids:
                member = TeamGroupMember(group_id=group.id, user_id=user_id)
                db.add(member)

        await db.commit()
        await db.refresh(group, ["members"])
        return group
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.exception("Error adding members: %s", e)
        raise HTTPException(status_code=500, detail="Error al añadir miembros")


@router.delete("/{group_id}/members/{user_id}", response_model=GroupResponse)
async def remove_member(
    group_id: UUID,
    user_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(TeamGroup)
            .where(and_(TeamGroup.id == group_id, TeamGroup.workspace_id == current_user.workspace_id))
            .options(selectinload(TeamGroup.members))
        )
        group = result.scalar_one_or_none()
        if not group:
            raise HTTPException(status_code=404, detail="Grupo no encontrado")

        await db.execute(
            sa_delete(TeamGroupMember).where(
                and_(TeamGroupMember.group_id == group_id, TeamGroupMember.user_id == user_id)
            )
        )
        await db.commit()
        await db.refresh(group, ["members"])
        return group
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.exception("Error removing member: %s", e)
        raise HTTPException(status_code=500, detail="Error al quitar miembro")


@router.patch("/{group_id}/permissions", response_model=GroupResponse)
async def update_group_permissions(
    group_id: UUID,
    data: GroupPermissionsUpdate,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(TeamGroup)
            .where(and_(TeamGroup.id == group_id, TeamGroup.workspace_id == current_user.workspace_id))
            .options(selectinload(TeamGroup.members))
        )
        group = result.scalar_one_or_none()
        if not group:
            raise HTTPException(status_code=404, detail="Grupo no encontrado")

        group.permissions = data.permissions
        await db.commit()
        await db.refresh(group, ["members"])
        return group
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.exception("Error updating group permissions: %s", e)
        raise HTTPException(status_code=500, detail="Error al actualizar permisos del grupo")
