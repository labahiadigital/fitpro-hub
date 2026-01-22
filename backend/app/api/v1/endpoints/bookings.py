from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from pydantic import BaseModel

from app.core.database import get_db
from app.models.booking import Booking, BookingStatus, SessionType, SessionModality
from app.middleware.auth import require_workspace, require_staff, require_any_role, CurrentUser

router = APIRouter()


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
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar reservas del workspace con filtros opcionales.
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
    return result.scalars().all()


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: BookingCreate,
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
    
    return booking


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_booking(
    booking_id: UUID,
    current_user: CurrentUser = Depends(require_any_role),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancelar una reserva.
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


@router.post("/{booking_id}/complete", response_model=BookingResponse)
async def complete_booking(
    booking_id: UUID,
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
    
    return booking

