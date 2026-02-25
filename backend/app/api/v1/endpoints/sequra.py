"""
SeQura payment gateway endpoints.

Provides:
  - POST /start-onboarding        → Start solicitation for onboarding, returns order info
  - GET  /identification-form      → Proxy to fetch SeQura's identification form HTML
  - POST /ipn                      → IPN webhook from SeQura (confirm/hold orders)
  - GET  /return                   → Return URL handler, redirects to frontend
  - GET  /onboarding-payment-status/:token → Check payment status
  - GET  /available-methods        → Get available SeQura payment products for a given amount
  - GET  /config-status            → Check if SeQura is configured
"""
import logging
import time
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.config import settings
from app.models.payment import Payment, PaymentStatus
from app.models.invitation import ClientInvitation
from app.models.product import Product
from app.services.sequra import sequra_service
from app.services.auto_invoice import create_invoice_for_payment

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ SCHEMAS ============

class StartOnboardingRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=100)
    product_code: str = Field("pp3", description="SeQura product code (pp3, i1, etc.)")


class StartOnboardingResponse(BaseModel):
    order_uri: str
    payment_id: str
    form_html: str


class OnboardingPaymentStatusResponse(BaseModel):
    payment_completed: bool
    status: str
    product_name: Optional[str] = None
    amount: Optional[float] = None
    gateway: str = "sequra"


class AvailableMethodsResponse(BaseModel):
    available: bool
    methods: list = []
    credit_agreements: list = []
    asset_key: str = ""
    merchant: str = ""
    script_uri: str = ""


class SequraConfigStatusResponse(BaseModel):
    configured: bool
    environment: str
    merchant_id_set: bool


# ============ RATE LIMITING ============

_rate_limit: dict = {}
_RATE_LIMIT_MAX = 5
_RATE_LIMIT_WINDOW = 3600


def _check_rate_limit(key: str) -> bool:
    now = time.time()
    if key in _rate_limit:
        count, first_time = _rate_limit[key]
        if now - first_time > _RATE_LIMIT_WINDOW:
            _rate_limit[key] = (1, now)
            return True
        if count >= _RATE_LIMIT_MAX:
            return False
        _rate_limit[key] = (count + 1, first_time)
        return True
    _rate_limit[key] = (1, now)
    return True


# ============ HELPERS ============

async def _get_invitation_with_product(token: str, db: AsyncSession):
    """Validate invitation token and load product. Returns (invitation, product) or raises."""
    result = await db.execute(
        select(ClientInvitation).where(ClientInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitación no encontrada")

    if invitation.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta invitación ya no es válida")

    if invitation.is_expired:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La invitación ha expirado")

    if not invitation.product_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta invitación no requiere pago")

    product_result = await db.execute(
        select(Product).where(Product.id == invitation.product_id)
    )
    product = product_result.scalar_one_or_none()
    if not product or not product.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El producto ya no está disponible")

    return invitation, product


# ============ ENDPOINTS ============

@router.post("/start-onboarding", response_model=StartOnboardingResponse)
async def start_onboarding(
    data: StartOnboardingRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Start a SeQura solicitation for an onboarding payment.

    Public endpoint. Security via valid invitation token + rate limiting.
    The amount is taken from the product in DB, never from client input.
    """
    if not _check_rate_limit(data.token):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera unos minutos.",
        )

    if not sequra_service.config.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SeQura no está configurado.",
        )

    invitation, product = await _get_invitation_with_product(data.token, db)

    # Check if SeQura payment already succeeded
    if invitation.payment_id:
        existing = await db.execute(select(Payment).where(Payment.id == invitation.payment_id))
        existing_payment = existing.scalar_one_or_none()
        if existing_payment and existing_payment.status == PaymentStatus.succeeded:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El pago ya fue completado.",
            )

    amount_cents = int(round(float(product.price) * 100))
    if amount_cents <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Importe no válido")

    # Build URLs
    base_url = str(request.base_url).rstrip("/")
    api_prefix = settings.API_V1_PREFIX
    frontend_url = settings.FRONTEND_URL.rstrip("/")

    notify_url = f"{base_url}{api_prefix}/sequra/ipn"
    return_url = f"{frontend_url}/onboarding/invite/{data.token}?payment=success&gateway=sequra"
    abort_url = f"{frontend_url}/onboarding/invite/{data.token}?payment=error&gateway=sequra"

    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("User-Agent", "Mozilla/5.0")

    service_end_date = sequra_service.compute_service_end_date(
        interval=product.interval,
        interval_count=product.interval_count or 1,
        product_type=product.product_type or "subscription",
    )

    order_data = sequra_service.build_order_payload(
        amount_cents=amount_cents,
        product_name=product.name[:125],
        product_reference=str(product.id),
        customer_first_name=invitation.first_name or "Cliente",
        customer_last_name=invitation.last_name or "",
        customer_email=invitation.email,
        notify_url=notify_url,
        return_url=return_url,
        abort_url=abort_url,
        ip_address=client_ip,
        user_agent=user_agent,
        service_end_date=service_end_date,
    )

    # Start solicitation with SeQura
    order_uri = await sequra_service.start_solicitation(order_data)
    if not order_uri:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error al comunicarse con SeQura. Inténtalo de nuevo.",
        )

    # Extract order UUID from URI
    sequra_order_ref = order_uri.rstrip("/").split("/")[-1]

    # Create payment record
    payment = Payment(
        workspace_id=invitation.workspace_id,
        client_id=invitation.client_id,
        description=f"SeQura: {product.name}",
        amount=product.price,
        currency=product.currency or "EUR",
        status=PaymentStatus.pending,
        payment_type="subscription" if product.product_type == "subscription" else "one_time",
        extra_data={
            "gateway": "sequra",
            "sequra_order_uri": order_uri,
            "sequra_order_ref": sequra_order_ref,
            "sequra_product_code": data.product_code,
            "sequra_environment": sequra_service.config.environment,
            "invitation_id": str(invitation.id),
            "product_id": str(product.id),
            "onboarding_payment": True,
            "sequra_order_data": order_data,
        },
    )
    db.add(payment)
    await db.flush()

    # Link payment to invitation
    invitation.payment_id = payment.id
    await db.commit()

    logger.info(
        f"SeQura onboarding started: order_ref={sequra_order_ref}, "
        f"amount={amount_cents}c, product={product.name}, payment_id={payment.id}"
    )

    # Fetch the identification form
    form_html = await sequra_service.get_identification_form(
        order_uri, product=data.product_code, ajax=True
    )
    if not form_html:
        form_html = ""
        logger.warning(f"SeQura: could not fetch identification form for {order_uri}")

    return StartOnboardingResponse(
        order_uri=order_uri,
        payment_id=str(payment.id),
        form_html=form_html,
    )


@router.get("/identification-form", response_class=HTMLResponse)
async def get_identification_form(
    order_uri: str = Query(..., description="SeQura order URI"),
    product: str = Query("pp3", description="SeQura product code"),
):
    """
    Proxy endpoint to fetch SeQura's identification form HTML.
    This avoids exposing SeQura credentials to the frontend.
    """
    if not sequra_service.config.is_configured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SeQura no configurado")

    html = await sequra_service.get_identification_form(order_uri, product=product, ajax=True)
    if not html:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="No se pudo obtener el formulario")

    return HTMLResponse(content=html)


@router.post("/ipn")
async def sequra_ipn(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    IPN (Instant Payment Notification) webhook from SeQura.

    SeQura POSTs form-urlencoded data with:
      - order_ref: SeQura's order UUID
      - order_ref_1: our merchant reference (if provided)
      - sq_state: "approved" or "needs_review"
      - product_code: SeQura product used

    We must:
      1. Find the payment by order_ref
      2. PUT confirmation/hold to SeQura
      3. Update payment status
      4. Respond 200 OK
    """
    form = await request.form()
    order_ref = form.get("order_ref", "")
    order_ref_1 = form.get("order_ref_1", "")
    sq_state = form.get("sq_state", "")
    product_code = form.get("product_code", "")
    approved_since = form.get("approved_since", "")
    needs_review_since = form.get("needs_review_since", "")

    client_ip = request.client.host if request.client else "unknown"

    logger.info(
        f"SeQura IPN received: order_ref={order_ref}, sq_state={sq_state}, "
        f"product_code={product_code}, IP={client_ip}"
    )

    if not order_ref or not sq_state:
        logger.warning(f"SeQura IPN: missing params from IP={client_ip}")
        return {"status": "ok", "message": "Missing parameters"}

    # Find payment by SeQura order ref
    result = await db.execute(
        select(Payment).where(
            Payment.extra_data["sequra_order_ref"].astext == order_ref
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        logger.error(f"SeQura IPN: payment not found for order_ref={order_ref}")
        return {"status": "ok", "message": "Payment not found"}

    # Idempotency: skip if already confirmed
    if payment.status == PaymentStatus.succeeded:
        logger.info(f"SeQura IPN: payment {payment.id} already succeeded")
        return {"status": "ok", "message": "Already processed"}

    extra = payment.extra_data or {}
    order_uri = extra.get("sequra_order_uri", "")
    stored_order_data = extra.get("sequra_order_data", {})

    if not order_uri or not stored_order_data:
        logger.error(f"SeQura IPN: missing order data for payment {payment.id}")
        return {"status": "ok", "message": "Missing order data"}

    # Generate a unique order reference for SeQura
    our_order_ref = f"TF-{str(payment.id)[:8].upper()}"

    if sq_state == "approved":
        # Confirm the order with SeQura
        confirm_data = {**stored_order_data, "state": "confirmed"}
        confirm_data["merchant_reference"] = {"order_ref_1": our_order_ref}

        success, error_body = await sequra_service.update_order(order_uri, confirm_data)

        if success:
            payment.status = PaymentStatus.succeeded
            payment.paid_at = datetime.utcnow()
            logger.info(f"SeQura payment {payment.id} CONFIRMED: order_ref_1={our_order_ref}")
        else:
            logger.error(f"SeQura confirm failed for payment {payment.id}: {error_body}")
            payment.status = PaymentStatus.failed

    elif sq_state == "needs_review":
        # Put order on hold
        hold_data = {**stored_order_data, "state": "on_hold"}
        success, error_body = await sequra_service.update_order(order_uri, hold_data)

        if success:
            logger.info(f"SeQura payment {payment.id} ON HOLD (needs_review)")
        else:
            logger.error(f"SeQura on_hold failed for payment {payment.id}: {error_body}")

    else:
        logger.warning(f"SeQura IPN: unknown sq_state={sq_state}")

    # Store IPN data
    payment.extra_data = {
        **extra,
        "sequra_ipn_state": sq_state,
        "sequra_ipn_product_code": product_code,
        "sequra_ipn_received_at": datetime.utcnow().isoformat(),
        "sequra_ipn_ip": client_ip,
        "sequra_order_ref_1": our_order_ref,
        "sequra_approved_since": approved_since,
        "sequra_needs_review_since": needs_review_since,
    }

    if sq_state == "approved" and payment.status == PaymentStatus.succeeded:
        try:
            await create_invoice_for_payment(db, payment, ip_address=client_ip)
        except Exception as e:
            logger.error(f"Auto-invoice failed for SeQura payment {payment.id}: {e}")

    await db.commit()

    return {"status": "ok"}


@router.get("/onboarding-payment-status/{token}", response_model=OnboardingPaymentStatusResponse)
async def get_onboarding_payment_status(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Check the SeQura payment status for an onboarding invitation.
    Public endpoint -- only returns minimal info.
    """
    result = await db.execute(
        select(ClientInvitation).where(ClientInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitación no encontrada")

    if not invitation.product_id:
        return OnboardingPaymentStatusResponse(
            payment_completed=True,
            status="no_payment_required",
        )

    # Load product name
    product_result = await db.execute(
        select(Product).where(Product.id == invitation.product_id)
    )
    product = product_result.scalar_one_or_none()

    if not invitation.payment_id:
        return OnboardingPaymentStatusResponse(
            payment_completed=False,
            status="pending",
            product_name=product.name if product else None,
            amount=float(product.price) if product else None,
        )

    pay_result = await db.execute(
        select(Payment).where(Payment.id == invitation.payment_id)
    )
    payment = pay_result.scalar_one_or_none()

    if not payment:
        return OnboardingPaymentStatusResponse(
            payment_completed=False,
            status="pending",
            product_name=product.name if product else None,
            amount=float(product.price) if product else None,
        )

    # Only report as SeQura gateway if this payment was through SeQura
    gateway = (payment.extra_data or {}).get("gateway", "sequra")

    return OnboardingPaymentStatusResponse(
        payment_completed=payment.status == PaymentStatus.succeeded,
        status=payment.status.value,
        product_name=product.name if product else None,
        amount=float(product.price) if product else None,
        gateway=gateway,
    )


@router.get("/available-methods", response_model=AvailableMethodsResponse)
async def get_available_methods(
    token: str = Query(..., description="Invitation token"),
    db: AsyncSession = Depends(get_db),
):
    """
    Check which SeQura payment methods are available for the product
    associated with the invitation. Returns credit agreements (installment options).
    """
    if not sequra_service.config.is_configured:
        logger.info("SeQura available-methods: not configured")
        return AvailableMethodsResponse(available=False)

    invitation, product = await _get_invitation_with_product(token, db)

    amount_cents = int(round(float(product.price) * 100))

    base_response = {
        "asset_key": sequra_service.config.asset_key,
        "merchant": sequra_service.config.merchant_id,
        "script_uri": sequra_service.config.script_uri,
    }

    # Try to get credit agreements for installment info
    methods = []
    flat_agreements = []

    try:
        agreements = await sequra_service.get_credit_agreements(amount_cents)

        if agreements:
            if isinstance(agreements, dict):
                for code, data in agreements.items():
                    if isinstance(data, dict):
                        methods.append({"code": code, "name": data.get("title", code)})
                        if "instalment_plans" in data:
                            for plan in data["instalment_plans"]:
                                flat_agreements.append({"product_code": code, **plan})
                    elif isinstance(data, list):
                        methods.append({"code": code, "name": code})
                        for plan in data:
                            flat_agreements.append({"product_code": code, **plan})
            elif isinstance(agreements, list):
                flat_agreements = agreements
    except Exception as e:
        logger.warning(f"SeQura credit_agreements fetch failed: {e}")

    # SeQura is available as long as it's configured, even without credit agreement details.
    # The widget will show the actual installment info via its own JS.
    return AvailableMethodsResponse(
        available=True,
        methods=methods if methods else [{"code": "pp3", "name": "Pago en 3 cuotas"}],
        credit_agreements=flat_agreements,
        **base_response,
    )


@router.get("/config-status", response_model=SequraConfigStatusResponse)
async def get_config_status():
    """Check SeQura configuration status."""
    config = sequra_service.config
    return SequraConfigStatusResponse(
        configured=config.is_configured,
        environment=config.environment,
        merchant_id_set=bool(config.merchant_id),
    )
