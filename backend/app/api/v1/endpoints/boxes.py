"""Box (Consultas/Espacios) CRUD endpoints."""
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_
from pydantic import BaseModel as BaseSchema

from app.core.database import get_db
from app.models.resource import Box, Appointment
from app.middleware.auth import require_staff, CurrentUser

router = APIRouter()


class BoxCreate(BaseSchema):
    name: str
    description: Optional[str] = None
    color_hex: str = "#3B82F6"
    is_active: bool = True
    sort_order: int = 0


class BoxUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    color_hex: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class BoxResponse(BaseSchema):
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str] = None
    color_hex: str
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=List[BoxResponse])
async def list_boxes(
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Box)
        .where(Box.workspace_id == current_user.workspace_id)
        .order_by(Box.sort_order, Box.name)
    )
    return result.scalars().all()


@router.post("", response_model=BoxResponse, status_code=status.HTTP_201_CREATED)
async def create_box(
    data: BoxCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    box = Box(workspace_id=current_user.workspace_id, **data.model_dump())
    db.add(box)
    await db.commit()
    await db.refresh(box)
    return box


@router.get("/{box_id}", response_model=BoxResponse)
async def get_box(
    box_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Box).where(Box.id == box_id, Box.workspace_id == current_user.workspace_id)
    )
    box = result.scalar_one_or_none()
    if not box:
        raise HTTPException(status_code=404, detail="Box no encontrado")
    return box


@router.put("/{box_id}", response_model=BoxResponse)
async def update_box(
    box_id: UUID,
    data: BoxUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Box).where(Box.id == box_id, Box.workspace_id == current_user.workspace_id)
    )
    box = result.scalar_one_or_none()
    if not box:
        raise HTTPException(status_code=404, detail="Box no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(box, k, v)
    box.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(box)
    return box


@router.delete("/{box_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_box(
    box_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Box).where(Box.id == box_id, Box.workspace_id == current_user.workspace_id)
    )
    box = result.scalar_one_or_none()
    if not box:
        raise HTTPException(status_code=404, detail="Box no encontrado")
    await db.delete(box)
    await db.commit()


@router.get("/{box_id}/stats")
async def box_stats(
    box_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """OPTIMIZATION: 4 COUNTs secuenciales -> 1 query agregada."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    agg = select(
        func.count(case((Appointment.start_time.between(today_start, today_end), Appointment.id))).label("today"),
        func.count(
            case((and_(Appointment.start_time > now, Appointment.status != "cancelled"), Appointment.id))
        ).label("upcoming"),
        func.count(Appointment.id).label("total"),
        func.count(case((Appointment.status == "cancelled", Appointment.id))).label("cancelled"),
    ).where(
        Appointment.box_id == box_id,
        Appointment.workspace_id == current_user.workspace_id,
    )
    row = (await db.execute(agg)).one()
    total = int(row.total or 0)
    cancelled = int(row.cancelled or 0)
    cancel_rate = round((cancelled / total * 100), 1) if total > 0 else 0
    return {
        "today": int(row.today or 0),
        "upcoming": int(row.upcoming or 0),
        "total": total,
        "cancel_rate": cancel_rate,
    }
