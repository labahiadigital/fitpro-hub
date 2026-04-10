"""Appointment endpoints with triple-lock availability and auto-stock consumption."""
import logging
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel as BaseSchema

from app.core.database import get_db
from app.models.resource import (
    Appointment, Service, ServiceStaff, ServiceStockConsumption,
    Machine, Box, appointment_machines, service_machines,
)
from app.models.stock import StockItem, StockMovement
from app.models.client import Client
from app.api.deps import require_staff, CurrentUser

logger = logging.getLogger(__name__)
router = APIRouter()


class AppointmentCreate(BaseSchema):
    service_id: UUID
    staff_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    box_id: Optional[UUID] = None
    machine_ids: List[UUID] = []
    start_time: datetime
    end_time: Optional[datetime] = None
    notes: Optional[str] = None


class AppointmentUpdate(BaseSchema):
    staff_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    box_id: Optional[UUID] = None
    machine_ids: Optional[List[UUID]] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None


class StatusUpdate(BaseSchema):
    status: str


class AvailabilityCheck(BaseSchema):
    service_id: UUID
    start_time: datetime
    end_time: Optional[datetime] = None
    staff_id: Optional[UUID] = None
    box_id: Optional[UUID] = None


class AppointmentResponse(BaseSchema):
    id: UUID
    workspace_id: UUID
    service_id: Optional[UUID] = None
    service_name: Optional[str] = None
    service_color: Optional[str] = None
    staff_id: Optional[UUID] = None
    staff_name: Optional[str] = None
    client_id: Optional[UUID] = None
    client_name: Optional[str] = None
    box_id: Optional[UUID] = None
    box_name: Optional[str] = None
    box_color: Optional[str] = None
    machine_ids: List[UUID] = []
    start_time: datetime
    end_time: datetime
    status: str
    notes: Optional[str] = None
    created_at: datetime


def _build_response(appt: Appointment) -> AppointmentResponse:
    return AppointmentResponse(
        id=appt.id, workspace_id=appt.workspace_id,
        service_id=appt.service_id,
        service_name=appt.service.name if appt.service else None,
        service_color=appt.service.color_hex if appt.service else None,
        staff_id=appt.staff_id,
        staff_name=f"{appt.staff.first_name} {appt.staff.last_name}" if appt.staff else None,
        client_id=appt.client_id,
        client_name=f"{appt.client.first_name} {appt.client.last_name}" if appt.client else None,
        box_id=appt.box_id,
        box_name=appt.box.name if appt.box else None,
        box_color=appt.box.color_hex if appt.box else None,
        machine_ids=[m.id for m in appt.machines_used],
        start_time=appt.start_time, end_time=appt.end_time,
        status=appt.status, notes=appt.notes,
        created_at=appt.created_at,
    )


def _eager():
    return [
        selectinload(Appointment.service),
        selectinload(Appointment.staff),
        selectinload(Appointment.client),
        selectinload(Appointment.box),
        selectinload(Appointment.machines_used),
    ]


async def _check_overlap(db: AsyncSession, workspace_id: UUID, start: datetime, end: datetime,
                          staff_id: UUID | None, box_id: UUID | None, machine_ids: list[UUID],
                          exclude_id: UUID | None = None):
    """Triple-lock: check staff, box, and machine availability."""
    conflicts = []
    time_filter = and_(
        Appointment.workspace_id == workspace_id,
        Appointment.status.notin_(["cancelled"]),
        Appointment.start_time < end,
        Appointment.end_time > start,
    )
    if exclude_id:
        time_filter = and_(time_filter, Appointment.id != exclude_id)

    if staff_id:
        count = await db.scalar(
            select(func.count(Appointment.id)).where(time_filter, Appointment.staff_id == staff_id)
        )
        if count and count > 0:
            conflicts.append({"type": "staff", "id": str(staff_id), "message": "El profesional ya tiene una cita en ese horario"})

    if box_id:
        count = await db.scalar(
            select(func.count(Appointment.id)).where(time_filter, Appointment.box_id == box_id)
        )
        if count and count > 0:
            conflicts.append({"type": "box", "id": str(box_id), "message": "El box/consulta ya está ocupado en ese horario"})

    for mid in machine_ids:
        count = await db.scalar(
            select(func.count(Appointment.id))
            .select_from(Appointment)
            .join(appointment_machines, appointment_machines.c.appointment_id == Appointment.id)
            .where(time_filter, appointment_machines.c.machine_id == mid)
        )
        if count and count > 0:
            conflicts.append({"type": "machine", "id": str(mid), "message": f"La máquina está ocupada en ese horario"})

    # Anchor rule: if a machine has fixed_box_id, that box is also blocked
    if machine_ids:
        machines = (await db.execute(select(Machine).where(Machine.id.in_(machine_ids)))).scalars().all()
        for m in machines:
            if m.fixed_box_id and m.fixed_box_id != box_id:
                count = await db.scalar(
                    select(func.count(Appointment.id)).where(time_filter, Appointment.box_id == m.fixed_box_id)
                )
                if count and count > 0:
                    conflicts.append({
                        "type": "box_anchor",
                        "id": str(m.fixed_box_id),
                        "message": f"El box asociado a la máquina '{m.name}' está ocupado",
                    })

    return conflicts


@router.post("/check-availability")
async def check_availability(
    data: AvailabilityCheck,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    svc = await db.get(Service, data.service_id)
    if not svc:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    end_time = data.end_time or (data.start_time + timedelta(minutes=svc.duration_minutes))
    staff_id = data.staff_id
    box_id = data.box_id or svc.default_box_id

    # Get required machines from service
    machine_result = await db.execute(
        select(Machine.id).select_from(Machine)
        .join(service_machines, service_machines.c.machine_id == Machine.id)
        .where(service_machines.c.service_id == data.service_id)
    )
    machine_ids = [r[0] for r in machine_result.all()]

    # If no staff specified, pick primary from service
    if not staff_id:
        primary = await db.execute(
            select(ServiceStaff.user_id).where(
                ServiceStaff.service_id == data.service_id, ServiceStaff.is_primary == True
            )
        )
        row = primary.first()
        if row:
            staff_id = row[0]

    conflicts = await _check_overlap(db, current_user.workspace_id, data.start_time, end_time,
                                      staff_id, box_id, machine_ids)

    # Suggest alternatives for staff conflicts
    alternatives = []
    if any(c["type"] == "staff" for c in conflicts):
        alt_staff = await db.execute(
            select(ServiceStaff).where(
                ServiceStaff.service_id == data.service_id,
                ServiceStaff.user_id != staff_id,
            ).options(selectinload(ServiceStaff.user))
        )
        for sa in alt_staff.scalars().all():
            sa_conflicts = await _check_overlap(db, current_user.workspace_id, data.start_time, end_time,
                                                 sa.user_id, None, [])
            if not sa_conflicts:
                alternatives.append({
                    "user_id": str(sa.user_id),
                    "name": f"{sa.user.first_name} {sa.user.last_name}" if sa.user else "—",
                    "is_primary": sa.is_primary,
                })

    return {
        "available": len(conflicts) == 0,
        "conflicts": conflicts,
        "alternatives": alternatives,
        "suggested_end_time": end_time.isoformat(),
    }


@router.get("")
async def list_appointments(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    staff_id: Optional[UUID] = None,
    box_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    query = select(Appointment).options(*_eager()).where(
        Appointment.workspace_id == current_user.workspace_id
    )
    if start_date:
        query = query.where(Appointment.start_time >= start_date)
    if end_date:
        query = query.where(Appointment.end_time <= end_date)
    if staff_id:
        query = query.where(Appointment.staff_id == staff_id)
    if box_id:
        query = query.where(Appointment.box_id == box_id)
    if status_filter:
        query = query.where(Appointment.status == status_filter)

    query = query.order_by(Appointment.start_time)
    result = await db.execute(query)
    return [_build_response(a) for a in result.scalars().unique().all()]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_appointment(
    data: AppointmentCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    svc = await db.get(Service, data.service_id)
    if not svc:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    end_time = data.end_time or (data.start_time + timedelta(minutes=svc.duration_minutes))
    box_id = data.box_id or svc.default_box_id

    # Resolve machines: explicit or from service defaults
    machine_ids = data.machine_ids
    if not machine_ids:
        mr = await db.execute(
            select(Machine.id).select_from(Machine)
            .join(service_machines, service_machines.c.machine_id == Machine.id)
            .where(service_machines.c.service_id == data.service_id)
        )
        machine_ids = [r[0] for r in mr.all()]

    # Anchor: if machines have fixed_box_id, use that box
    if machine_ids:
        machines = (await db.execute(select(Machine).where(Machine.id.in_(machine_ids)))).scalars().all()
        for m in machines:
            if m.fixed_box_id and not box_id:
                box_id = m.fixed_box_id
                break

    conflicts = await _check_overlap(db, current_user.workspace_id, data.start_time, end_time,
                                      data.staff_id, box_id, machine_ids)
    if conflicts:
        raise HTTPException(status_code=409, detail={"message": "Conflictos de disponibilidad", "conflicts": conflicts})

    appt = Appointment(
        workspace_id=current_user.workspace_id,
        service_id=data.service_id,
        staff_id=data.staff_id,
        client_id=data.client_id,
        box_id=box_id,
        start_time=data.start_time,
        end_time=end_time,
        status="pending",
        notes=data.notes,
    )
    db.add(appt)
    await db.flush()

    if machine_ids:
        for mid in machine_ids:
            await db.execute(appointment_machines.insert().values(appointment_id=appt.id, machine_id=mid))

    await db.commit()

    result = await db.execute(select(Appointment).options(*_eager()).where(Appointment.id == appt.id))
    return _build_response(result.scalar_one())


@router.patch("/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: UUID,
    data: StatusUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment).options(*_eager())
        .where(Appointment.id == appointment_id, Appointment.workspace_id == current_user.workspace_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    old_status = appt.status
    appt.status = data.status
    appt.updated_at = datetime.now(timezone.utc)

    # Auto-stock consumption on "attended"
    if data.status == "attended" and old_status != "attended" and appt.service_id:
        consumptions = (await db.execute(
            select(ServiceStockConsumption)
            .options(selectinload(ServiceStockConsumption.stock_item))
            .where(ServiceStockConsumption.service_id == appt.service_id)
        )).scalars().all()

        for sc in consumptions:
            item = sc.stock_item
            if not item:
                continue
            prev = float(item.current_stock)
            new_val = prev - float(sc.quantity)
            item.current_stock = Decimal(str(max(new_val, 0)))
            db.add(StockMovement(
                workspace_id=current_user.workspace_id,
                item_id=item.id,
                movement_type="exit",
                quantity=sc.quantity,
                previous_stock=Decimal(str(prev)),
                new_stock=item.current_stock,
                reason=f"Consumo automático cita #{str(appt.id)[:8]}",
                created_by=current_user.id,
            ))
            logger.info(f"Auto-stock: {item.name} {prev} -> {item.current_stock} (cita {appt.id})")

    await db.commit()
    await db.refresh(appt)
    return _build_response(appt)


@router.put("/{appointment_id}")
async def update_appointment(
    appointment_id: UUID,
    data: AppointmentUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment).options(*_eager())
        .where(Appointment.id == appointment_id, Appointment.workspace_id == current_user.workspace_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    for k, v in data.model_dump(exclude_unset=True, exclude={"machine_ids"}).items():
        setattr(appt, k, v)

    if data.machine_ids is not None:
        await db.execute(appointment_machines.delete().where(appointment_machines.c.appointment_id == appt.id))
        for mid in data.machine_ids:
            await db.execute(appointment_machines.insert().values(appointment_id=appt.id, machine_id=mid))

    appt.updated_at = datetime.now(timezone.utc)
    await db.commit()

    result2 = await db.execute(select(Appointment).options(*_eager()).where(Appointment.id == appt.id))
    return _build_response(result2.scalar_one())


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id, Appointment.workspace_id == current_user.workspace_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    await db.delete(appt)
    await db.commit()


@router.get("/stats/{resource_type}/{resource_id}")
async def resource_stats(
    resource_type: str,
    resource_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    ws = Appointment.workspace_id == current_user.workspace_id

    if resource_type == "staff":
        base_filter = and_(ws, Appointment.staff_id == resource_id)
    elif resource_type == "box":
        base_filter = and_(ws, Appointment.box_id == resource_id)
    elif resource_type == "machine":
        base_filter = and_(
            ws,
            Appointment.id.in_(
                select(appointment_machines.c.appointment_id)
                .where(appointment_machines.c.machine_id == resource_id)
            )
        )
    else:
        raise HTTPException(status_code=400, detail="Tipo de recurso inválido (staff, box, machine)")

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    base = select(func.count(Appointment.id)).where(base_filter)
    today_count = await db.scalar(base.where(Appointment.start_time.between(today_start, today_end))) or 0
    upcoming = await db.scalar(base.where(Appointment.start_time > now, Appointment.status != "cancelled")) or 0
    total = await db.scalar(base) or 0
    cancelled = await db.scalar(base.where(Appointment.status == "cancelled")) or 0
    attended = await db.scalar(base.where(Appointment.status == "attended")) or 0
    cancel_rate = round((cancelled / total * 100), 1) if total > 0 else 0
    occupation_rate = round((attended / total * 100), 1) if total > 0 else 0

    return {
        "today": today_count,
        "upcoming": upcoming,
        "total": total,
        "cancel_rate": cancel_rate,
        "occupation_rate": occupation_rate,
    }
