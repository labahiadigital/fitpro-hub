"""Notification endpoints with preference management."""
import asyncio
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm.attributes import flag_modified

from app.core.database import get_db
from app.core import ttl_cache
from app.middleware.auth import get_current_user, require_workspace, CurrentUser
from app.models.notification import Notification
from app.models.user import User
from app.models.client import Client
from app.schemas.notification import (
    NotificationResponse, NotificationList,
    NotificationMarkRead, NotificationMarkAllRead,
)

router = APIRouter()


def _unread_cache_key(user_id) -> str:
    return f"notif:unread:{user_id}"


# ==================== Dashboard Alerts ====================

@router.get("/alerts")
async def get_dashboard_alerts(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_workspace),
):
    """
    Get dashboard alerts for the current workspace.
    Returns alerts about inactive clients, upcoming renewals, etc.
    """
    alerts = []
    workspace_id = current_user.workspace_id
    
    # Get inactive clients (no activity in last 14 days)
    fourteen_days_ago = datetime.utcnow() - timedelta(days=14)
    result = await db.execute(
        select(Client).where(
            Client.workspace_id == workspace_id,
            Client.is_active == True,
            Client.updated_at < fourteen_days_ago
        ).limit(5)
    )
    inactive_clients = result.scalars().all()
    
    for client in inactive_clients:
        alerts.append({
            "id": f"inactive-{client.id}",
            "type": "inactive_client",
            "title": f"{client.first_name} {client.last_name} inactivo",
            "description": f"Sin actividad en los últimos 14 días",
            "severity": "warning",
            "client_id": str(client.id),
            "created_at": datetime.utcnow().isoformat(),
        })
    
    # TODO: Add more alert types as needed:
    # - Payment due alerts (when payment module is ready)
    # - Subscription renewal alerts
    # - Form pending alerts
    
    return alerts


# ==================== Notifications ====================

@router.get("", response_model=NotificationList)
async def list_notifications(
    category: Optional[str] = None,
    is_read: Optional[bool] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notifications for the current user."""
    base_filters = [Notification.user_id == current_user.id]
    if category:
        base_filters.append(Notification.type == category)
    if is_read is not None:
        base_filters.append(Notification.is_read == is_read)

    # OPTIMIZATION: paginate items + run total/unread aggregates in parallel.
    # total & unread use a single SUM(CASE ...) row instead of 2 COUNT() queries
    # to halve the round-trips to Supabase.
    items_query = (
        select(Notification)
        .where(*base_filters)
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    total_query = select(func.count(Notification.id)).where(*base_filters)
    unread_query = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    )

    # NOTE: sequential because AsyncSession forbids concurrent ops (SQLAlchemy 2.0.46+).
    items_result = await db.execute(items_query)
    total = await db.scalar(total_query)
    unread_count = await db.scalar(unread_query)
    notifications = items_result.scalars().all()
    total = total or 0
    unread_count = unread_count or 0
    ttl_cache.set(_unread_cache_key(current_user.id), int(unread_count), ttl=20.0)

    return NotificationList(
        items=[NotificationResponse.model_validate(n) for n in notifications],
        total=total,
        unread_count=unread_count,
        page=page,
        size=size,
    )


@router.get("/unread-count")
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get count of unread notifications (cached for 5s to tame UI polling)."""
    cache_key = _unread_cache_key(current_user.id)
    cached = ttl_cache.get(cache_key)
    if cached is not None:
        return {"unread_count": cached}

    count = await db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    ) or 0
    ttl_cache.set(cache_key, int(count), ttl=20.0)
    return {"unread_count": count}


@router.post("/mark-read", status_code=status.HTTP_200_OK)
async def mark_notifications_read(
    data: NotificationMarkRead,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark specific notifications as read."""
    await db.execute(
        update(Notification)
        .where(
            Notification.id.in_(data.notification_ids),
            Notification.user_id == current_user.id,
        )
        .values(is_read=True, read_at=datetime.utcnow())
    )
    await db.commit()
    ttl_cache.invalidate(_unread_cache_key(current_user.id))
    return {"message": "Notificaciones marcadas como leídas"}


@router.post("/mark-all-read", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    data: NotificationMarkAllRead,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read."""
    query = (
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .values(is_read=True, read_at=datetime.utcnow())
    )
    
    if data.type:
        query = query.where(Notification.type == data.type)
    
    await db.execute(query)
    await db.commit()
    ttl_cache.invalidate(_unread_cache_key(current_user.id))
    return {"message": "Todas las notificaciones marcadas como leídas"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    
    await db.delete(notification)
    await db.commit()
    ttl_cache.invalidate(_unread_cache_key(current_user.id))


# ---------------------------------------------------------------------------
# Notification preferences stored in users.preferences JSONB
# ---------------------------------------------------------------------------
# Each event has two independent channels: email and in_app (bell icon).
# Structure: { "notifications": { "booking_created": { "email": true, "in_app": true }, ... } }
# ---------------------------------------------------------------------------

from pydantic import BaseModel as _BaseModel

NOTIFICATION_EVENTS = [
    # Reservas y citas
    "booking_created",
    "booking_confirmed",
    "booking_updated",
    "booking_cancelled",
    "booking_completed",
    "booking_modified",
    "booking_reminder",
    "booking_requested",
    "booking_cancelled_by_client",
    "booking_modified_by_client",
    # Seguimiento y progreso
    "progress_registered",
    "milestone_reached",
    "weekly_comparison",
    # Entrenamientos y nutricion
    "meal_reminder",
    "workout_reminder",
    "supplement_alert",
    "plan_updated",
    "plan_assigned",
    "program_assigned",
    # Tareas
    "task_created",
    "task_assigned",
    "task_due",
    # Pagos y facturas
    "payment_received",
    "payment_failed",
    "payment_invoice",
    # Comunicaciones
    "new_message",
    "new_client",
    "promotion",
    # Documentos y formularios
    "form_pending",
    "consent_pending",
    "survey_pending",
    "form_submitted",
    # Stock
    "low_stock",
    # Automatizaciones
    "automation_completed",
    # Fichaje
    "clock_in_reminder",
    "clock_event",
    "clock_missed",
    # Legacy
    "progress_milestone",
]

_DEFAULT_CHANNELS = {"email": True, "in_app": True}


def _full_defaults() -> dict:
    return {event: dict(_DEFAULT_CHANNELS) for event in NOTIFICATION_EVENTS}


class ChannelPreference(_BaseModel):
    email: Optional[bool] = None
    in_app: Optional[bool] = None


class NotificationPreferencesUpdate(_BaseModel):
    booking_created: Optional[ChannelPreference] = None
    booking_confirmed: Optional[ChannelPreference] = None
    booking_updated: Optional[ChannelPreference] = None
    booking_cancelled: Optional[ChannelPreference] = None
    booking_completed: Optional[ChannelPreference] = None
    booking_modified: Optional[ChannelPreference] = None
    booking_reminder: Optional[ChannelPreference] = None
    booking_requested: Optional[ChannelPreference] = None
    booking_cancelled_by_client: Optional[ChannelPreference] = None
    booking_modified_by_client: Optional[ChannelPreference] = None
    progress_registered: Optional[ChannelPreference] = None
    milestone_reached: Optional[ChannelPreference] = None
    weekly_comparison: Optional[ChannelPreference] = None
    meal_reminder: Optional[ChannelPreference] = None
    workout_reminder: Optional[ChannelPreference] = None
    supplement_alert: Optional[ChannelPreference] = None
    plan_updated: Optional[ChannelPreference] = None
    plan_assigned: Optional[ChannelPreference] = None
    program_assigned: Optional[ChannelPreference] = None
    task_created: Optional[ChannelPreference] = None
    task_assigned: Optional[ChannelPreference] = None
    task_due: Optional[ChannelPreference] = None
    payment_received: Optional[ChannelPreference] = None
    payment_failed: Optional[ChannelPreference] = None
    payment_invoice: Optional[ChannelPreference] = None
    new_message: Optional[ChannelPreference] = None
    new_client: Optional[ChannelPreference] = None
    promotion: Optional[ChannelPreference] = None
    form_pending: Optional[ChannelPreference] = None
    consent_pending: Optional[ChannelPreference] = None
    survey_pending: Optional[ChannelPreference] = None
    form_submitted: Optional[ChannelPreference] = None
    low_stock: Optional[ChannelPreference] = None
    automation_completed: Optional[ChannelPreference] = None
    clock_in_reminder: Optional[ChannelPreference] = None
    clock_event: Optional[ChannelPreference] = None
    clock_missed: Optional[ChannelPreference] = None
    progress_milestone: Optional[ChannelPreference] = None


@router.get("/preferences")
async def get_notification_preferences(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stored = (current_user.user.preferences or {}).get("notifications", {})
    defaults = _full_defaults()

    if isinstance(stored, dict):
        for event, channels in stored.items():
            if event in defaults and isinstance(channels, dict):
                defaults[event].update(channels)
            elif event.startswith("email_") and isinstance(channels, bool):
                short = event.replace("email_", "", 1)
                if short in defaults:
                    defaults[short]["email"] = channels

    return defaults


@router.patch("/preferences")
async def update_notification_preferences(
    data: NotificationPreferencesUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    current_prefs = dict(user.preferences or {})
    notif_prefs: dict = current_prefs.get("notifications", {})

    if not isinstance(notif_prefs, dict) or any(
        not isinstance(v, dict) for v in notif_prefs.values() if isinstance(v, dict)
    ):
        notif_prefs = _full_defaults()

    for event_name in NOTIFICATION_EVENTS:
        channel_update = getattr(data, event_name, None)
        if channel_update is None:
            continue
        existing = notif_prefs.get(event_name, dict(_DEFAULT_CHANNELS))
        patch = channel_update.model_dump(exclude_unset=True)
        existing.update(patch)
        notif_prefs[event_name] = existing

    current_prefs["notifications"] = notif_prefs
    user.preferences = current_prefs
    flag_modified(user, "preferences")
    await db.commit()
    await db.refresh(user)
    return current_prefs.get("notifications", {})

