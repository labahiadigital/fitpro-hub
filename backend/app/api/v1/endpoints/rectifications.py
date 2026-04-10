"""Rectification request endpoints for content correction tickets."""
import logging
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import CurrentUser, require_workspace
from app.models.rectification import RectificationRequest

logger = logging.getLogger(__name__)
router = APIRouter()


class RectificationCreate(BaseModel):
    entity_type: str
    entity_id: Optional[UUID] = None
    entity_name: str
    message: str


class RectificationResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    user_id: Optional[UUID] = None
    entity_type: str
    entity_id: Optional[UUID] = None
    entity_name: str
    message: str
    status: str
    created_at: object
    updated_at: object

    class Config:
        from_attributes = True


@router.post("", response_model=RectificationResponse, status_code=status.HTTP_201_CREATED)
async def create_rectification(
    data: RectificationCreate,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        req = RectificationRequest(
            workspace_id=current_user.workspace_id,
            user_id=current_user.id,
            entity_type=data.entity_type,
            entity_id=data.entity_id,
            entity_name=data.entity_name,
            message=data.message,
        )
        db.add(req)
        await db.commit()
        await db.refresh(req)
        return req
    except Exception as e:
        await db.rollback()
        logger.exception("Error creating rectification: %s", e)
        raise HTTPException(status_code=500, detail="Error al crear solicitud de rectificación")


@router.get("", response_model=List[RectificationResponse])
async def list_rectifications(
    entity_type: Optional[str] = None,
    req_status: Optional[str] = Query(None, alias="status"),
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        query = select(RectificationRequest).where(
            RectificationRequest.workspace_id == current_user.workspace_id
        )
        if entity_type:
            query = query.where(RectificationRequest.entity_type == entity_type)
        if req_status:
            query = query.where(RectificationRequest.status == req_status)
        result = await db.execute(query.order_by(RectificationRequest.created_at.desc()))
        return result.scalars().all()
    except Exception as e:
        await db.rollback()
        error_msg = str(e).lower()
        if "does not exist" in error_msg or "no such table" in error_msg:
            return []
        logger.exception("Error listing rectifications: %s", e)
        raise HTTPException(status_code=500, detail="Error al obtener solicitudes")


@router.patch("/{req_id}/status")
async def update_rectification_status(
    req_id: UUID,
    new_status: str = Query(..., pattern="^(pending|reviewed|resolved)$"),
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RectificationRequest).where(
            RectificationRequest.id == req_id,
            RectificationRequest.workspace_id == current_user.workspace_id,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    req.status = new_status
    await db.commit()
    return {"id": str(req.id), "status": req.status}
