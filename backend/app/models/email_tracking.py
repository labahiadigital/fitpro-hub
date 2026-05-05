"""Tracking de emails (Brevo) y plantillas de campaña con descuento.

``EmailEvent`` se alimenta tanto del envío transaccional (al enviar un
email registramos un evento ``request``) como del webhook de Brevo
(``delivered``, ``opened``, ``clicked``, ``bounced``, ``spam``,
``unsubscribed``). Esto permite ordenar la pestaña *Seguimiento* del
entrenador por el último email enviado y mostrar si el cliente lo ha
abierto.

``EmailCampaignTemplate`` modela las plantillas que el entrenador
puede mandar a un segmento de clientes (carrito abandonado, inactivos)
con un descuento opcional. Mantenemos un único modelo para no
fragmentar tablas; el segmento al que apunta se guarda en
``target_segment``.
"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from app.models.base import BaseModel


class EmailEvent(BaseModel):
    """Cada evento de email (envío + webhooks de Brevo)."""

    __tablename__ = "email_events"

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    brevo_message_id = Column(String(255), nullable=True, index=True)
    recipient_email = Column(String(255), nullable=False, index=True)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    invitation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("client_invitations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # request | delivered | opened | clicked | hard_bounce | soft_bounce |
    # spam | unsubscribed | invalid_email | deferred | blocked | error
    event_type = Column(String(40), nullable=False, index=True)
    subject = Column(String(500), nullable=True)
    template_kind = Column(String(80), nullable=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False)
    payload = Column(JSONB, default=lambda: {}, nullable=False)


class EmailCampaignTemplate(BaseModel):
    """Plantilla de campaña con descuento para segmentos del entrenador."""

    __tablename__ = "email_campaign_templates"

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    name = Column(String(150), nullable=False)
    subject = Column(String(255), nullable=False)
    body_html = Column(Text, nullable=False)
    # abandoned_cart | inactive | reminder | custom
    target_segment = Column(
        String(40), nullable=False, default="custom", server_default="custom"
    )
    # discount_type: percent | amount | None
    discount_type = Column(String(10), nullable=True)
    discount_value = Column(Numeric(10, 2), nullable=True)
    discount_code = Column(String(60), nullable=True)
    is_active = Column(Boolean, default=True, server_default=func.text("true"), nullable=False)
