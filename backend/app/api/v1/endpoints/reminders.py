"""Reminder settings endpoints."""
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel

from app.core.database import get_db
from app.models.notification import ReminderSetting
from app.middleware.auth import require_workspace, require_staff, CurrentUser

router = APIRouter()


# ============ SCHEMAS ============

class ReminderCreate(BaseModel):
    user_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    reminder_type: str  # 'workout', 'nutrition', 'supplement', 'check_in', 'measurement'
    frequency_days: int = 15
    custom_message: Optional[str] = None


class ReminderUpdate(BaseModel):
    frequency_days: Optional[int] = None
    is_active: Optional[bool] = None
    custom_message: Optional[str] = None


class ReminderResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    user_id: Optional[UUID]
    client_id: Optional[UUID]
    reminder_type: str
    frequency_days: int
    last_sent: Optional[str]
    next_scheduled: str
    is_active: bool
    custom_message: Optional[str]
    created_at: str
    
    class Config:
        from_attributes = True


# ============ ENDPOINTS ============

@router.get("", response_model=List[ReminderResponse])
async def list_reminders(
    user_id: Optional[UUID] = None,
    client_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar recordatorios del workspace.
    """
    query = select(ReminderSetting).where(
        ReminderSetting.workspace_id == current_user.workspace_id
    )
    
    if user_id:
        query = query.where(ReminderSetting.user_id == user_id)
    
    if client_id:
        query = query.where(ReminderSetting.client_id == client_id)
    
    if is_active is not None:
        query = query.where(ReminderSetting.is_active == is_active)
    
    result = await db.execute(query.order_by(ReminderSetting.next_scheduled))
    return result.scalars().all()


@router.post("", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    data: ReminderCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo recordatorio recurrente.
    """
    # Validate that either user_id or client_id is provided
    if not data.user_id and not data.client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar user_id o client_id"
        )
    
    # Calculate next scheduled date
    now = datetime.utcnow()
    next_scheduled = now + timedelta(days=data.frequency_days)
    
    reminder = ReminderSetting(
        workspace_id=current_user.workspace_id,
        user_id=data.user_id,
        client_id=data.client_id,
        reminder_type=data.reminder_type,
        frequency_days=data.frequency_days,
        next_scheduled=next_scheduled.isoformat(),
        custom_message=data.custom_message,
        is_active=True
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.get("/{reminder_id}", response_model=ReminderResponse)
async def get_reminder(
    reminder_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de un recordatorio.
    """
    result = await db.execute(
        select(ReminderSetting).where(
            ReminderSetting.id == reminder_id,
            ReminderSetting.workspace_id == current_user.workspace_id
        )
    )
    reminder = result.scalar_one_or_none()
    
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recordatorio no encontrado"
        )
    
    return reminder


@router.put("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: UUID,
    data: ReminderUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar un recordatorio.
    """
    result = await db.execute(
        select(ReminderSetting).where(
            ReminderSetting.id == reminder_id,
            ReminderSetting.workspace_id == current_user.workspace_id
        )
    )
    reminder = result.scalar_one_or_none()
    
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recordatorio no encontrado"
        )
    
    # Update fields
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(reminder, field, value)
    
    # Recalculate next scheduled if frequency changed
    if data.frequency_days:
        if reminder.last_sent:
            last_sent_dt = datetime.fromisoformat(reminder.last_sent)
            next_scheduled = last_sent_dt + timedelta(days=data.frequency_days)
        else:
            next_scheduled = datetime.utcnow() + timedelta(days=data.frequency_days)
        reminder.next_scheduled = next_scheduled.isoformat()
    
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(
    reminder_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un recordatorio.
    """
    result = await db.execute(
        select(ReminderSetting).where(
            ReminderSetting.id == reminder_id,
            ReminderSetting.workspace_id == current_user.workspace_id
        )
    )
    reminder = result.scalar_one_or_none()
    
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recordatorio no encontrado"
        )
    
    await db.delete(reminder)
    await db.commit()


@router.post("/{reminder_id}/trigger", status_code=status.HTTP_200_OK)
async def trigger_reminder(
    reminder_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Enviar un recordatorio manualmente y actualizar la próxima fecha programada.
    """
    result = await db.execute(
        select(ReminderSetting).where(
            ReminderSetting.id == reminder_id,
            ReminderSetting.workspace_id == current_user.workspace_id
        )
    )
    reminder = result.scalar_one_or_none()
    
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recordatorio no encontrado"
        )
    
    # Update timestamps
    now = datetime.utcnow()
    reminder.last_sent = now.isoformat()
    reminder.next_scheduled = (now + timedelta(days=reminder.frequency_days)).isoformat()
    
    await db.commit()
    
    # Here you would trigger the actual notification
    # This could be done via Celery task or direct notification service call
    
    return {"message": "Recordatorio enviado", "next_scheduled": reminder.next_scheduled}
