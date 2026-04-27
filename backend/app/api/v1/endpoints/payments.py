import asyncio
import base64
import io
import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

import stripe
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.parallel_db import parallel_queries
from app.models.erp import Invoice, InvoiceAuditLog, InvoiceItem, InvoiceSettings
from app.models.payment import StripeAccount, Subscription, Payment, SubscriptionStatus, PaymentStatus
from app.models.client import Client
from app.models.workspace import Workspace
from app.models.user import User, UserRole, RoleType
from app.middleware.auth import require_workspace, require_owner, require_staff, CurrentUser
from app.services.auto_invoice import create_invoice_for_payment
from app.services.email import email_service, EmailTemplates
from app.services.invoice_pdf import InvoicePDFGenerator
from app.services.notification_service import notify
from app.services.product_capacity import ensure_product_capacity_by_id

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


# ============ SCHEMAS ============

class StripeConnectRequest(BaseModel):
    return_url: str
    refresh_url: str


class SubscriptionCreate(BaseModel):
    client_id: UUID
    name: str
    description: Optional[str] = None
    amount: float
    currency: str = "EUR"
    interval: str = "month"
    stripe_price_id: Optional[str] = None
    product_id: Optional[UUID] = None


class SubscriptionResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    client_id: Optional[UUID] = None
    client_name: Optional[str] = None
    plan_name: str = ""
    name: str
    description: Optional[str] = None
    status: str
    amount: float
    currency: str
    interval: str
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    client_id: Optional[UUID] = None
    client_name: Optional[str] = None
    description: Optional[str] = None
    amount: float
    currency: str
    status: str
    payment_type: Optional[str] = "one_time"
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============ STRIPE CONNECT ============

@router.post("/connect")
async def connect_stripe_account(
    data: StripeConnectRequest,
    current_user: CurrentUser = Depends(require_owner),
    db: AsyncSession = Depends(get_db)
):
    """
    Iniciar proceso de conexión de cuenta Stripe.
    """
    try:
        # Check if already connected
        result = await db.execute(
            select(StripeAccount).where(
                StripeAccount.workspace_id == current_user.workspace_id
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing and existing.onboarding_complete == "Y":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya tienes una cuenta Stripe conectada"
            )
        
        # Create or get Stripe Connect account
        if existing:
            account_id = existing.stripe_account_id
        else:
            account = stripe.Account.create(
                type="express",
                country="ES",
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
            )
            account_id = account.id
            
            # Save to database
            stripe_account = StripeAccount(
                workspace_id=current_user.workspace_id,
                stripe_account_id=account_id
            )
            db.add(stripe_account)
            await db.commit()
        
        # Create account link for onboarding
        account_link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=data.refresh_url,
            return_url=data.return_url,
            type="account_onboarding",
        )
        
        return {"url": account_link.url}
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al procesar el pago"
        )


@router.get("/connect/status")
async def get_stripe_status(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Verificar estado de conexión de Stripe.
    """
    result = await db.execute(
        select(StripeAccount).where(
            StripeAccount.workspace_id == current_user.workspace_id
        )
    )
    stripe_account = result.scalar_one_or_none()
    
    if not stripe_account:
        return {"connected": False, "onboarding_complete": False}
    
    # Check account status with Stripe
    try:
        account = stripe.Account.retrieve(stripe_account.stripe_account_id)
        
        onboarding_complete = account.charges_enabled and account.payouts_enabled
        
        if onboarding_complete and stripe_account.onboarding_complete != "Y":
            stripe_account.onboarding_complete = "Y"
            await db.commit()
        
        return {
            "connected": True,
            "onboarding_complete": onboarding_complete,
            "charges_enabled": account.charges_enabled,
            "payouts_enabled": account.payouts_enabled
        }
        
    except stripe.error.StripeError:
        return {"connected": True, "onboarding_complete": False}


# ============ KPIS ============

@router.get("/kpis")
async def get_payment_kpis(
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Obtener KPIs de pagos del workspace.

    OPTIMIZATION: 6 queries secuenciales -> 2 queries paralelas con agregados.
    """
    ws = current_user.workspace_id
    now = datetime.utcnow()
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first_of_last_month = first_of_month - relativedelta(months=1)

    sub_active = Subscription.status == SubscriptionStatus.active
    sub_agg = (
        select(
            func.coalesce(
                func.sum(case((sub_active, Subscription.amount), else_=0)), 0
            ).label("mrr"),
            func.count(case((sub_active, Subscription.id))).label("active"),
            func.count(
                case(
                    (and_(sub_active, Subscription.created_at >= first_of_month), Subscription.id)
                )
            ).label("new_this_month"),
        )
        .where(Subscription.workspace_id == ws)
    )

    pay_agg = (
        select(
            func.count(
                case((Payment.status == PaymentStatus.pending, Payment.id))
            ).label("pending_count"),
            func.coalesce(
                func.sum(case((Payment.status == PaymentStatus.pending, Payment.amount), else_=0)), 0
            ).label("pending_amount"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            and_(
                                Payment.status == PaymentStatus.succeeded,
                                Payment.created_at >= first_of_month,
                            ),
                            Payment.amount,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("this_month"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            and_(
                                Payment.status == PaymentStatus.succeeded,
                                Payment.created_at >= first_of_last_month,
                                Payment.created_at < first_of_month,
                            ),
                            Payment.amount,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("last_month"),
        )
        .where(Payment.workspace_id == ws)
    )

    # Ambas consultas son independientes, así que las ejecutamos en paralelo
    # usando sesiones cortas del pool (PgBouncer Transaction mode colapsa los
    # viajes) en lugar de hacerlo secuencial.
    async def _sub(s):
        return (await s.execute(sub_agg)).one()

    async def _pay(s):
        return (await s.execute(pay_agg)).one()

    sub_row, pay_row = await parallel_queries(_sub, _pay)

    mrr = float(sub_row.mrr or 0)
    active_subscriptions = int(sub_row.active or 0)
    new_subs_this_month = int(sub_row.new_this_month or 0)
    pending_payments = int(pay_row.pending_count or 0)
    pending_amount = float(pay_row.pending_amount or 0)
    this_month_revenue = float(pay_row.this_month or 0)
    last_month_revenue = float(pay_row.last_month or 0)

    revenue_change = 0.0
    if last_month_revenue > 0:
        revenue_change = round(
            ((this_month_revenue - last_month_revenue) / last_month_revenue) * 100, 1
        )

    return {
        "mrr": mrr,
        "mrr_change": revenue_change,
        "active_subscriptions": active_subscriptions,
        "new_subs_this_month": new_subs_this_month,
        "pending_payments": pending_payments,
        "pending_amount": pending_amount,
        "this_month_revenue": this_month_revenue,
        "revenue_change": revenue_change,
    }


# ============ SUBSCRIPTIONS ============

@router.get("/subscriptions")
async def list_subscriptions(
    client_id: Optional[UUID] = None,
    status: Optional[SubscriptionStatus] = None,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar suscripciones del workspace con nombre del cliente.
    """
    query = (
        select(Subscription, Client.first_name, Client.last_name)
        .outerjoin(Client, Subscription.client_id == Client.id)
        .where(Subscription.workspace_id == current_user.workspace_id)
    )

    if client_id:
        query = query.where(Subscription.client_id == client_id)

    if status:
        query = query.where(Subscription.status == status)

    result = await db.execute(query.order_by(Subscription.created_at.desc()))
    rows = result.all()

    subs = []
    for sub, first_name, last_name in rows:
        client_name = f"{first_name or ''} {last_name or ''}".strip() or None
        status_val = sub.status.value if hasattr(sub.status, 'value') else str(sub.status)
        subs.append(SubscriptionResponse(
            id=sub.id,
            workspace_id=sub.workspace_id,
            client_id=sub.client_id,
            client_name=client_name,
            plan_name=sub.name,
            name=sub.name,
            description=sub.description,
            status=status_val,
            amount=float(sub.amount),
            currency=sub.currency,
            interval=sub.interval,
            current_period_start=sub.current_period_start,
            current_period_end=sub.current_period_end,
            cancel_at_period_end=(status_val == "cancelled" and sub.current_period_end and sub.current_period_end > datetime.utcnow()),
            created_at=sub.created_at,
        ))
    return subs


@router.post("/subscriptions", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    data: SubscriptionCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear una nueva suscripción.
    """
    if data.client_id:
        client_check = await db.execute(
            select(Client.id).where(
                Client.id == data.client_id,
                Client.workspace_id == current_user.workspace_id,
            )
        )
        if not client_check.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")

    # Enforce max_users cap if the sub is linked to a product (scoped to workspace)
    extra_data: dict = {}
    if data.product_id:
        await ensure_product_capacity_by_id(
            db, data.product_id, workspace_id=current_user.workspace_id
        )
        extra_data["product_id"] = str(data.product_id)

    subscription = Subscription(
        workspace_id=current_user.workspace_id,
        client_id=data.client_id,
        name=data.name,
        description=data.description,
        amount=data.amount,
        currency=data.currency,
        interval=data.interval,
        stripe_price_id=data.stripe_price_id,
        status=SubscriptionStatus.active,
        current_period_start=datetime.utcnow(),
        extra_data=extra_data,
    )
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    return subscription


@router.delete("/subscriptions/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_subscription(
    subscription_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancelar una suscripción.
    """
    result = await db.execute(
        select(Subscription).where(
            Subscription.id == subscription_id,
            Subscription.workspace_id == current_user.workspace_id
        )
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suscripción no encontrada"
        )
    
    subscription.status = SubscriptionStatus.cancelled
    subscription.cancelled_at = datetime.utcnow()
    await db.commit()


# ============ PAYMENTS ============

@router.get("/payments")
async def list_payments(
    client_id: Optional[UUID] = None,
    status: Optional[PaymentStatus] = None,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar pagos del workspace con nombre del cliente.
    """
    query = (
        select(Payment, Client.first_name, Client.last_name)
        .outerjoin(Client, Payment.client_id == Client.id)
        .where(Payment.workspace_id == current_user.workspace_id)
    )

    if client_id:
        query = query.where(Payment.client_id == client_id)

    if status:
        query = query.where(Payment.status == status)

    result = await db.execute(query.order_by(Payment.created_at.desc()))
    rows = result.all()

    payments = []
    for pay, first_name, last_name in rows:
        client_name = f"{first_name or ''} {last_name or ''}".strip() or None
        status_val = pay.status.value if hasattr(pay.status, 'value') else str(pay.status)
        # Map backend status to frontend-expected status
        display_status = "completed" if status_val == "succeeded" else status_val
        payments.append(PaymentResponse(
            id=pay.id,
            workspace_id=pay.workspace_id,
            client_id=pay.client_id,
            client_name=client_name,
            description=pay.description,
            amount=float(pay.amount),
            currency=pay.currency,
            status=display_status,
            payment_type=pay.payment_type or "one_time",
            paid_at=pay.paid_at,
            created_at=pay.created_at,
        ))
    return payments


# ============ CREATE MANUAL PAYMENT ============

class ManualPaymentCreate(BaseModel):
    client_id: Optional[UUID] = None
    product_id: Optional[UUID] = None
    amount: float
    description: Optional[str] = None
    payment_type: str = "one_time"


@router.post("/payments/create", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_payment(
    data: ManualPaymentCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Crear un pago/cobro manual."""
    if data.client_id:
        client_check = await db.execute(
            select(Client.id).where(
                Client.id == data.client_id,
                Client.workspace_id == current_user.workspace_id,
            )
        )
        if not client_check.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")

    payment = Payment(
        workspace_id=current_user.workspace_id,
        client_id=data.client_id,
        amount=data.amount,
        description=data.description or "Cobro manual",
        currency="EUR",
        status=PaymentStatus.pending,
        payment_type=data.payment_type,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    client_name = None
    if payment.client_id:
        c = await db.execute(select(Client).where(Client.id == payment.client_id))
        cl = c.scalar_one_or_none()
        if cl:
            client_name = f"{cl.first_name or ''} {cl.last_name or ''}".strip() or None

    return PaymentResponse(
        id=payment.id,
        workspace_id=payment.workspace_id,
        client_id=payment.client_id,
        client_name=client_name,
        description=payment.description,
        amount=float(payment.amount),
        currency=payment.currency,
        status="pending",
        payment_type=payment.payment_type or "one_time",
        paid_at=payment.paid_at,
        created_at=payment.created_at,
    )


@router.patch("/payments/{payment_id}/mark-paid")
async def mark_payment_paid(
    payment_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Marcar un pago pendiente como pagado."""
    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id,
            Payment.workspace_id == current_user.workspace_id
        )
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    if payment.status != PaymentStatus.pending:
        raise HTTPException(status_code=400, detail="Solo se pueden marcar como pagados los cobros pendientes")

    payment.status = PaymentStatus.succeeded
    payment.paid_at = datetime.utcnow()

    invoice = await create_invoice_for_payment(
        db, payment,
        user_id=getattr(current_user, "user_id", None) or getattr(getattr(current_user, "user", None), "id", None),
        user_name=getattr(getattr(current_user, "user", current_user), "full_name", None),
    )

    await db.commit()

    await notify(
        db=db,
        event="payment_received",
        user_id=current_user.id,
        workspace_id=current_user.workspace_id,
        title="Pago recibido",
        body=f"{float(payment.amount):.2f} EUR — {payment.description}",
        link="/billing",
        notification_type="payment",
        email_subject=f"Pago recibido: {float(payment.amount):.2f} EUR",
        email_html=f"<p>Se ha registrado un pago de <strong>{float(payment.amount):.2f} EUR</strong> — {payment.description}.</p>",
    )

    # Send a branded receipt to the client, including workspace contact details
    # so they can reach the coach/gym directly if they need support.
    try:
        await _send_payment_receipt_to_client(db, payment, invoice)
    except Exception as exc:  # pragma: no cover - non-blocking
        import logging
        logging.getLogger(__name__).warning(
            "Failed to send payment receipt to client for payment %s: %s",
            payment.id, exc,
        )

    return {
        "status": "ok",
        "message": "Pago marcado como completado",
        "invoice_id": str(invoice.id) if invoice else None,
    }


async def _send_payment_receipt_to_client(
    db: AsyncSession, payment: Payment, invoice
) -> None:
    """Send the payment receipt email to the client (if any) with workspace details."""
    if not payment.client_id:
        return

    client = await db.get(Client, payment.client_id)
    if not client or not client.email:
        return

    workspace = await db.get(Workspace, payment.workspace_id)
    if not workspace:
        return

    # Grab the owner (coach/gym) as the workspace contact for the client.
    owner_q = await db.execute(
        select(User)
        .join(UserRole, UserRole.user_id == User.id)
        .where(
            UserRole.workspace_id == workspace.id,
            UserRole.role == RoleType.owner,
        )
        .limit(1)
    )
    owner = owner_q.scalar_one_or_none()
    ws_email = owner.email if owner else None
    ws_phone = owner.phone if owner and getattr(owner, "phone", None) else None

    client_name = f"{client.first_name or ''} {client.last_name or ''}".strip() or client.email
    paid_at_str = (payment.paid_at or datetime.utcnow()).strftime("%d/%m/%Y %H:%M")
    invoice_number = getattr(invoice, "number", None) if invoice else None

    html = EmailTemplates.payment_receipt(
        client_name=client_name,
        workspace_name=workspace.name,
        amount=float(payment.amount),
        currency=payment.currency or "EUR",
        description=payment.description or "Pago",
        paid_at=paid_at_str,
        invoice_number=invoice_number,
        workspace_email=ws_email,
        workspace_phone=ws_phone,
        payment_method=payment.payment_type,
    )
    await email_service.send_email(
        to_email=client.email,
        to_name=client_name,
        subject=f"Recibo de pago — {workspace.name}",
        html_content=html,
        reply_to=ws_email,
    )


@router.delete("/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(
    payment_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Eliminar un pago pendiente."""
    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id,
            Payment.workspace_id == current_user.workspace_id
        )
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    if payment.status == PaymentStatus.succeeded:
        raise HTTPException(status_code=400, detail="No se pueden eliminar pagos completados")
    await db.delete(payment)
    await db.commit()


# ============ INVOICE FROM PAYMENT ============


def _invoice_to_pdf_dict(invoice: Invoice) -> dict:
    return {
        "id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "invoice_series": invoice.invoice_series,
        "invoice_type": invoice.invoice_type,
        "client_name": invoice.client_name,
        "client_tax_id": invoice.client_tax_id,
        "client_address": invoice.client_address,
        "client_city": invoice.client_city,
        "client_postal_code": invoice.client_postal_code,
        "client_country": invoice.client_country,
        "client_email": invoice.client_email,
        "issue_date": str(invoice.issue_date) if invoice.issue_date else None,
        "due_date": str(invoice.due_date) if invoice.due_date else None,
        "status": invoice.status,
        "subtotal": float(invoice.subtotal or 0),
        "tax_amount": float(invoice.tax_amount or 0),
        "discount_amount": float(invoice.discount_amount or 0),
        "total": float(invoice.total or 0),
        "payment_method": invoice.payment_method,
        "notes": invoice.notes,
    }


def _items_to_pdf_dicts(items) -> list:
    return [
        {
            "description": it.description,
            "quantity": float(it.quantity or 1),
            "unit_price": float(it.unit_price or 0),
            "discount_type": it.discount_type,
            "discount_value": float(it.discount_value or 0),
            "tax_rate": float(it.tax_rate) if it.tax_rate is not None else None,
            "tax_name": it.tax_name,
            "subtotal": float(it.subtotal or 0),
            "tax_amount": float(it.tax_amount or 0),
            "total": float(it.total or 0),
            "position": it.position,
        }
        for it in sorted(items, key=lambda x: x.position or 0)
    ]


def _invoice_settings_to_pdf_dict(s: Optional[InvoiceSettings]) -> Optional[dict]:
    if not s:
        return None
    return {
        "business_name": s.business_name,
        "tax_id": s.tax_id,
        "nif_type": s.nif_type,
        "address": s.address,
        "city": s.city,
        "postal_code": s.postal_code,
        "province": s.province,
        "country": s.country,
        "phone": s.phone,
        "email": s.email,
        "bank_account": s.bank_account,
        "bank_name": s.bank_name,
        "footer_text": s.footer_text,
        "terms_and_conditions": s.terms_and_conditions,
    }


async def _get_or_create_invoice_for_payment(
    db: AsyncSession,
    payment: Payment,
    *,
    user_id: Optional[UUID] = None,
    user_name: Optional[str] = None,
) -> Invoice:
    """Devuelve la factura ligada al pago. La crea (auto-finalize) si no existe.

    Lanza HTTPException si falta configuración de facturación o si el pago
    no está en un estado válido para emitir factura.
    """
    if payment.status != PaymentStatus.succeeded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se puede emitir factura de cobros completados.",
        )

    existing_q = await db.execute(
        select(Invoice)
        .where(Invoice.payment_id == payment.id)
        .where(Invoice.workspace_id == payment.workspace_id)
        .options(selectinload(Invoice.items))
        .order_by(Invoice.created_at.desc())
    )
    invoice = existing_q.scalars().first()
    if invoice:
        return invoice

    settings_q = await db.execute(
        select(InvoiceSettings).where(InvoiceSettings.workspace_id == payment.workspace_id)
    )
    if not settings_q.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No hay configuración de facturación para tu workspace. "
                "Configura tus datos fiscales en Facturación → Configuración."
            ),
        )

    created = await create_invoice_for_payment(
        db, payment,
        user_id=user_id,
        user_name=user_name,
        auto_finalize=True,
    )
    if not created:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo emitir la factura. Revisa la configuración de facturación.",
        )

    await db.commit()

    refreshed_q = await db.execute(
        select(Invoice)
        .where(Invoice.id == created.id)
        .options(selectinload(Invoice.items))
    )
    return refreshed_q.scalar_one()


@router.get("/payments/{payment_id}/invoice/pdf")
async def download_payment_invoice_pdf(
    payment_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Genera/recupera la factura asociada a un cobro completado y devuelve el PDF.

    Si el cobro aún no tiene factura emitida, se crea automáticamente
    respetando la configuración de facturación del workspace
    (datos fiscales, prefijos, IVA por defecto, pie de factura, etc).
    """
    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id,
            Payment.workspace_id == current_user.workspace_id,
        )
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    user_id_value = getattr(current_user, "user_id", None) or getattr(getattr(current_user, "user", None), "id", None)
    user_name_value = getattr(getattr(current_user, "user", current_user), "full_name", None)

    try:
        invoice = await _get_or_create_invoice_for_payment(
            db, payment,
            user_id=user_id_value,
            user_name=user_name_value,
        )
    except HTTPException:
        raise
    except Exception as exc:
        # Aseguramos que la sesión queda limpia para que el resto de la
        # request (no la habrá, pero por si acaso) no arrastre el estado roto.
        try:
            await db.rollback()
        except Exception:
            pass
        logger.exception(
            "Error creando/recuperando factura para cobro %s: %s",
            payment.id, exc,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "No se pudo emitir la factura. "
                f"Detalle técnico: {type(exc).__name__}: {exc}"
            ),
        )

    settings_q = await db.execute(
        select(InvoiceSettings).where(InvoiceSettings.workspace_id == payment.workspace_id)
    )
    invoice_settings = settings_q.scalar_one_or_none()

    try:
        generator = InvoicePDFGenerator()
        pdf_bytes = generator.generate(
            invoice=_invoice_to_pdf_dict(invoice),
            items=_items_to_pdf_dicts(invoice.items or []),
            settings=_invoice_settings_to_pdf_dict(invoice_settings),
            qr_data=invoice.verifactu_qr_data,
        )
    except Exception as exc:
        logger.exception("Error generando PDF de factura %s: %s", invoice.invoice_number, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "No se pudo generar el PDF de la factura. "
                f"Detalle técnico: {type(exc).__name__}: {exc}"
            ),
        )

    filename = f"Factura_{(invoice.invoice_number or 'sin_numero').replace('/', '-')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Invoice-Id": str(invoice.id),
            "X-Invoice-Number": invoice.invoice_number or "",
        },
    )


@router.get("/payments/{payment_id}/invoice")
async def get_payment_invoice_meta(
    payment_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Devuelve metadatos de la factura ligada al cobro (si ya existe)."""
    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id,
            Payment.workspace_id == current_user.workspace_id,
        )
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    invoice_q = await db.execute(
        select(Invoice)
        .where(Invoice.payment_id == payment.id)
        .where(Invoice.workspace_id == payment.workspace_id)
        .order_by(Invoice.created_at.desc())
    )
    invoice = invoice_q.scalars().first()

    if not invoice:
        return {
            "exists": False,
            "payment_id": str(payment.id),
            "can_generate": payment.status == PaymentStatus.succeeded,
        }

    return {
        "exists": True,
        "payment_id": str(payment.id),
        "invoice_id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "status": invoice.status,
        "issue_date": str(invoice.issue_date) if invoice.issue_date else None,
        "total": float(invoice.total or 0),
        "client_email": invoice.client_email,
    }


@router.post("/payments/{payment_id}/invoice/send-email")
async def send_payment_invoice_email(
    payment_id: UUID,
    request: Request,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Genera la factura del cobro (si falta) y se la envía al cliente por email."""
    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id,
            Payment.workspace_id == current_user.workspace_id,
        )
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    user_id_value = getattr(current_user, "user_id", None) or getattr(getattr(current_user, "user", None), "id", None)
    user_name_value = getattr(getattr(current_user, "user", current_user), "full_name", None)

    invoice = await _get_or_create_invoice_for_payment(
        db, payment,
        user_id=user_id_value,
        user_name=user_name_value,
    )

    target_email = invoice.client_email
    if not target_email and payment.client_id:
        client = await db.get(Client, payment.client_id)
        if client and client.email:
            target_email = client.email
    if not target_email:
        raise HTTPException(
            status_code=400,
            detail="El cliente no tiene email configurado, no se puede enviar la factura.",
        )

    settings_q = await db.execute(
        select(InvoiceSettings).where(InvoiceSettings.workspace_id == payment.workspace_id)
    )
    invoice_settings = settings_q.scalar_one_or_none()

    generator = InvoicePDFGenerator()
    pdf_bytes = generator.generate(
        invoice=_invoice_to_pdf_dict(invoice),
        items=_items_to_pdf_dicts(invoice.items or []),
        settings=_invoice_settings_to_pdf_dict(invoice_settings),
        qr_data=invoice.verifactu_qr_data,
    )

    business_name = invoice_settings.business_name if invoice_settings else "Tu entrenador"
    subject = f"Factura {invoice.invoice_number} - {business_name}"
    safe_client_name = invoice.client_name or "cliente"
    html = f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color:#1a202c;">
        <h2 style="color: #2D6A4F;">Factura {invoice.invoice_number}</h2>
        <p>Hola <strong>{safe_client_name}</strong>,</p>
        <p>Adjuntamos tu factura <strong>{invoice.invoice_number}</strong> por un importe de <strong>{float(invoice.total or 0):.2f} €</strong>.</p>
        <p>Puedes descargar el PDF que va adjunto a este correo. Guárdalo como justificante de tu pago.</p>
        <br/>
        <p>Un saludo,<br/><strong>{business_name}</strong></p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Enviado a través de Trackfiz.</p>
    </div>
    """
    attachment = [{
        "content": base64.b64encode(pdf_bytes).decode("utf-8"),
        "name": f"Factura_{(invoice.invoice_number or 'sin_numero').replace('/', '-')}.pdf",
    }]

    sent = False
    try:
        sent = await email_service.send_email(
            to_email=target_email,
            to_name=invoice.client_name,
            subject=subject,
            html_content=html,
            attachments=attachment,
        )
    except Exception:
        logger.exception("Error enviando factura del pago %s al cliente", payment.id)
        sent = False

    if not sent:
        raise HTTPException(status_code=500, detail="No se pudo enviar el email con la factura.")

    if invoice.status == "finalized":
        invoice.status = "sent"

    audit = InvoiceAuditLog(
        invoice_id=invoice.id,
        workspace_id=payment.workspace_id,
        action="email_sent",
        new_values={"email": target_email, "from_payment_id": str(payment.id)},
        user_id=user_id_value,
        user_name=user_name_value or "Sistema",
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "ok",
        "invoice_id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "sent_to": target_email,
    }


# ============ WEBHOOKS ============

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db)
):
    """
    Manejar webhooks de Stripe.
    """
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Payload inválido")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Firma inválida")
    
    # Handle the event
    if event.type == "payment_intent.succeeded":
        payment_intent = event.data.object
        # Update payment status in database
        # TODO: Find and update payment record
        
    elif event.type == "payment_intent.payment_failed":
        payment_intent = event.data.object
        # Handle failed payment
        
    elif event.type == "customer.subscription.updated":
        subscription = event.data.object
        # Update subscription status
        
    elif event.type == "customer.subscription.deleted":
        subscription = event.data.object
        # Handle subscription cancellation
    
    return {"status": "ok"}

