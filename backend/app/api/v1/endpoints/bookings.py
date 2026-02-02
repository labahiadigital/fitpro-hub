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
            select(Client).where(Client.id == booking.client_id)
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
            print(f"[Bookings] Error sincronizando a Google Calendar del organizador: {e}")
    
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
            print(f"[Bookings] Error sincronizando a Google Calendar del cliente: {e}")


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
            print(f"[Bookings] Booking {booking_id} eliminado de Google Calendar del organizador")
        except Exception as e:
            print(f"[Bookings] Error eliminando de Google Calendar del organizador: {e}")
    
    # Eliminar del calendario del cliente
    if client_id:
        try:
            await google_calendar_service.delete_booking_from_google(
                booking_id=booking_id,
                user_id=client_id,
                db=db
            )
            print(f"[Bookings] Booking {booking_id} eliminado de Google Calendar del cliente")
        except Exception as e:
            print(f"[Bookings] Error eliminando de Google Calendar del cliente: {e}")


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


# ============ ENDPOINTS ============

@router.get("", response_model=List[BookingResponse])
async def list_bookings(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    client_id: Optional[UUID] = None,
    status: Optional[BookingStatus] = None,
    sync_calendar: bool = False,  # Opcional: forzar sincronización
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar reservas del workspace con filtros opcionales.
    Si sync_calendar=true, sincroniza los bookings visibles con Google Calendar.
    """
    query = select(Booking).where(Booking.workspace_id == current_user.workspace_id)
    
    # Default to current week if no dates provided
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
    
    if client_id:
        query = query.where(Booking.client_id == client_id)
    
    if status:
        query = query.where(Booking.status == status)
    
    query = query.order_by(Booking.start_time)
    
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
                print(f"[Bookings] Error sincronizando booking {booking.id}: {e}")
    
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
    
    print(f"[Bookings] Booking {booking_id} eliminado permanentemente")


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
        if booking.client_id != current_user.id:
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
    
    return booking

