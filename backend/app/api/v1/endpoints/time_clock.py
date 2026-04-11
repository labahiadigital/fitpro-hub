"""Time Clock endpoints – staff attendance, leave requests, holidays."""
import csv
import io
from datetime import date, datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel as BaseSchema
from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_staff, CurrentUser
from app.models.time_clock import LeaveRequest, PublicHoliday, TimeRecord
from app.models.user import User

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class ClockInRequest(BaseSchema):
    user_id: Optional[UUID] = None
    notes: Optional[str] = None

class ClockOutRequest(BaseSchema):
    user_id: Optional[UUID] = None
    notes: Optional[str] = None

class PauseRequest(BaseSchema):
    user_id: Optional[UUID] = None

class TimeRecordUpdate(BaseSchema):
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    notes: Optional[str] = None

class TimeRecordResponse(BaseSchema):
    id: UUID
    workspace_id: UUID
    user_id: UUID
    user_name: Optional[str] = None
    clock_in: datetime
    clock_out: Optional[datetime] = None
    pauses: Optional[list] = None
    net_minutes: Optional[int] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class ClockStatusResponse(BaseSchema):
    is_clocked_in: bool
    record_id: Optional[UUID] = None
    clock_in: Optional[datetime] = None
    is_paused: bool = False
    pause_start: Optional[datetime] = None
    net_minutes_today: int = 0

class LeaveRequestCreate(BaseSchema):
    leave_type: str
    start_date: date
    end_date: date
    notes: Optional[str] = None

class LeaveRequestResponse(BaseSchema):
    id: UUID
    workspace_id: UUID
    user_id: UUID
    user_name: Optional[str] = None
    leave_type: str
    start_date: date
    end_date: date
    notes: Optional[str] = None
    status: str
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class HolidayCreate(BaseSchema):
    date: date
    name: str

class HolidayResponse(BaseSchema):
    id: UUID
    workspace_id: UUID
    date: date
    name: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _resolve_user_id(current_user: CurrentUser, requested_id: Optional[UUID]) -> UUID:
    if requested_id and requested_id != current_user.id:
        if current_user.role != "owner":
            raise HTTPException(403, "Solo el propietario puede fichar por otros usuarios")
        return requested_id
    return current_user.id


def _compute_net_minutes(record: TimeRecord) -> int:
    end = record.clock_out or datetime.now(timezone.utc)
    total_seconds = (end - record.clock_in).total_seconds()
    pause_seconds = 0
    for p in (record.pauses or []):
        p_start = datetime.fromisoformat(p["start"]) if isinstance(p["start"], str) else p["start"]
        p_end_raw = p.get("end")
        p_end = (datetime.fromisoformat(p_end_raw) if isinstance(p_end_raw, str) else p_end_raw) if p_end_raw else datetime.now(timezone.utc)
        pause_seconds += (p_end - p_start).total_seconds()
    return max(0, int((total_seconds - pause_seconds) / 60))


async def _user_name(db: AsyncSession, user_id: UUID) -> str:
    result = await db.execute(select(User.full_name).where(User.id == user_id))
    return result.scalar_one_or_none() or "Usuario"


# ── Clock In / Out / Pause ───────────────────────────────────────────────────

@router.get("/status", response_model=ClockStatusResponse)
async def clock_status(
    user_id: Optional[UUID] = Query(None),
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    uid = _resolve_user_id(current_user, user_id)
    result = await db.execute(
        select(TimeRecord)
        .where(TimeRecord.workspace_id == current_user.workspace_id, TimeRecord.user_id == uid, TimeRecord.status == "active")
        .order_by(desc(TimeRecord.clock_in))
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if not record:
        return ClockStatusResponse(is_clocked_in=False, net_minutes_today=0)

    pauses = record.pauses or []
    is_paused = len(pauses) > 0 and pauses[-1].get("end") is None
    pause_start = None
    if is_paused:
        raw = pauses[-1]["start"]
        pause_start = datetime.fromisoformat(raw) if isinstance(raw, str) else raw

    return ClockStatusResponse(
        is_clocked_in=True,
        record_id=record.id,
        clock_in=record.clock_in,
        is_paused=is_paused,
        pause_start=pause_start,
        net_minutes_today=_compute_net_minutes(record),
    )


@router.post("/clock-in", response_model=TimeRecordResponse)
async def clock_in(
    data: ClockInRequest,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    uid = _resolve_user_id(current_user, data.user_id)
    existing = await db.execute(
        select(TimeRecord).where(
            TimeRecord.workspace_id == current_user.workspace_id,
            TimeRecord.user_id == uid,
            TimeRecord.status == "active",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Ya hay un fichaje activo. Ficha la salida primero.")

    record = TimeRecord(
        workspace_id=current_user.workspace_id,
        user_id=uid,
        clock_in=datetime.now(timezone.utc),
        pauses=[],
        status="active",
        notes=data.notes,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    resp = TimeRecordResponse.model_validate(record)
    resp.user_name = await _user_name(db, uid)
    return resp


@router.post("/clock-out", response_model=TimeRecordResponse)
async def clock_out(
    data: ClockOutRequest,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    uid = _resolve_user_id(current_user, data.user_id)
    result = await db.execute(
        select(TimeRecord).where(
            TimeRecord.workspace_id == current_user.workspace_id,
            TimeRecord.user_id == uid,
            TimeRecord.status == "active",
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(400, "No hay fichaje activo.")

    pauses = record.pauses or []
    if pauses and pauses[-1].get("end") is None:
        pauses[-1]["end"] = datetime.now(timezone.utc).isoformat()
        record.pauses = pauses

    record.clock_out = datetime.now(timezone.utc)
    record.status = "completed"
    record.net_minutes = _compute_net_minutes(record)
    if data.notes:
        record.notes = data.notes
    await db.commit()
    await db.refresh(record)
    resp = TimeRecordResponse.model_validate(record)
    resp.user_name = await _user_name(db, uid)
    return resp


@router.post("/pause", response_model=ClockStatusResponse)
async def toggle_pause(
    data: PauseRequest,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    uid = _resolve_user_id(current_user, data.user_id)
    result = await db.execute(
        select(TimeRecord).where(
            TimeRecord.workspace_id == current_user.workspace_id,
            TimeRecord.user_id == uid,
            TimeRecord.status == "active",
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(400, "No hay fichaje activo.")

    pauses = list(record.pauses or [])
    now_iso = datetime.now(timezone.utc).isoformat()

    if pauses and pauses[-1].get("end") is None:
        pauses[-1]["end"] = now_iso
    else:
        pauses.append({"start": now_iso, "end": None})

    record.pauses = pauses
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(record, "pauses")
    await db.commit()
    await db.refresh(record)

    is_paused = pauses and pauses[-1].get("end") is None
    return ClockStatusResponse(
        is_clocked_in=True,
        record_id=record.id,
        clock_in=record.clock_in,
        is_paused=is_paused,
        pause_start=datetime.fromisoformat(pauses[-1]["start"]) if is_paused else None,
        net_minutes_today=_compute_net_minutes(record),
    )


# ── Records CRUD ─────────────────────────────────────────────────────────────

@router.get("/records", response_model=List[TimeRecordResponse])
async def list_records(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_id: Optional[UUID] = Query(None),
    limit: int = Query(100, le=500),
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    q = select(TimeRecord).where(TimeRecord.workspace_id == current_user.workspace_id)
    if user_id:
        q = q.where(TimeRecord.user_id == user_id)
    if start_date:
        q = q.where(func.date(TimeRecord.clock_in) >= start_date)
    if end_date:
        q = q.where(func.date(TimeRecord.clock_in) <= end_date)
    q = q.order_by(desc(TimeRecord.clock_in)).limit(limit)
    result = await db.execute(q)
    records = result.scalars().all()

    user_ids = {r.user_id for r in records}
    names: dict[UUID, str] = {}
    if user_ids:
        rows = await db.execute(select(User.id, User.full_name).where(User.id.in_(user_ids)))
        names = {uid: name or "Usuario" for uid, name in rows.all()}

    out = []
    for r in records:
        resp = TimeRecordResponse.model_validate(r)
        resp.user_name = names.get(r.user_id, "Usuario")
        out.append(resp)
    return out


@router.put("/records/{record_id}", response_model=TimeRecordResponse)
async def update_record(
    record_id: UUID,
    data: TimeRecordUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TimeRecord).where(TimeRecord.id == record_id, TimeRecord.workspace_id == current_user.workspace_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Registro no encontrado")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(record, k, v)
    if record.clock_out:
        record.net_minutes = _compute_net_minutes(record)
    record.status = "edited"
    record.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(record)
    resp = TimeRecordResponse.model_validate(record)
    resp.user_name = await _user_name(db, record.user_id)
    return resp


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(
    record_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TimeRecord).where(TimeRecord.id == record_id, TimeRecord.workspace_id == current_user.workspace_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Registro no encontrado")
    await db.delete(record)
    await db.commit()


@router.get("/records/export")
async def export_records_csv(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_id: Optional[UUID] = Query(None),
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    q = select(TimeRecord).where(TimeRecord.workspace_id == current_user.workspace_id)
    if user_id:
        q = q.where(TimeRecord.user_id == user_id)
    if start_date:
        q = q.where(func.date(TimeRecord.clock_in) >= start_date)
    if end_date:
        q = q.where(func.date(TimeRecord.clock_in) <= end_date)
    q = q.order_by(desc(TimeRecord.clock_in))
    result = await db.execute(q)
    records = result.scalars().all()

    user_ids = {r.user_id for r in records}
    names: dict[UUID, str] = {}
    if user_ids:
        rows = await db.execute(select(User.id, User.full_name).where(User.id.in_(user_ids)))
        names = {uid: name or "Usuario" for uid, name in rows.all()}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Usuario", "Fecha Entrada", "Entrada", "Fecha Salida", "Salida", "Pausas", "Tiempo Neto (min)", "Estado", "Notas"])
    for r in records:
        pause_count = len(r.pauses or [])
        writer.writerow([
            names.get(r.user_id, ""),
            r.clock_in.strftime("%Y-%m-%d") if r.clock_in else "",
            r.clock_in.strftime("%H:%M:%S") if r.clock_in else "",
            r.clock_out.strftime("%Y-%m-%d") if r.clock_out else "",
            r.clock_out.strftime("%H:%M:%S") if r.clock_out else "",
            pause_count,
            r.net_minutes or "",
            r.status,
            r.notes or "",
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=registros_horarios.csv"},
    )


# ── Leave Requests ───────────────────────────────────────────────────────────

@router.post("/leave-requests", response_model=LeaveRequestResponse, status_code=201)
async def create_leave_request(
    data: LeaveRequestCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    req = LeaveRequest(
        workspace_id=current_user.workspace_id,
        user_id=current_user.id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        notes=data.notes,
        status="pendiente",
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    resp = LeaveRequestResponse.model_validate(req)
    resp.user_name = await _user_name(db, current_user.id)
    return resp


@router.get("/leave-requests", response_model=List[LeaveRequestResponse])
async def list_leave_requests(
    leave_status: Optional[str] = Query(None, alias="status"),
    leave_type: Optional[str] = Query(None, alias="type"),
    user_id: Optional[UUID] = Query(None),
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    q = select(LeaveRequest).where(LeaveRequest.workspace_id == current_user.workspace_id)
    if leave_status:
        q = q.where(LeaveRequest.status == leave_status)
    if leave_type:
        q = q.where(LeaveRequest.leave_type == leave_type)
    if user_id:
        q = q.where(LeaveRequest.user_id == user_id)
    q = q.order_by(desc(LeaveRequest.created_at))
    result = await db.execute(q)
    items = result.scalars().all()

    user_ids = {r.user_id for r in items}
    names: dict[UUID, str] = {}
    if user_ids:
        rows = await db.execute(select(User.id, User.full_name).where(User.id.in_(user_ids)))
        names = {uid: name or "Usuario" for uid, name in rows.all()}

    out = []
    for r in items:
        resp = LeaveRequestResponse.model_validate(r)
        resp.user_name = names.get(r.user_id, "Usuario")
        out.append(resp)
    return out


@router.put("/leave-requests/{request_id}/approve", response_model=LeaveRequestResponse)
async def approve_leave(
    request_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LeaveRequest).where(LeaveRequest.id == request_id, LeaveRequest.workspace_id == current_user.workspace_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Solicitud no encontrada")
    req.status = "aprobada"
    req.approved_by = current_user.id
    req.approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(req)
    resp = LeaveRequestResponse.model_validate(req)
    resp.user_name = await _user_name(db, req.user_id)
    return resp


@router.put("/leave-requests/{request_id}/reject", response_model=LeaveRequestResponse)
async def reject_leave(
    request_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LeaveRequest).where(LeaveRequest.id == request_id, LeaveRequest.workspace_id == current_user.workspace_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Solicitud no encontrada")
    req.status = "rechazada"
    req.approved_by = current_user.id
    req.approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(req)
    resp = LeaveRequestResponse.model_validate(req)
    resp.user_name = await _user_name(db, req.user_id)
    return resp


# ── Public Holidays ──────────────────────────────────────────────────────────

@router.get("/holidays", response_model=List[HolidayResponse])
async def list_holidays(
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PublicHoliday)
        .where(PublicHoliday.workspace_id == current_user.workspace_id)
        .order_by(PublicHoliday.date)
    )
    return result.scalars().all()


@router.post("/holidays", response_model=HolidayResponse, status_code=201)
async def create_holiday(
    data: HolidayCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    holiday = PublicHoliday(
        workspace_id=current_user.workspace_id,
        date=data.date,
        name=data.name,
    )
    db.add(holiday)
    await db.commit()
    await db.refresh(holiday)
    return holiday


@router.delete("/holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holiday(
    holiday_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PublicHoliday).where(PublicHoliday.id == holiday_id, PublicHoliday.workspace_id == current_user.workspace_id)
    )
    holiday = result.scalar_one_or_none()
    if not holiday:
        raise HTTPException(404, "Festivo no encontrado")
    await db.delete(holiday)
    await db.commit()
