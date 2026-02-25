"""Notification endpoints with preference management."""
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.core.database import get_db
from app.middleware.auth import get_current_user, require_workspace, CurrentUser
from app.models.notification import Notification
from app.models.user import User
from app.models.client import Client
from app.schemas.notification import (
    NotificationCreate, NotificationUpdate, NotificationResponse, NotificationList,
    NotificationMarkRead, NotificationMarkAllRead,
)

router = APIRouter()


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

@router.get("/", response_model=NotificationList)
async def list_notifications(
    category: Optional[str] = None,
    is_read: Optional[bool] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notifications for the current user."""
    query = select(Notification).where(Notification.user_id == current_user.id)
    
    if category:
        query = query.where(Notification.category == category)
    if is_read is not None:
        query = query.where(Notification.is_read == is_read)
    
    # Order by newest first
    query = query.order_by(Notification.created_at.desc())
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    # Count unread
    unread_query = select(func.count()).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    )
    unread_count = await db.scalar(unread_query) or 0
    
    # Apply pagination
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    return NotificationList(
        items=[NotificationResponse.model_validate(n) for n in notifications],
        total=total or 0,
        unread_count=unread_count,
        page=page,
        size=size,
    )


@router.get("/unread-count")
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get count of unread notifications."""
    count = await db.scalar(
        select(func.count()).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    )
    return {"unread_count": count or 0}


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
        .values(is_read=True, read_at=datetime.utcnow().isoformat())
    )
    await db.commit()
    return {"message": "Notifications marked as read"}


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
        .values(is_read=True, read_at=datetime.utcnow().isoformat())
    )
    
    if data.category:
        query = query.where(Notification.category == data.category)
    
    await db.execute(query)
    await db.commit()
    return {"message": "All notifications marked as read"}


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
        raise HTTPException(status_code=404, detail="Notification not found")
    
    await db.delete(notification)
    await db.commit()


# Notification preferences stored in users.preferences JSONB

@router.get("/preferences")
async def get_notification_preferences(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    prefs = (current_user.preferences or {}).get("notifications", {})
    defaults = {
        "email_booking_created": True,
        "email_booking_cancelled": True,
        "email_payment_received": True,
        "email_payment_failed": True,
        "email_new_message": True,
        "email_new_client": True,
        "email_form_submitted": True,
        "push_enabled": True,
    }
    return {**defaults, **prefs}


@router.patch("/preferences")
async def update_notification_preferences(
    data: dict,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.models.user import User
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    current_prefs = dict(user.preferences or {})
    notif_prefs = current_prefs.get("notifications", {})
    allowed_keys = {
        "email_booking_created", "email_booking_cancelled",
        "email_payment_received", "email_payment_failed",
        "email_new_message", "email_new_client",
        "email_form_submitted", "push_enabled",
    }
    for key, value in data.items():
        if key in allowed_keys and isinstance(value, bool):
            notif_prefs[key] = value

    current_prefs["notifications"] = notif_prefs
    user.preferences = current_prefs
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(user, "preferences")
    await db.commit()
    await db.refresh(user)
    return current_prefs.get("notifications", {})

