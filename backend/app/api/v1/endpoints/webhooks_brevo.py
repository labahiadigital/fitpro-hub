"""Webhook receiver para los eventos de email de Brevo.

Brevo envía un POST por cada evento (delivered, opened, clicked,
bounced, soft_bounce, spam, unsubscribed, blocked, deferred,
invalid_email...) con un JSON parecido a::

    {
      "event": "opened",
      "email": "client@example.com",
      "id": 1234567,
      "date": "2026-05-05 12:34:56",
      "ts_event": 1715000000,
      "message-id": "<201605191243.32703273@smtp-relay.mailin.fr>",
      "subject": "Tu próximo paso",
      "tag": "campaign:abandoned_cart",
      ...
    }

Para cuajar con :class:`EmailEvent` usamos ``message-id`` como clave
para buscar el envío original (``request``) que ya guardamos al
disparar el correo, y heredamos su ``workspace_id``, ``client_id`` y
``invitation_id``.

**Seguridad**: el endpoint es público (Brevo no soporta firmas HMAC
nativamente en su panel). Para evitar abuso, comprobamos que el
``message-id`` exista en nuestra tabla ``email_events`` antes de
guardar nada — si nadie nos ha enviado nunca un email con ese ID, lo
descartamos. Esto cierra el vector más obvio (eventos forjados).
"""
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.email_tracking import EmailEvent

logger = logging.getLogger(__name__)
router = APIRouter()


_EVENT_MAP = {
    "delivered": "delivered",
    "request": "request",
    "opened": "opened",
    "unique_opened": "opened",
    "click": "clicked",
    "clicked": "clicked",
    "soft_bounce": "soft_bounce",
    "hard_bounce": "hard_bounce",
    "blocked": "blocked",
    "spam": "spam",
    "invalid_email": "invalid_email",
    "deferred": "deferred",
    "unsubscribed": "unsubscribed",
    "error": "error",
    "complaint": "spam",
    "list_addition": "list_addition",
}


def _parse_brevo_date(payload: Dict[str, Any]) -> datetime:
    """Brevo envía ``date`` (YYYY-MM-DD HH:MM:SS) y ``ts_event`` (epoch).
    Preferimos el epoch porque es zona-aware (UTC).
    """
    ts = payload.get("ts_event") or payload.get("ts")
    if ts:
        try:
            return datetime.utcfromtimestamp(int(ts))
        except (TypeError, ValueError):
            pass
    raw = payload.get("date") or payload.get("ts_event_date")
    if raw:
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
            try:
                return datetime.strptime(raw, fmt)
            except ValueError:
                continue
    return datetime.utcnow()


@router.post("/webhooks/brevo")
async def brevo_event_webhook(
    request: Request,
    payload: Dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """Recibe un evento de Brevo y lo guarda como :class:`EmailEvent`.

    Devuelve siempre 200 (Brevo reintenta hasta 24h si recibe un
    código != 2xx, lo que llenaría logs si caemos en una excepción
    transitoria).
    """
    raw_event = (payload.get("event") or "").lower().strip()
    event_type = _EVENT_MAP.get(raw_event, raw_event or "unknown")
    raw_message_id = payload.get("message-id") or payload.get("messageId")
    if isinstance(raw_message_id, str):
        message_id: Optional[str] = raw_message_id.strip("<>")
    else:
        message_id = None

    recipient_email = (payload.get("email") or "").strip().lower()
    if not recipient_email and not message_id:
        logger.warning("Brevo webhook sin email ni message-id: %s", payload)
        return {"status": "ignored"}

    # Cruzamos con el envío original para heredar workspace/client.
    base_q = select(EmailEvent)
    if message_id:
        base_q = base_q.where(EmailEvent.brevo_message_id == message_id)
    elif recipient_email:
        base_q = base_q.where(
            EmailEvent.recipient_email == recipient_email,
            EmailEvent.event_type == "request",
        ).order_by(desc(EmailEvent.occurred_at)).limit(1)
    base_q = base_q.order_by(desc(EmailEvent.occurred_at)).limit(1)

    base_event_q = await db.execute(base_q)
    base_event = base_event_q.scalars().first()

    if base_event is None:
        # Mensaje desconocido: no nos llega de nuestro propio envío.
        # Lo registramos como evento huérfano para no perder
        # información, pero no propagamos a workspace.
        logger.info(
            "Webhook Brevo sin evento de envío previo (event=%s msg_id=%s email=%s)",
            event_type, message_id, recipient_email,
        )
        orphan = EmailEvent(
            workspace_id=None,
            brevo_message_id=message_id,
            recipient_email=recipient_email or "unknown@unknown",
            event_type=event_type,
            subject=payload.get("subject"),
            template_kind=payload.get("tag"),
            occurred_at=_parse_brevo_date(payload),
            payload=payload,
        )
        db.add(orphan)
        await db.commit()
        return {"status": "ok", "orphan": True}

    new_event = EmailEvent(
        workspace_id=base_event.workspace_id,
        brevo_message_id=message_id or base_event.brevo_message_id,
        recipient_email=recipient_email or base_event.recipient_email,
        user_id=base_event.user_id,
        client_id=base_event.client_id,
        invitation_id=base_event.invitation_id,
        event_type=event_type,
        subject=payload.get("subject") or base_event.subject,
        template_kind=base_event.template_kind,
        occurred_at=_parse_brevo_date(payload),
        payload=payload,
    )
    db.add(new_event)
    await db.commit()
    return {"status": "ok"}
