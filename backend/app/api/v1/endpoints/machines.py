"""Machine (Maquinaria) CRUD endpoints."""
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel as BaseSchema

from app.core.database import get_db
from app.models.resource import Machine, Appointment, appointment_machines
from app.middleware.auth import require_staff, CurrentUser

router = APIRouter()


class MachineCreate(BaseSchema):
    name: str
    description: Optional[str] = None
    color_hex: str = "#8B5CF6"
    is_active: bool = True
    fixed_box_id: Optional[UUID] = None


class MachineUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    color_hex: Optional[str] = None
    is_active: Optional[bool] = None
    fixed_box_id: Optional[UUID] = None


class MachineResponse(BaseSchema):
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str] = None
    color_hex: str
    is_active: bool
    fixed_box_id: Optional[UUID] = None
    fixed_box_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


@router.get("", response_model=List[MachineResponse])
async def list_machines(
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Machine)
        .options(selectinload(Machine.fixed_box))
        .where(Machine.workspace_id == current_user.workspace_id)
        .order_by(Machine.name)
    )
    machines = result.scalars().all()
    return [
        MachineResponse(
            id=m.id,
            workspace_id=m.workspace_id,
            name=m.name,
            description=m.description,
            color_hex=m.color_hex,
            is_active=m.is_active,
            fixed_box_id=m.fixed_box_id,
            fixed_box_name=m.fixed_box.name if m.fixed_box else None,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )
        for m in machines
    ]


@router.post("", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
async def create_machine(
    data: MachineCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    machine = Machine(workspace_id=current_user.workspace_id, **data.model_dump())
    db.add(machine)
    await db.commit()
    await db.refresh(machine)
    return MachineResponse(
        id=machine.id, workspace_id=machine.workspace_id, name=machine.name,
        description=machine.description, color_hex=machine.color_hex,
        is_active=machine.is_active, fixed_box_id=machine.fixed_box_id,
        created_at=machine.created_at, updated_at=machine.updated_at,
    )


@router.get("/{machine_id}", response_model=MachineResponse)
async def get_machine(
    machine_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Machine)
        .options(selectinload(Machine.fixed_box))
        .where(Machine.id == machine_id, Machine.workspace_id == current_user.workspace_id)
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    return MachineResponse(
        id=machine.id, workspace_id=machine.workspace_id, name=machine.name,
        description=machine.description, color_hex=machine.color_hex,
        is_active=machine.is_active, fixed_box_id=machine.fixed_box_id,
        fixed_box_name=machine.fixed_box.name if machine.fixed_box else None,
        created_at=machine.created_at, updated_at=machine.updated_at,
    )


@router.put("/{machine_id}", response_model=MachineResponse)
async def update_machine(
    machine_id: UUID,
    data: MachineUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Machine).where(Machine.id == machine_id, Machine.workspace_id == current_user.workspace_id)
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(machine, k, v)
    machine.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(machine)
    return MachineResponse(
        id=machine.id, workspace_id=machine.workspace_id, name=machine.name,
        description=machine.description, color_hex=machine.color_hex,
        is_active=machine.is_active, fixed_box_id=machine.fixed_box_id,
        created_at=machine.created_at, updated_at=machine.updated_at,
    )


@router.delete("/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_machine(
    machine_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Machine).where(Machine.id == machine_id, Machine.workspace_id == current_user.workspace_id)
    )
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    await db.delete(machine)
    await db.commit()


@router.get("/{machine_id}/stats")
async def machine_stats(
    machine_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """OPTIMIZATION: 4 COUNTs secuenciales -> 1 query agregada."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    agg = (
        select(
            func.count(
                case(
                    (Appointment.start_time.between(today_start, today_end), Appointment.id)
                )
            ).label("today"),
            func.count(
                case(
                    (
                        and_(Appointment.start_time > now, Appointment.status != "cancelled"),
                        Appointment.id,
                    )
                )
            ).label("upcoming"),
            func.count(Appointment.id).label("total"),
            func.count(case((Appointment.status == "cancelled", Appointment.id))).label("cancelled"),
        )
        .select_from(Appointment)
        .join(appointment_machines, appointment_machines.c.appointment_id == Appointment.id)
        .where(
            appointment_machines.c.machine_id == machine_id,
            Appointment.workspace_id == current_user.workspace_id,
        )
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
