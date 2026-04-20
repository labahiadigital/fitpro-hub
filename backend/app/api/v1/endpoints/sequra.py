"""
SeQura payment gateway endpoints.

Provides:
  - POST /start-onboarding        → Start solicitation for onboarding, returns order info
  - GET  /identification-form      → Proxy to fetch SeQura's identification form HTML
  - POST /ipn                      → IPN webhook from SeQura (confirm/hold orders)
  - POST /events-webhook           → Events webhook from SeQura (cancellations, etc.)
  - GET  /onboarding-payment-status/:token → Check payment status
  - GET  /available-methods        → Get available SeQura payment products for a given amount
  - GET  /config-status            → Check if SeQura is configured
"""
import hashlib
import hmac
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
from app.models.product import Product, Coupon
from app.models.client import Client
from app.services.sequra import sequra_service
from app.services.auto_invoice import create_invoice_for_payment
from app.services.product_capacity import ensure_product_capacity
from app.middleware.auth import require_staff

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ SCHEMAS ============

class StartOnboardingRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=100)
    product_code: str = Field("pp6", description="SeQura product code (pp6, pp3, i1, etc.)")
    coupon_code: Optional[str] = Field(None, max_length=50, description="Optional coupon code for discount")


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
    endpoint: str = ""
    script_uri: str = ""


# ============ RATE LIMITING ============

_rate_limit: dict = {}
import os as _os_rl
_RATE_LIMIT_MAX = int(_os_rl.getenv("SEQURA_RATE_LIMIT_MAX", "30"))
_RATE_LIMIT_WINDOW = int(_os_rl.getenv("SEQURA_RATE_LIMIT_WINDOW", "3600"))


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

def _get_real_ip(request: Request) -> str:
    """Extract the real client IP considering reverse proxy headers."""
    x_forwarded = request.headers.get("X-Forwarded-For", "")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    x_real_ip = request.headers.get("X-Real-IP", "")
    if x_real_ip:
        return x_real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


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
    # Print directly to stderr with flush=True as a belt-and-suspenders log.
    # logger.info can get swallowed by uvicorn's buffering + custom formatters
    # so we print a tiny audit line as well to guarantee we see entry in
    # container stdout no matter what.
    import sys as _sys
    rid_pre = getattr(request.state, "request_id", "-")
    print(
        f"[SQ-ENTRY] rid={rid_pre} token_prefix={data.token[:8] if data.token else '<none>'} product_code={data.product_code}",
        file=_sys.stderr, flush=True,
    )
    logger.info(
        "SQ-ENTRY rid=%s token_prefix=%s product_code=%s",
        rid_pre, data.token[:8] if data.token else "<none>", data.product_code,
    )
    # Wrap the whole endpoint in try/except so any unhandled exception becomes
    # a 502 with CORS headers, instead of the reverse proxy returning a "mute"
    # 502 Bad Gateway that breaks the browser preflight.
    try:
        result = await _start_onboarding_impl(data, request, db)
        print(
            f"[SQ-EXIT-OK] rid={rid_pre}",
            file=_sys.stderr, flush=True,
        )
        return result
    except HTTPException as exc:
        print(
            f"[SQ-EXIT-HTTP] rid={rid_pre} status={exc.status_code} detail={exc.detail!r}",
            file=_sys.stderr, flush=True,
        )
        raise
    except BaseException as exc:  # includes SystemExit, KeyboardInterrupt, etc.
        # Last-resort trap: BaseException covers things Exception misses and
        # lets us log before the worker dies or re-raises.
        print(
            f"[SQ-EXIT-FATAL] rid={rid_pre} type={type(exc).__name__} msg={exc!r}",
            file=_sys.stderr, flush=True,
        )
        logger.exception(
            "SeQura start-onboarding crashed unexpectedly (token_prefix=%s, env=%s, exc_type=%s)",
            data.token[:8] if data.token else "<none>",
            sequra_service.config.environment,
            type(exc).__name__,
        )
        if isinstance(exc, Exception):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Error interno al iniciar el pago con SeQura. Intentalo de nuevo.",
            )
        raise


async def _start_onboarding_impl(
    data: StartOnboardingRequest,
    request: Request,
    db: AsyncSession,
) -> "StartOnboardingResponse":
    rid = getattr(request.state, "request_id", "-")
    tk = data.token[:8] if data.token else "<none>"
    logger.info(
        "SQ[%s] BEGIN (token_prefix=%s, product_code=%s, env=%s)",
        rid, tk, data.product_code, sequra_service.config.environment,
    )

    if not _check_rate_limit(data.token):
        logger.warning("SQ[%s] rate-limited", rid)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera unos minutos.",
        )

    if not sequra_service.config.is_configured:
        logger.error("SQ[%s] SeQura not configured", rid)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SeQura no está configurado.",
        )

    logger.info("SQ[%s] step=fetch_invitation", rid)
    invitation, product = await _get_invitation_with_product(data.token, db)
    logger.info(
        "SQ[%s] step=fetch_invitation OK (inv_id=%s, product_id=%s, client_id=%s, payment_id=%s)",
        rid, invitation.id, product.id, invitation.client_id, invitation.payment_id,
    )

    logger.info("SQ[%s] step=ensure_capacity", rid)
    await ensure_product_capacity(
        db, product, exclude_invitation_id=invitation.id
    )
    logger.info("SQ[%s] step=ensure_capacity OK", rid)

    if invitation.payment_id:
        logger.info("SQ[%s] step=check_existing_payment", rid)
        existing = await db.execute(select(Payment).where(Payment.id == invitation.payment_id))
        existing_payment = existing.scalar_one_or_none()
        logger.info(
            "SQ[%s] step=check_existing_payment OK (found=%s, status=%s)",
            rid,
            existing_payment is not None,
            getattr(existing_payment, "status", None),
        )
        if existing_payment and existing_payment.status == PaymentStatus.succeeded:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El pago ya fue completado.",
            )

    amount_cents = int(round(float(product.price) * 100))
    if amount_cents <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Importe no válido")
    logger.info("SQ[%s] step=amount_cents=%d", rid, amount_cents)

    # Build URLs
    base_url = str(request.base_url).rstrip("/")
    api_prefix = settings.API_V1_PREFIX
    frontend_url = settings.FRONTEND_URL.rstrip("/")

    notify_url = f"{base_url}{api_prefix}/sequra/ipn"
    return_url = f"{frontend_url}/onboarding/invite/{data.token}?payment=success&gateway=sequra"
    abort_url = f"{frontend_url}/onboarding/invite/{data.token}?payment=error&gateway=sequra"
    approved_url = return_url
    events_webhook_url = f"{base_url}{api_prefix}/sequra/events-webhook"

    cart_ref = f"cart_{product.id}_{int(time.time())}"
    webhook_signature = hmac.new(
        settings.SECRET_KEY.encode(), cart_ref.encode(), hashlib.sha256
    ).hexdigest()

    client_ip = _get_real_ip(request)
    user_agent = request.headers.get("User-Agent", "Mozilla/5.0")

    service_end_date = sequra_service.compute_service_end_date(
        interval=product.interval,
        interval_count=product.interval_count or 1,
        product_type=product.product_type or "subscription",
    )

    logger.info("SQ[%s] step=load_client", rid)
    client_obj = None
    if invitation.client_id:
        client_result = await db.execute(
            select(Client).where(Client.id == invitation.client_id)
        )
        client_obj = client_result.scalar_one_or_none()
    logger.info("SQ[%s] step=load_client OK (client=%s)", rid, client_obj.id if client_obj else None)

    billing_address = "N/A"
    billing_city = "Madrid"
    billing_postal_code = "28001"
    billing_country_code = "ES"

    if client_obj:
        if client_obj.billing_address:
            billing_address = client_obj.billing_address
        if client_obj.billing_city:
            billing_city = client_obj.billing_city
        if client_obj.billing_postal_code:
            billing_postal_code = client_obj.billing_postal_code

    logger.info("SQ[%s] step=previous_orders_query", rid)
    previous_orders = []
    if invitation.client_id:
        try:
            prev_result = await db.execute(
                select(Payment).where(
                    Payment.client_id == invitation.client_id,
                    Payment.status == PaymentStatus.succeeded,
                    Payment.extra_data["gateway"].astext == "sequra",
                ).order_by(Payment.paid_at.desc())
            )
            prev_payments = prev_result.scalars().all()
        except Exception:
            logger.exception("SQ[%s] step=previous_orders_query FAILED (non-fatal)", rid)
            prev_payments = []
    else:
        prev_payments = []
    logger.info("SQ[%s] step=previous_orders_query OK (count=%d)", rid, len(prev_payments))
    for prev_pay in prev_payments:
        previous_orders.append({
            "created_at": prev_pay.paid_at.isoformat() if prev_pay.paid_at else prev_pay.created_at.isoformat(),
            "amount": int(round(float(prev_pay.amount) * 100)),
            "currency": prev_pay.currency or "EUR",
            "raw_status": "Pago completado",
            "status": "delivered",
            "payment_method_raw": "SeQura",
            "payment_method": "SQ",
            "postal_code": billing_postal_code,
            "country_code": "ES",
        })

    # Handle coupon/discount if provided
    discount_items = None
    if data.coupon_code:
        coupon_result = await db.execute(
            select(Coupon).where(
                Coupon.workspace_id == invitation.workspace_id,
                Coupon.code == data.coupon_code,
                Coupon.is_active == True,
            )
        )
        coupon = coupon_result.scalar_one_or_none()
        if coupon:
            if coupon.max_uses and coupon.current_uses >= coupon.max_uses:
                logger.info(f"Coupon {data.coupon_code} exhausted, ignoring discount")
            else:
                if coupon.discount_type == "percentage":
                    discount_cents = -int(round(amount_cents * float(coupon.discount_value) / 100))
                else:
                    discount_cents = -int(round(float(coupon.discount_value) * 100))
                discount_cents = max(discount_cents, -(amount_cents - 1))
                discount_items = [{
                    "reference": coupon.code,
                    "name": coupon.description or f"Descuento {coupon.code}",
                    "total_with_tax": discount_cents,
                }]

    logger.info("SQ[%s] step=build_order_payload", rid)
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
        approved_url=approved_url,
        events_webhook_url=events_webhook_url,
        events_webhook_params={
            "cart": cart_ref,
            "signature": webhook_signature,
        },
        ip_address=client_ip,
        user_agent=user_agent,
        service_end_date=service_end_date,
        billing_address=billing_address,
        billing_city=billing_city,
        billing_postal_code=billing_postal_code,
        billing_country_code=billing_country_code,
        previous_orders=previous_orders,
        discount_items=discount_items,
    )

    logger.info("SQ[%s] step=start_solicitation (endpoint=%s, merchant=%s)",
                rid, sequra_service.config.orders_url, sequra_service.config.merchant_id)
    try:
        order_uri = await sequra_service.start_solicitation(order_data)
    except Exception:
        logger.exception(
            "SQ[%s] step=start_solicitation crashed", rid,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error al comunicarse con SeQura. Intentalo de nuevo.",
        )
    logger.info("SQ[%s] step=start_solicitation OK (order_uri=%s)", rid, order_uri)
    if not order_uri:
        logger.error(
            "SQ[%s] step=start_solicitation returned None (endpoint=%s, env=%s)",
            rid,
            sequra_service.config.orders_url,
            sequra_service.config.environment,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error al comunicarse con SeQura. Intentalo de nuevo.",
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

    # Fetch the identification form. Best-effort: si falla igual devolvemos
    # el order_uri y el frontend puede reintentar con /identification-form.
    try:
        form_html = await sequra_service.get_identification_form(
            order_uri, product=data.product_code, ajax=True
        )
    except Exception:
        logger.exception("SeQura get_identification_form crashed for %s", order_uri)
        form_html = None
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
    product: str = Query("pp6", description="SeQura product code"),
):
    """
    Proxy endpoint to fetch SeQura's identification form HTML.
    This avoids exposing SeQura credentials to the frontend.
    """
    if not sequra_service.config.is_configured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SeQura no configurado")

    # Validate order_uri points to SeQura domains only (prevent SSRF)
    if not order_uri.startswith("https://") or "sequra" not in order_uri.lower():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URI de pedido no válida")

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

    client_ip = _get_real_ip(request)

    # Validate IPN source IP if configured
    allowed_ips = getattr(settings, "SEQURA_ALLOWED_IPS", None)
    if allowed_ips and client_ip not in allowed_ips:
        logger.warning(f"SeQura IPN: rejected from untrusted IP={client_ip}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    logger.info(
        f"SeQura IPN received: order_ref={order_ref}, sq_state={sq_state}, "
        f"product_code={product_code}, IP={client_ip}"
    )

    if not order_ref or not sq_state:
        logger.warning(f"SeQura IPN: missing params from IP={client_ip}")
        return {"status": "ok", "message": "Parámetros ausentes"}

    # Find payment by SeQura order ref
    result = await db.execute(
        select(Payment).where(
            Payment.extra_data["sequra_order_ref"].astext == order_ref
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        logger.error(f"SeQura IPN: payment not found for order_ref={order_ref}")
        return {"status": "ok", "message": "Pago no encontrado"}

    # Idempotency: skip if already confirmed
    if payment.status == PaymentStatus.succeeded:
        logger.info(f"SeQura IPN: payment {payment.id} already succeeded")
        return {"status": "ok", "message": "Ya procesado"}

    extra = payment.extra_data or {}
    order_uri = extra.get("sequra_order_uri", "")
    stored_order_data = extra.get("sequra_order_data", {})

    if not order_uri or not stored_order_data:
        logger.error(f"SeQura IPN: missing order data for payment {payment.id}")
        return {"status": "ok", "message": "Datos del pedido no encontrados"}

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

    # Force pp6 product code — SeQura requires us to use pp6 instead of pp3
    methods = [m for m in methods if m.get("code") != "pp3"]
    if not any(m.get("code") == "pp6" for m in methods):
        methods = [{"code": "pp6", "name": "Pago en 6 cuotas"}] + methods

    return AvailableMethodsResponse(
        available=True,
        methods=methods if methods else [{"code": "pp6", "name": "Pago en 6 cuotas"}],
        credit_agreements=[a for a in flat_agreements if a.get("product_code") != "pp3"],
        **base_response,
    )


@router.post("/events-webhook")
async def sequra_events_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Events webhook from SeQura (cancellations, state changes, etc.).

    SeQura sends JSON with event data including order reference and event type.
    This endpoint handles events like order cancellation that don't go through IPN.
    """
    client_ip = _get_real_ip(request)

    try:
        body = await request.json()
    except Exception:
        logger.warning(f"SeQura events-webhook: invalid JSON from IP={client_ip}")
        return {"status": "ok", "message": "Invalid payload"}

    event_type = body.get("event", body.get("type", ""))
    order_ref = body.get("order_ref", body.get("order", {}).get("reference", ""))
    sq_state = body.get("sq_state", body.get("state", ""))
    params = body.get("parameters", {})
    cart = params.get("cart", "")
    signature = params.get("signature", "")

    logger.info(
        f"SeQura events-webhook: event={event_type}, order_ref={order_ref}, "
        f"state={sq_state}, cart={cart}, IP={client_ip}"
    )

    if not order_ref:
        return {"status": "ok", "message": "No order reference"}

    # Verify HMAC signature if present
    if cart and signature:
        expected = hmac.new(
            settings.SECRET_KEY.encode(), cart.encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            logger.warning(f"SeQura events-webhook: invalid signature for cart={cart}")
            return {"status": "ok", "message": "Invalid signature"}

    result = await db.execute(
        select(Payment).where(
            Payment.extra_data["sequra_order_ref"].astext == order_ref
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        logger.warning(f"SeQura events-webhook: payment not found for order_ref={order_ref}")
        return {"status": "ok", "message": "Payment not found"}

    extra = payment.extra_data or {}

    if sq_state in ("cancelled", "canceled") or event_type in ("cancellation", "cancelled"):
        if payment.status != PaymentStatus.failed:
            payment.status = PaymentStatus.failed
            logger.info(f"SeQura events-webhook: payment {payment.id} CANCELLED via webhook")

    payment.extra_data = {
        **extra,
        "sequra_webhook_event": event_type,
        "sequra_webhook_state": sq_state,
        "sequra_webhook_received_at": datetime.utcnow().isoformat(),
        "sequra_webhook_ip": client_ip,
    }

    await db.commit()
    return {"status": "ok"}


@router.get("/config-status", response_model=SequraConfigStatusResponse)
async def get_config_status(_=Depends(require_staff)):
    """Check SeQura configuration status."""
    config = sequra_service.config
    return SequraConfigStatusResponse(
        configured=config.is_configured,
        environment=config.environment,
        merchant_id_set=bool(config.merchant_id),
        endpoint=config.endpoint,
        script_uri=config.script_uri,
    )
