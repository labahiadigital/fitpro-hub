from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
import stripe

from app.core.config import settings
from app.core.database import get_db
from app.models.payment import StripeAccount, Subscription, Payment, SubscriptionStatus, PaymentStatus
from app.models.client import Client
from app.middleware.auth import require_workspace, require_owner, require_staff, CurrentUser

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
            detail=f"Error de Stripe: {str(e)}"
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
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener KPIs de pagos del workspace.
    """
    from sqlalchemy import func
    from datetime import datetime
    from dateutil.relativedelta import relativedelta
    
    now = datetime.utcnow()
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first_of_last_month = first_of_month - relativedelta(months=1)
    
    # MRR - Monthly Recurring Revenue from active subscriptions
    mrr_result = await db.execute(
        select(func.coalesce(func.sum(Subscription.amount), 0)).where(
            Subscription.workspace_id == current_user.workspace_id,
            Subscription.status == SubscriptionStatus.active
        )
    )
    mrr = float(mrr_result.scalar() or 0)
    
    # Active subscriptions count
    active_subs_result = await db.execute(
        select(func.count()).where(
            Subscription.workspace_id == current_user.workspace_id,
            Subscription.status == SubscriptionStatus.active
        )
    )
    active_subscriptions = active_subs_result.scalar() or 0
    
    # Pending payments
    pending_result = await db.execute(
        select(func.count(), func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.workspace_id == current_user.workspace_id,
            Payment.status == PaymentStatus.pending
        )
    )
    pending_row = pending_result.one()
    pending_payments = pending_row[0] or 0
    pending_amount = float(pending_row[1] or 0)
    
    # This month revenue
    revenue_this_month_result = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.workspace_id == current_user.workspace_id,
            Payment.status == PaymentStatus.succeeded,
            Payment.created_at >= first_of_month
        )
    )
    this_month_revenue = float(revenue_this_month_result.scalar() or 0)
    
    # Last month revenue (for comparison)
    revenue_last_month_result = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.workspace_id == current_user.workspace_id,
            Payment.status == PaymentStatus.succeeded,
            Payment.created_at >= first_of_last_month,
            Payment.created_at < first_of_month
        )
    )
    last_month_revenue = float(revenue_last_month_result.scalar() or 0)
    
    # Calculate change percentage
    revenue_change = 0
    if last_month_revenue > 0:
        revenue_change = round(((this_month_revenue - last_month_revenue) / last_month_revenue) * 100, 1)
    
    # New subscriptions this month
    new_subs_result = await db.execute(
        select(func.count()).where(
            Subscription.workspace_id == current_user.workspace_id,
            Subscription.status == SubscriptionStatus.active,
            Subscription.created_at >= first_of_month
        )
    )
    new_subs_this_month = new_subs_result.scalar() or 0

    return {
        "mrr": mrr,
        "mrr_change": revenue_change,
        "active_subscriptions": active_subscriptions,
        "new_subs_this_month": new_subs_this_month,
        "pending_payments": pending_payments,
        "pending_amount": pending_amount,
        "this_month_revenue": this_month_revenue,
        "revenue_change": revenue_change
    }


# ============ SUBSCRIPTIONS ============

@router.get("/subscriptions")
async def list_subscriptions(
    client_id: Optional[UUID] = None,
    status: Optional[SubscriptionStatus] = None,
    current_user: CurrentUser = Depends(require_workspace),
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
        current_period_start=datetime.utcnow()
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
    current_user: CurrentUser = Depends(require_workspace),
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
    await db.commit()
    return {"status": "ok", "message": "Pago marcado como completado"}


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
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
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

