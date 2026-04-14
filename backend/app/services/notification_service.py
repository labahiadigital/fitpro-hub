"""Centralised notification dispatch.

Usage from any endpoint / service:

    from app.services.notification_service import notify

    await notify(
        db=db,
        event="booking_created",
        user_id=owner_user_id,
        workspace_id=workspace_id,
        title="Nueva reserva",
        body="Juan ha reservado una sesión el 15/03",
        email_subject="Nueva reserva en tu agenda",
        email_html="<p>...</p>",
        link="/calendar",
    )

The function reads the user's notification preferences and dispatches
via the active channels (email, in_app, or both).  It uses its own
database session so the caller's transaction is never affected.
"""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User

logger = logging.getLogger(__name__)

_DEFAULT_CHANNELS = {"email": True, "in_app": True}


def _get_channel_prefs(user: User, event: str) -> dict:
    """Return {"email": bool, "in_app": bool} for the given event.

    Reads from ``user.preferences["notifications"][event]``.  Falls back
    to defaults (both enabled) when no specific config exists.
    """
    stored = (user.preferences or {}).get("notifications", {})
    if isinstance(stored, dict):
        channels = stored.get(event)
        if isinstance(channels, dict):
            return {
                "email": channels.get("email", True),
                "in_app": channels.get("in_app", True),
            }
    return _DEFAULT_CHANNELS.copy()


async def notify(
    db: AsyncSession,
    *,
    event: str,
    user_id: UUID,
    workspace_id: UUID,
    title: str,
    body: str = "",
    link: Optional[str] = None,
    notification_type: str = "info",
    email_subject: Optional[str] = None,
    email_html: Optional[str] = None,
    email_to: Optional[str] = None,
):
    """Create an in-app notification (and optionally enqueue an email).

    Uses its own session so the caller's transaction is never affected.
    Any internal error is caught and logged; the caller is never blocked.
    """
    from app.core.database import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user:
                logger.warning("notify: user %s not found", user_id)
                return

            prefs = _get_channel_prefs(user, event)
            email_addr = email_to or user.email

            if prefs.get("in_app"):
                notif = Notification(
                    workspace_id=workspace_id,
                    user_id=user_id,
                    title=title,
                    body=body,
                    type=notification_type,
                    link=link,
                )
                session.add(notif)
                await session.commit()
                logger.info("notify: in_app created event=%s user=%s", event, user_id)

        if prefs.get("email") and email_html:
            try:
                from app.tasks.notifications import send_email_task
                send_email_task.delay(
                    to_email=email_addr,
                    subject=email_subject or title,
                    html_content=email_html,
                )
            except Exception:
                logger.exception("notify: failed to enqueue email for user %s", user_id)
    except Exception:
        logger.exception("notify: failed to dispatch notification event=%s user=%s", event, user_id)
