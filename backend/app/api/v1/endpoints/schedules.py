"""Schedule CRUD for staff, machines, and boxes."""
from datetime import time
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel as BaseSchema
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_staff, CurrentUser
from app.models.schedule import StaffSchedule, MachineSchedule, BoxSchedule

router = APIRouter()

DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]


class ScheduleSlot(BaseSchema):
    day_of_week: int
    start_time: str
    end_time: str
    is_available: bool = True


class ScheduleSlotResponse(BaseSchema):
    id: UUID
    day_of_week: int
    day_label: str = ""
    start_time: str
    end_time: str
    is_available: bool

    class Config:
        from_attributes = True


class BulkScheduleUpdate(BaseSchema):
    slots: List[ScheduleSlot]


def _slot_response(row) -> dict:
    return {
        "id": row.id,
        "day_of_week": row.day_of_week,
        "day_label": DAY_LABELS[row.day_of_week] if 0 <= row.day_of_week < 7 else "",
        "start_time": row.start_time.strftime("%H:%M") if row.start_time else "09:00",
        "end_time": row.end_time.strftime("%H:%M") if row.end_time else "18:00",
        "is_available": row.is_available,
    }


# ── Staff schedules ──────────────────────────────────────────────────────────

@router.get("/staff/{user_id}", response_model=List[ScheduleSlotResponse])
async def get_staff_schedule(
    user_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StaffSchedule)
        .where(StaffSchedule.workspace_id == current_user.workspace_id, StaffSchedule.user_id == user_id)
        .order_by(StaffSchedule.day_of_week)
    )
    rows = result.scalars().all()
    return [_slot_response(r) for r in rows]


@router.put("/staff/{user_id}")
async def upsert_staff_schedule(
    user_id: UUID,
    data: BulkScheduleUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(StaffSchedule).where(
            StaffSchedule.workspace_id == current_user.workspace_id,
            StaffSchedule.user_id == user_id,
        )
    )
    for slot in data.slots:
        parts_start = slot.start_time.split(":")
        parts_end = slot.end_time.split(":")
        db.add(StaffSchedule(
            workspace_id=current_user.workspace_id,
            user_id=user_id,
            day_of_week=slot.day_of_week,
            start_time=time(int(parts_start[0]), int(parts_start[1])),
            end_time=time(int(parts_end[0]), int(parts_end[1])),
            is_available=slot.is_available,
        ))
    await db.commit()
    return await get_staff_schedule(user_id, current_user, db)


# ── Machine schedules ────────────────────────────────────────────────────────

@router.get("/machines/{machine_id}", response_model=List[ScheduleSlotResponse])
async def get_machine_schedule(
    machine_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MachineSchedule)
        .where(MachineSchedule.workspace_id == current_user.workspace_id, MachineSchedule.machine_id == machine_id)
        .order_by(MachineSchedule.day_of_week)
    )
    rows = result.scalars().all()
    return [_slot_response(r) for r in rows]


@router.put("/machines/{machine_id}")
async def upsert_machine_schedule(
    machine_id: UUID,
    data: BulkScheduleUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(MachineSchedule).where(
            MachineSchedule.workspace_id == current_user.workspace_id,
            MachineSchedule.machine_id == machine_id,
        )
    )
    for slot in data.slots:
        parts_start = slot.start_time.split(":")
        parts_end = slot.end_time.split(":")
        db.add(MachineSchedule(
            workspace_id=current_user.workspace_id,
            machine_id=machine_id,
            day_of_week=slot.day_of_week,
            start_time=time(int(parts_start[0]), int(parts_start[1])),
            end_time=time(int(parts_end[0]), int(parts_end[1])),
            is_available=slot.is_available,
        ))
    await db.commit()
    return await get_machine_schedule(machine_id, current_user, db)


# ── Box schedules ────────────────────────────────────────────────────────────

@router.get("/boxes/{box_id}", response_model=List[ScheduleSlotResponse])
async def get_box_schedule(
    box_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BoxSchedule)
        .where(BoxSchedule.workspace_id == current_user.workspace_id, BoxSchedule.box_id == box_id)
        .order_by(BoxSchedule.day_of_week)
    )
    rows = result.scalars().all()
    return [_slot_response(r) for r in rows]


@router.put("/boxes/{box_id}")
async def upsert_box_schedule(
    box_id: UUID,
    data: BulkScheduleUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(BoxSchedule).where(
            BoxSchedule.workspace_id == current_user.workspace_id,
            BoxSchedule.box_id == box_id,
        )
    )
    for slot in data.slots:
        parts_start = slot.start_time.split(":")
        parts_end = slot.end_time.split(":")
        db.add(BoxSchedule(
            workspace_id=current_user.workspace_id,
            box_id=box_id,
            day_of_week=slot.day_of_week,
            start_time=time(int(parts_start[0]), int(parts_start[1])),
            end_time=time(int(parts_end[0]), int(parts_end[1])),
            is_available=slot.is_available,
        ))
    await db.commit()
    return await get_box_schedule(box_id, current_user, db)
