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
    # Tracking del último email "welcome_after_payment*" (sólo aplica a
    # "pending_system_form"). Sirve para que el entrenador sepa si el
    # cliente ya leyó el email con el CTA al cuestionario.
    last_email_sent_at: Optional[datetime] = None
    last_email_subject: Optional[str] = None
    last_email_status: Optional[str] = None
    email_read: bool = False


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
    last_email_event_at: Optional[datetime] = None
    marketing_consent: Optional[bool] = None
    # ``won = True`` cuando la invitación finalmente se aceptó (cliente
    # convertido). Se mantiene en el listado para tener histórico de
    # conversión. ``status`` permite distinguir pending/expired/cancelled.
    won: bool = False
    invitation_status: str = "pending"
    accepted_at: Optional[datetime] = None
    # Atajo para la UI: ``true`` si conocemos un evento ``opened`` o
    # ``clicked`` del último email. La columna "leído" se pinta en base a
    # este flag.
    email_read: bool = False


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
    if not rows:
        return []

    # Recogemos los últimos eventos de email asociados al cliente con
    # template_kind del flujo de bienvenida tras pago. Nos quedamos con
    # el evento más reciente y resolvemos el estado más significativo.
    client_ids = [client.id for client, _sid, _p in rows]
    welcome_kinds = (
        "welcome_after_payment",
        "welcome_after_payment_resend",
    )
    ev_q = await db.execute(
        select(EmailEvent)
        .where(
            EmailEvent.client_id.in_(client_ids),
            EmailEvent.template_kind.in_(welcome_kinds),
        )
        .order_by(EmailEvent.occurred_at.desc())
    )
    # Agrupar por cliente y por message_id para resolver el último email
    # enviado a cada cliente y su estado (delivered/opened/clicked).
    last_msg_by_client: dict[UUID, str] = {}
    events_by_msg: dict[str, List[EmailEvent]] = {}
    sent_at_by_msg: dict[str, datetime] = {}
    subject_by_msg: dict[str, Optional[str]] = {}
    for ev in ev_q.scalars():
        if ev.client_id is None or ev.brevo_message_id is None:
            continue
        events_by_msg.setdefault(ev.brevo_message_id, []).append(ev)
        # last_msg_by_client guarda el message_id de la PRIMERA aparición
        # (la más reciente porque hemos ordenado DESC).
        if ev.client_id not in last_msg_by_client:
            last_msg_by_client[ev.client_id] = ev.brevo_message_id
        if ev.event_type == "request":
            sent_at_by_msg[ev.brevo_message_id] = ev.occurred_at
            subject_by_msg[ev.brevo_message_id] = ev.subject

    out: List[SegmentClient] = []
    for client, submission_id, last_paid_at in rows:
        msg_id = last_msg_by_client.get(client.id)
        last_status: Optional[str] = None
        last_sent_at: Optional[datetime] = None
        last_subject: Optional[str] = None
        if msg_id:
            evts = events_by_msg.get(msg_id, [])
            last_status, _ = _resolve_email_status(evts)
            last_sent_at = sent_at_by_msg.get(msg_id)
            last_subject = subject_by_msg.get(msg_id)
        email_read = last_status in ("opened", "unique_opened", "clicked")
        out.append(
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
                last_email_sent_at=last_sent_at,
                last_email_subject=last_subject,
                last_email_status=last_status,
                email_read=email_read,
            )
        )
    return out


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
    status_filter: Optional[str] = Query(
        None,
        description=(
            "Filtra por estado del carrito: 'abandoned' (pending sin pago,"
            " comportamiento histórico), 'won' (convertido en cliente),"
            " 'all' (todo). Por defecto sólo abandonados."
        ),
    ),
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Invitaciones con producto asignado y su estado de conversión.

    Comparado con la versión legacy, este endpoint deja también pasar
    invitaciones aceptadas (``won = True``) para que la UI pueda
    mostrar el histórico de conversión: el entrenador quiere saber si
    un carrito que estuvo abandonado finalmente se ganó. El filtro por
    defecto sigue siendo "abandonados" para no romper a quien sólo
    quiere ver lo pendiente de cerrar.
    """
    from app.models.product import Product  # import perezoso

    q = (
        select(ClientInvitation, Product, Payment.status)
        .outerjoin(Product, Product.id == ClientInvitation.product_id)
        .outerjoin(Payment, Payment.id == ClientInvitation.payment_id)
        .where(
            ClientInvitation.workspace_id == current_user.workspace_id,
            ClientInvitation.product_id.isnot(None),
        )
        .order_by(desc(ClientInvitation.last_email_sent_at).nulls_last(), desc(ClientInvitation.created_at))
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

    requested_filter = (status_filter or "abandoned").lower()
    if requested_filter not in ("abandoned", "won", "all"):
        requested_filter = "abandoned"

    out: List[AbandonedCartItem] = []
    for inv, product, payment_status in rows:
        if marketing_only is True and not inv.marketing_consent:
            continue
        if marketing_only is False and inv.marketing_consent:
            continue

        # Detectamos si el carrito se ha "ganado": invitación aceptada o
        # con pago completado. Tener payment != succeeded y status !=
        # accepted = abandono real.
        won = (
            inv.status == "accepted"
            or payment_status == PaymentStatus.succeeded
        )
        if requested_filter == "abandoned" and won:
            continue
        if requested_filter == "won" and not won:
            continue

        events = events_by_msg.get(inv.brevo_message_id, []) if inv.brevo_message_id else []
        last_status, last_status_at = _resolve_email_status(events)
        # ``opened``/``clicked`` se considera "leído" para la UI.
        email_read = last_status in ("opened", "unique_opened", "clicked")

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
                last_email_event_at=last_status_at,
                marketing_consent=inv.marketing_consent,
                won=won,
                invitation_status=inv.status,
                accepted_at=inv.accepted_at,
                email_read=email_read,
            )
        )
    return out


@router.delete("/clients/segments/abandoned-cart/{invitation_id}", status_code=204)
async def delete_abandoned_cart_entry(
    invitation_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Borra del listado un carrito abandonado.

    Se hace borrando físicamente la invitación si todavía está
    ``pending`` o ``expired`` (no perdemos histórico relevante porque
    el cliente nunca se registró). Para invitaciones aceptadas
    devolvemos 409 para evitar que el entrenador borre por error un
    cliente convertido. Si lo necesita en el futuro tendremos que
    soportar soft-delete.
    """
    res = await db.execute(
        select(ClientInvitation).where(
            ClientInvitation.id == invitation_id,
            ClientInvitation.workspace_id == current_user.workspace_id,
        )
    )
    inv = res.scalar_one_or_none()
    if inv is None:
        raise HTTPException(status_code=404, detail="Invitación no encontrada")
    if inv.status == "accepted":
        raise HTTPException(
            status_code=409,
            detail=(
                "No puedes borrar un carrito ganado: el cliente ya está"
                " registrado. Usa el listado de clientes para gestionarlo."
            ),
        )
    await db.delete(inv)
    await db.commit()
    return None


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

    Capturamos cualquier excepción inesperada para evitar que el endpoint
    devuelva un 500 genérico (que el frontend muestra como "Internal
    Server Error" sin detalle): siempre que sea posible respondemos con
    un 502/422 y el motivo concreto. Esto facilita el diagnóstico cuando,
    por ejemplo, Brevo rechaza el sender porque no está registrado.
    """
    import logging  # noqa: WPS433

    log = logging.getLogger(__name__)

    try:
        from app.services.email import EmailTemplates, email_service  # noqa: WPS433

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
            # ``result.errors`` ya viene formateado como
            # ``["brevo:400", "Sender 'foo@bar.com' is not registered..."]``.
            # Devolvemos 502 (bad gateway) porque el fallo es del proveedor
            # externo, y el segundo elemento como detail accionable.
            err_detail = "No se pudo reenviar el email."
            try:
                if result.errors and len(result.errors) >= 2 and result.errors[1]:
                    err_detail = f"No se pudo reenviar el email: {result.errors[1]}"
            except Exception:  # pragma: no cover - defensivo
                pass
            raise HTTPException(status_code=502, detail=err_detail)
        return {"status": "ok", "message_id": result.message_id}

    except HTTPException:
        raise
    except Exception as exc:
        log.exception("resend_system_form_email failed for client_id=%s", client_id)
        raise HTTPException(
            status_code=500,
            detail=f"Error inesperado al reenviar el email: {type(exc).__name__}: {exc}",
        )


@router.post("/clients/{client_id}/cancel-system-form")
async def cancel_pending_system_form(
    client_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Cancela la solicitud del Cuestionario Inicial para este cliente.

    Marca todos los FormSubmission del system form que estén
    ``pending`` como ``expired`` para que el cliente deje de verlos en
    su lista de tareas pendientes y desaparezcan de la pestaña
    "Pendiente formulario" del entrenador. No borramos la fila para
    conservar el histórico (auditoría / re-emisión).
    """
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

    sys_form_q = await db.execute(
        select(Form.id).where(Form.is_global.is_(True), Form.form_type == "system").limit(1)
    )
    sys_form_id = sys_form_q.scalar_one_or_none()
    if sys_form_id is None:
        return {"status": "ok", "cancelled": 0}

    pending_q = await db.execute(
        select(FormSubmission).where(
            FormSubmission.client_id == client.id,
            FormSubmission.form_id == sys_form_id,
            FormSubmission.status == "pending",
        )
    )
    pending = pending_q.scalars().all()
    for sub in pending:
        sub.status = "expired"
    await db.commit()
    return {"status": "ok", "cancelled": len(pending)}
