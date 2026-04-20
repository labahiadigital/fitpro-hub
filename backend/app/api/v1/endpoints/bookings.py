from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, delete as sql_delete
from pydantic import BaseModel

from app.core.database import get_db
from app.models.booking import Booking, BookingStatus, SessionType, SessionModality
from app.models.client import Client
from app.models.google_calendar import CalendarSyncMapping
from app.middleware.auth import require_workspace, require_staff, require_any_role, CurrentUser
from app.services.google_calendar import google_calendar_service
from app.services.notification_service import notify
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ GOOGLE CALENDAR SYNC HELPERS ============

async def sync_booking_to_calendars(
    booking: Booking,
    db: AsyncSession,
    organizer_id: Optional[UUID] = None,
    client_id: Optional[UUID] = None
):
    """
    Sincroniza un booking con Google Calendar de organizador y cliente.
    Se ejecuta en background para no bloquear la respuesta.
    """
    # Obtener cliente si existe
    client = None
    if booking.client_id:
        result = await db.execute(
            select(Client).where(
                Client.id == booking.client_id,
                Client.workspace_id == booking.workspace_id,
            )
        )
        client = result.scalar_one_or_none()
    
    # Sincronizar al calendario del organizador
    if organizer_id:
        try:
            await google_calendar_service.sync_booking_to_google(
                booking=booking,
                user_id=organizer_id,
                db=db,
                client=client
            )
        except Exception as e:
            logger.warning("Error sincronizando a Google Calendar del organizador: %s", e)
    
    # Sincronizar al calendario del cliente (si tiene cuenta conectada)
    if client_id and client:
        try:
            await google_calendar_service.sync_booking_to_google(
                booking=booking,
                user_id=client_id,
                db=db,
                client=None  # No incluir al cliente como asistente en su propio calendario
            )
        except Exception as e:
            logger.warning("Error sincronizando a Google Calendar del cliente: %s", e)


async def delete_booking_from_calendars(
    booking_id: UUID,
    db: AsyncSession,
    organizer_id: Optional[UUID] = None,
    client_id: Optional[UUID] = None
):
    """
    Elimina un booking de Google Calendar del organizador y cliente.
    """
    # Eliminar del calendario del organizador
    if organizer_id:
        try:
            await google_calendar_service.delete_booking_from_google(
                booking_id=booking_id,
                user_id=organizer_id,
                db=db
            )
            logger.info("Booking %s eliminado de Google Calendar del organizador", booking_id)
        except Exception as e:
            logger.warning("Error eliminando de Google Calendar del organizador: %s", e)
    
    # Eliminar del calendario del cliente
    if client_id:
        try:
            await google_calendar_service.delete_booking_from_google(
                booking_id=booking_id,
                user_id=client_id,
                db=db
            )
            logger.info("Booking %s eliminado de Google Calendar del cliente", booking_id)
        except Exception as e:
            logger.warning("Error eliminando de Google Calendar del cliente: %s", e)


# ============ SCHEMAS ============

class LocationSchema(BaseModel):
    type: str = "in_person"
    address: Optional[str] = None
    online_link: Optional[str] = None


class BookingCreate(BaseModel):
    client_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    session_type: SessionType = SessionType.individual
    modality: SessionModality = SessionModality.in_person
    start_time: datetime
    end_time: datetime
    location: Optional[LocationSchema] = None
    capacity: int = 1
    is_recurring: bool = False
    recurrence_rule: Optional[dict] = None
    notes: Optional[str] = None


class BookingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[LocationSchema] = None
    status: Optional[BookingStatus] = None
    notes: Optional[str] = None


class BookingResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    organizer_id: Optional[UUID]
    client_id: Optional[UUID]
    title: str
    description: Optional[str]
    session_type: SessionType
    modality: SessionModality
    start_time: datetime
    end_time: datetime
    location: dict
    capacity: int
    current_attendees: int
    status: BookingStatus
    is_recurring: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


async def _get_client_user_id(db: AsyncSession, client_id: Optional[UUID]) -> Optional[UUID]:
    """Resolve a Client record's linked user_id (for in-app notifications)."""
    if not client_id:
        return None
    result = await db.execute(select(Client.user_id).where(Client.id == client_id))
    return result.scalar_one_or_none()


async def _notify_booking_parties(
    db: AsyncSession,
    booking: Booking,
    *,
    event: str,
    trainer_title: str,
    trainer_body: str,
    client_title: str,
    client_body: str,
    link: str = "/calendar",
):
    """Send in-app notifications to both trainer and client for a booking event.

    Each call to ``notify`` is self-contained (own commit + try/except),
    so failures never propagate to the caller.
    """
    start_str = booking.start_time.strftime("%d/%m/%Y %H:%M") if booking.start_time else ""

    if booking.organizer_id:
        await notify(
            db=db,
            event=event,
            user_id=booking.organizer_id,
            workspace_id=booking.workspace_id,
            title=trainer_title,
            body=trainer_body.replace("{time}", start_str),
            link=link,
            notification_type="booking",
        )

    client_user_id = await _get_client_user_id(db, booking.client_id)
    if client_user_id:
        await notify(
            db=db,
            event=event,
            user_id=client_user_id,
            workspace_id=booking.workspace_id,
            title=client_title,
            body=client_body.replace("{time}", start_str),
            link="/my-calendar",
            notification_type="booking",
        )


# ============ ENDPOINTS ============

@router.get("", response_model=List[BookingResponse])
async def list_bookings(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    client_id: Optional[UUID] = None,
    status: Optional[BookingStatus] = None,
    sync_calendar: bool = False,  # Opcional: forzar sincronización
    limit: int = Query(500, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar reservas del workspace con filtros opcionales.
    Si sync_calendar=true, sincroniza los bookings visibles con Google Calendar.
    """
    query = select(Booking).where(Booking.workspace_id == current_user.workspace_id)

    if current_user.is_client():
        client_row = await db.execute(
            select(Client.id).where(
                Client.user_id == current_user.id,
                Client.workspace_id == current_user.workspace_id,
            )
        )
        my_client_id = client_row.scalar_one_or_none()
        if not my_client_id:
            return []
        query = query.where(Booking.client_id == my_client_id)

    if not start_date:
        start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    if not end_date:
        end_date = start_date + timedelta(days=7)

    query = query.where(
        and_(
            Booking.start_time >= start_date,
            Booking.start_time <= end_date
        )
    )

    if client_id and not current_user.is_client():
        query = query.where(Booking.client_id == client_id)
    
    if status:
        query = query.where(Booking.status == status)
    
    query = query.order_by(Booking.start_time).limit(limit).offset(offset)

    result = await db.execute(query)
    bookings = result.scalars().all()
    
    # Sincronizar con Google Calendar si se solicita
    if sync_calendar and bookings:
        for booking in bookings:
            try:
                await sync_booking_to_calendars(
                    booking=booking,
                    db=db,
                    organizer_id=booking.organizer_id
                )
            except Exception as e:
                logger.warning("Error sincronizando booking %s: %s", booking.id, e)
    
    return bookings


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: BookingCreate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear una nueva reserva.
    """
    # Validate time
    if data.end_time <= data.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La hora de fin debe ser posterior a la hora de inicio"
        )
    
    # Check for conflicts
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.workspace_id == current_user.workspace_id,
                Booking.organizer_id == current_user.id,
                Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
                or_(
                    and_(
                        Booking.start_time <= data.start_time,
                        Booking.end_time > data.start_time
                    ),
                    and_(
                        Booking.start_time < data.end_time,
                        Booking.end_time >= data.end_time
                    ),
                    and_(
                        Booking.start_time >= data.start_time,
                        Booking.end_time <= data.end_time
                    )
                )
            )
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una reserva en ese horario"
        )
    
    # Verify client belongs to workspace if provided
    if data.client_id:
        client_check = await db.execute(
            select(Client.id).where(
                Client.id == data.client_id,
                Client.workspace_id == current_user.workspace_id,
            )
        )
        if not client_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente no encontrado en este workspace"
            )

    booking = Booking(
        workspace_id=current_user.workspace_id,
        organizer_id=current_user.id,
        client_id=data.client_id,
        title=data.title,
        description=data.description,
        session_type=data.session_type,
        modality=data.modality,
        start_time=data.start_time,
        end_time=data.end_time,
        location=data.location.model_dump() if data.location else {},
        capacity=data.capacity,
        is_recurring=data.is_recurring,
        recurrence_rule=data.recurrence_rule,
        notes=data.notes,
        status=BookingStatus.confirmed
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    
    # Sincronizar con Google Calendar en background
    await sync_booking_to_calendars(
        booking=booking,
        db=db,
        organizer_id=current_user.id,
        client_id=data.client_id
    )

    await _notify_booking_parties(
        db, booking,
        event="booking_created",
        trainer_title="Nueva reserva creada",
        trainer_body=f"{booking.title} — {{time}}",
        client_title="Nueva sesión programada",
        client_body=f"Tu entrenador ha programado una sesión el {{time}}",
    )

    return booking


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de una reserva.
    """
    result = await db.execute(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.workspace_id == current_user.workspace_id
        )
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva no encontrada"
        )

    if current_user.is_client():
        client_row = await db.execute(
            select(Client.id).where(
                Client.user_id == current_user.id,
                Client.workspace_id == current_user.workspace_id,
            )
        )
        my_client_id = client_row.scalar_one_or_none()
        if booking.client_id != my_client_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reserva no encontrada"
            )

    return booking


@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: UUID,
    data: BookingUpdate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar una reserva.
    """
    result = await db.execute(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.workspace_id == current_user.workspace_id
        )
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva no encontrada"
        )
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            if field == "location" and isinstance(value, dict):
                setattr(booking, field, value)
            else:
                setattr(booking, field, value)
    
    await db.commit()
    await db.refresh(booking)
    
    # Sincronizar cambios con Google Calendar
    await sync_booking_to_calendars(
        booking=booking,
        db=db,
        organizer_id=booking.organizer_id,
        client_id=booking.client_id
    )

    if data.status and data.status == BookingStatus.confirmed:
        await _notify_booking_parties(
            db, booking,
            event="booking_confirmed",
            trainer_title="Reserva confirmada",
            trainer_body=f"{booking.title} confirmada — {{time}}",
            client_title="Sesión confirmada",
            client_body=f"Tu sesión del {{time}} ha sido confirmada por tu entrenador",
        )
    else:
        await _notify_booking_parties(
            db, booking,
            event="booking_updated",
            trainer_title="Reserva modificada",
            trainer_body=f"{booking.title} ha sido actualizada — {{time}}",
            client_title="Sesión modificada",
            client_body=f"Tu sesión ha sido modificada. Nuevo horario: {{time}}",
        )

    return booking


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_booking(
    booking_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar una reserva permanentemente.
    También elimina el evento de Google Calendar si existe.
    """
    result = await db.execute(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.workspace_id == current_user.workspace_id
        )
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva no encontrada"
        )
    
    # Guardar IDs antes de eliminar
    organizer_id = booking.organizer_id
    client_id = booking.client_id
    
    # Eliminar de Google Calendar primero (esto también elimina los mappings)
    await delete_booking_from_calendars(
        booking_id=booking_id,
        db=db,
        organizer_id=organizer_id,
        client_id=client_id
    )
    
    # Eliminar cualquier mapping restante manualmente (por si quedaron sin eliminar)
    await db.execute(
        sql_delete(CalendarSyncMapping).where(CalendarSyncMapping.booking_id == booking_id)
    )
    
    # Eliminar el booking de la base de datos
    await db.delete(booking)
    await db.commit()
    
    logger.info("Booking %s eliminado permanentemente", booking_id)


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(require_any_role),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancelar una reserva (cambiar estado a cancelado).
    El evento se mantiene en Google Calendar pero marcado como cancelado.
    """
    result = await db.execute(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.workspace_id == current_user.workspace_id
        )
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva no encontrada"
        )
    
    # Check if user can cancel (staff or own booking)
    if not current_user.is_collaborator():
        # Client can only cancel their own bookings
        # booking.client_id references clients.id, so look up the client by user_id
        client_result = await db.execute(
            select(Client.id).where(
                Client.user_id == current_user.id,
                Client.workspace_id == current_user.workspace_id,
            )
        )
        client_row = client_result.scalar_one_or_none()
        if not client_row or booking.client_id != client_row:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para cancelar esta reserva"
            )
    
    booking.status = BookingStatus.cancelled
    await db.commit()
    await db.refresh(booking)
    
    # Sincronizar cancelación con Google Calendar (actualiza el evento como cancelado)
    await sync_booking_to_calendars(
        booking=booking,
        db=db,
        organizer_id=booking.organizer_id,
        client_id=booking.client_id
    )

    await _notify_booking_parties(
        db, booking,
        event="booking_cancelled",
        trainer_title="Reserva cancelada",
        trainer_body=f"{booking.title} ha sido cancelada",
        client_title="Sesión cancelada",
        client_body=f"Tu sesión del {{time}} ha sido cancelada",
    )

    return booking


@router.post("/{booking_id}/complete", response_model=BookingResponse)
async def complete_booking(
    booking_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Marcar una reserva como completada.
    """
    result = await db.execute(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.workspace_id == current_user.workspace_id
        )
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva no encontrada"
        )
    
    booking.status = BookingStatus.completed
    await db.commit()
    await db.refresh(booking)
    
    # Sincronizar estado con Google Calendar
    await sync_booking_to_calendars(
        booking=booking,
        db=db,
        organizer_id=booking.organizer_id,
        client_id=booking.client_id
    )

    await _notify_booking_parties(
        db, booking,
        event="booking_completed",
        trainer_title="Sesión completada",
        trainer_body=f"{booking.title} marcada como completada",
        client_title="Sesión completada",
        client_body=f"Tu sesión del {{time}} ha sido completada. ¡Buen trabajo!",
    )

    return booking

