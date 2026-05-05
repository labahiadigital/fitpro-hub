"""Endpoints para los nuevos segmentos de la pestaña ``Clientes``.

Cada segmento está pensado para una pestaña concreta del dashboard del
entrenador (``ClientsPage``):

- ``pending_system_form``: clientes que ya pagaron pero todavía no han
  rellenado el "Cuestionario Inicial Trackfiz" (system form de la
  migración 051). Acción asociada: reenviar el email con el CTA al
  formulario.
- ``inactive_subscription``: clientes con suscripción cancelada.
  Acción asociada: enviar plantilla de campaña con descuento para
  reactivar.
- ``abandoned_cart``: invitaciones cuyo pago no se ha completado.
  Vive en este endpoint (en lugar del de invitaciones legacy) para
  poder filtrar por consentimiento de marketing y enriquecer con datos
  de tracking de Brevo.

Para la pestaña *Seguimiento* (antes "Invitaciones") seguimos
sirviendo desde ``clients.list_invitations`` pero exponemos aquí un
shape extendido con ``last_email_sent_at`` y eventos del último
mensaje (``email_status``).
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import CurrentUser, require_staff
from app.models.client import Client
from app.models.email_tracking import EmailEvent
from app.models.form import Form, FormSubmission
from app.models.invitation import ClientInvitation
from app.models.payment import Payment, PaymentStatus, Subscription, SubscriptionStatus

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class SegmentClient(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    full_name: str
    # Datos auxiliares específicos del segmento
    last_payment_at: Optional[datetime] = None
    subscription_cancelled_at: Optional[datetime] = None
    marketing_consent: Optional[bool] = None
    # Para "pending_system_form": id del FormSubmission pendiente
    pending_submission_id: Optional[UUID] = None


class AbandonedCartItem(BaseModel):
    invitation_id: UUID
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    product_name: Optional[str] = None
    product_amount: Optional[float] = None
    invited_at: datetime
    expires_at: datetime
    last_email_sent_at: Optional[datetime] = None
    last_email_subject: Optional[str] = None
    last_email_status: Optional[str] = None
    marketing_consent: Optional[bool] = None


class InvitationTrackingItem(BaseModel):
    id: UUID
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    status: str
    expires_at: datetime
    created_at: datetime
    last_email_sent_at: Optional[datetime] = None
    last_email_subject: Optional[str] = None
    last_email_status: Optional[str] = None  # request | delivered | opened | clicked | bounced
    last_email_event_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


# Eventos ordenados por relevancia, de menor a mayor: si vemos un
# ``clicked`` después de un ``opened``, queremos quedarnos con
# ``clicked`` aunque haya llegado antes en la cola del webhook. La
# función ``_resolve_email_status`` aplica este orden.
_EVENT_PRIORITY = {
    "request": 0,
    "deferred": 1,
    "blocked": 1,
    "delivered": 2,
    "soft_bounce": 3,
    "hard_bounce": 4,
    "opened": 5,
    "unique_opened": 5,
    "clicked": 6,
}


def _resolve_email_status(events: List[EmailEvent]) -> tuple[Optional[str], Optional[datetime]]:
    """Dado un conjunto de eventos del mismo mensaje, devuelve el más
    significativo (mayor prioridad) y su fecha."""
    if not events:
        return None, None
    chosen = events[0]
    chosen_priority = _EVENT_PRIORITY.get(chosen.event_type, -1)
    for ev in events[1:]:
        prio = _EVENT_PRIORITY.get(ev.event_type, -1)
        if prio > chosen_priority:
            chosen, chosen_priority = ev, prio
    return chosen.event_type, chosen.occurred_at


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/clients/segments/pending-system-form", response_model=List[SegmentClient])
async def list_pending_system_form_clients(
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Clientes con pago completado pero sin entregar el form del sistema.

    Detectamos el form del sistema buscando submissions con estado
    ``pending`` ligadas al template global ``form_type='system'`` (ver
    migración 051). Si por algún motivo no existe el FormSubmission
    pendiente, también incluimos al cliente: significa que el flujo
    falló antes de crearlo y conviene poder reenviarlo.
    """
    # 1) Form del sistema (template global, no editable, una única fila)
    sys_form_q = await db.execute(
        select(Form.id).where(
            Form.is_global.is_(True),
            Form.form_type == "system",
        ).limit(1)
    )
    sys_form_id = sys_form_q.scalar_one_or_none()

    base_q = (
        select(Client, FormSubmission.id.label("submission_id"), func.max(Payment.paid_at).label("last_paid_at"))
        .join(Payment, Payment.client_id == Client.id)
        .outerjoin(
            FormSubmission,
            and_(
                FormSubmission.client_id == Client.id,
                FormSubmission.form_id == sys_form_id,
            ),
        )
        .where(
            Client.workspace_id == current_user.workspace_id,
            Client.deleted_at.is_(None),
            Payment.status == PaymentStatus.succeeded,
        )
        .group_by(Client.id, FormSubmission.id)
        .having(
            or_(
                FormSubmission.id.is_(None),
                func.bool_and(FormSubmission.status == "pending"),
            )
        )
        .order_by(desc(func.max(Payment.paid_at)))
    )

    rows = (await db.execute(base_q)).all()
    return [
        SegmentClient(
            id=client.id,
            first_name=client.first_name,
            last_name=client.last_name,
            email=client.email,
            phone=client.phone,
            avatar_url=client.avatar_url,
            full_name=client.full_name,
            last_payment_at=last_paid_at,
            pending_submission_id=submission_id,
        )
        for client, submission_id, last_paid_at in rows
    ]


@router.get("/clients/segments/inactive-subscription", response_model=List[SegmentClient])
async def list_inactive_subscription_clients(
    marketing_only: Optional[bool] = Query(None, description="True: sólo opt-in marketing; False: sólo opt-out; None: todos"),
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Clientes que han cancelado su suscripción.

    Se considera *inactivo de suscripción* a quien tenga al menos una
    Subscription en estado ``cancelled`` y NINGUNA otra activa o
    pausada (se cuelan los churners reales). Esto evita listar clientes
    que cancelaron una suscripción pero contrataron otra.
    """
    sub_status = Subscription.status

    # Subquery: clientes con suscripción activa/pausada
    has_active = (
        select(Subscription.client_id)
        .where(
            Subscription.workspace_id == current_user.workspace_id,
            sub_status.in_([SubscriptionStatus.active, SubscriptionStatus.trialing, SubscriptionStatus.paused]),
        )
        .scalar_subquery()
    )

    q = (
        select(
            Client,
            func.max(Subscription.cancelled_at).label("cancelled_at"),
        )
        .join(Subscription, Subscription.client_id == Client.id)
        .where(
            Client.workspace_id == current_user.workspace_id,
            Client.deleted_at.is_(None),
            sub_status == SubscriptionStatus.cancelled,
            Client.id.notin_(has_active),
        )
        .group_by(Client.id)
        .order_by(desc(func.max(Subscription.cancelled_at)))
    )

    rows = (await db.execute(q)).all()
    out: List[SegmentClient] = []
    for client, cancelled_at in rows:
        marketing = (client.consents or {}).get("marketing")
        if marketing_only is True and not marketing:
            continue
        if marketing_only is False and marketing:
            continue
        out.append(
            SegmentClient(
                id=client.id,
                first_name=client.first_name,
                last_name=client.last_name,
                email=client.email,
                phone=client.phone,
                avatar_url=client.avatar_url,
                full_name=client.full_name,
                subscription_cancelled_at=cancelled_at,
                marketing_consent=bool(marketing) if marketing is not None else None,
            )
        )
    return out


@router.get("/clients/segments/abandoned-cart", response_model=List[AbandonedCartItem])
async def list_abandoned_cart(
    marketing_only: Optional[bool] = Query(None),
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Invitaciones con producto asignado pero sin pago completado.

    No se acotan a las que están ``pending`` para que también veamos
    invitaciones expiradas en las que el cliente abandonó el flujo. La
    UI las marca por separado.
    """
    from app.models.product import Product  # import perezoso

    q = (
        select(ClientInvitation, Product, Payment.status)
        .outerjoin(Product, Product.id == ClientInvitation.product_id)
        .outerjoin(Payment, Payment.id == ClientInvitation.payment_id)
        .where(
            ClientInvitation.workspace_id == current_user.workspace_id,
            ClientInvitation.product_id.isnot(None),
            ClientInvitation.status != "accepted",
            or_(
                Payment.id.is_(None),
                Payment.status != PaymentStatus.succeeded,
            ),
        )
        .order_by(desc(ClientInvitation.last_email_sent_at), desc(ClientInvitation.created_at))
    )

    rows = (await db.execute(q)).all()
    if not rows:
        return []

    message_ids = [inv.brevo_message_id for inv, _p, _s in rows if inv.brevo_message_id]
    events_by_msg: dict[str, List[EmailEvent]] = {}
    if message_ids:
        ev_q = await db.execute(
            select(EmailEvent).where(EmailEvent.brevo_message_id.in_(message_ids))
        )
        for ev in ev_q.scalars():
            events_by_msg.setdefault(ev.brevo_message_id, []).append(ev)

    out: List[AbandonedCartItem] = []
    for inv, product, _payment_status in rows:
        if marketing_only is True and not inv.marketing_consent:
            continue
        if marketing_only is False and inv.marketing_consent:
            continue
        events = events_by_msg.get(inv.brevo_message_id, []) if inv.brevo_message_id else []
        last_status, _ = _resolve_email_status(events)
        out.append(
            AbandonedCartItem(
                invitation_id=inv.id,
                email=inv.email,
                first_name=inv.first_name,
                last_name=inv.last_name,
                product_name=product.name if product else None,
                product_amount=float(product.price) if product and product.price else None,
                invited_at=inv.created_at,
                expires_at=inv.expires_at,
                last_email_sent_at=inv.last_email_sent_at,
                last_email_subject=inv.last_email_subject,
                last_email_status=last_status,
                marketing_consent=inv.marketing_consent,
            )
        )
    return out


@router.get("/clients/segments/tracking", response_model=List[InvitationTrackingItem])
async def list_invitations_tracking(
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Pestaña *Seguimiento*: cada invitación con info del último email.

    Ordena primero por ``last_email_sent_at DESC`` (NULLS LAST) y
    después por ``created_at DESC`` para invitaciones a las que aún no
    se les ha mandado nada.
    """
    q = (
        select(ClientInvitation)
        .where(ClientInvitation.workspace_id == current_user.workspace_id)
        .order_by(
            desc(ClientInvitation.last_email_sent_at).nulls_last(),
            desc(ClientInvitation.created_at),
        )
    )
    invs = (await db.execute(q)).scalars().all()
    if not invs:
        return []

    message_ids = [inv.brevo_message_id for inv in invs if inv.brevo_message_id]
    events_by_msg: dict[str, List[EmailEvent]] = {}
    if message_ids:
        ev_q = await db.execute(
            select(EmailEvent).where(EmailEvent.brevo_message_id.in_(message_ids))
        )
        for ev in ev_q.scalars():
            events_by_msg.setdefault(ev.brevo_message_id, []).append(ev)

    out: List[InvitationTrackingItem] = []
    for inv in invs:
        events = events_by_msg.get(inv.brevo_message_id, []) if inv.brevo_message_id else []
        status, status_at = _resolve_email_status(events)
        out.append(
            InvitationTrackingItem(
                id=inv.id,
                email=inv.email,
                first_name=inv.first_name,
                last_name=inv.last_name,
                status=inv.status if not inv.is_expired else "expired",
                expires_at=inv.expires_at,
                created_at=inv.created_at,
                last_email_sent_at=inv.last_email_sent_at,
                last_email_subject=inv.last_email_subject,
                last_email_status=status,
                last_email_event_at=status_at,
            )
        )
    return out


# ---------------------------------------------------------------------------
# Acciones sobre clientes en cada segmento
# ---------------------------------------------------------------------------


@router.post("/clients/{client_id}/resend-system-form")
async def resend_system_form_email(
    client_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Reenvía al cliente el email "Bienvenido tras el pago" con el CTA al
    Cuestionario Inicial. Útil cuando el correo automático se perdió o
    cayó en SPAM.
    """
    from app.services.email import EmailTemplates, email_service  # import perezoso

    res = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.workspace_id == current_user.workspace_id,
            Client.deleted_at.is_(None),
        )
    )
    client = res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if not client.email:
        raise HTTPException(status_code=400, detail="El cliente no tiene email configurado")

    # Buscar el FormSubmission pendiente del system form para construir el CTA
    sys_form_q = await db.execute(
        select(Form.id).where(Form.is_global.is_(True), Form.form_type == "system").limit(1)
    )
    sys_form_id = sys_form_q.scalar_one_or_none()
    submission_id: Optional[UUID] = None
    if sys_form_id is not None:
        sub_q = await db.execute(
            select(FormSubmission.id)
            .where(
                FormSubmission.client_id == client.id,
                FormSubmission.form_id == sys_form_id,
                FormSubmission.status == "pending",
            )
            .limit(1)
        )
        submission_id = sub_q.scalar_one_or_none()

    from app.core.config import settings as app_settings  # noqa: WPS433
    base = (app_settings.FRONTEND_URL or "").rstrip("/") or "https://app.trackfiz.com"
    cta_url = (
        f"{base}/onboarding/system-form/{submission_id}"
        if submission_id is not None
        else f"{base}/my-dashboard"
    )

    # Datos de soporte del workspace
    from app.models.workspace import Workspace  # noqa: WPS433
    workspace = await db.get(Workspace, current_user.workspace_id)
    settings_dict = (getattr(workspace, "settings", None) or {}) if workspace else {}
    support = (settings_dict.get("support") or {}) if isinstance(settings_dict, dict) else {}
    email_footer = settings_dict.get("email_footer") if isinstance(settings_dict, dict) else None

    html = EmailTemplates.client_welcome_after_payment(
        name=client.full_name,
        system_form_url=cta_url,
        workspace_name=workspace.name if workspace else "Trackfiz",
        support_email=support.get("email"),
        support_phone=support.get("phone"),
        email_footer=email_footer,
    )

    result = await email_service.send_email(
        to_email=client.email,
        to_name=client.full_name,
        subject="🚀 ¡Bienvenido/a a mi asesoría! Tus próximos pasos",
        html_content=html,
        tracking={
            "workspace_id": current_user.workspace_id,
            "client_id": client.id,
            "template_kind": "welcome_after_payment_resend",
        },
    )
    if not result:
        raise HTTPException(status_code=500, detail="No se pudo reenviar el email")
    return {"status": "ok", "message_id": result.message_id}
