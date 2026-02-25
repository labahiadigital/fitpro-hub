"""
Redsys payment gateway endpoints.

Provides:
  - POST /create-payment         → Create redirect payment, get form data
  - POST /notification           → Webhook for Redsys notifications (POST form)
  - GET  /payment-status/{id}    → Check payment status by order_id
  - POST /refund                 → Initiate a refund via REST
  - GET  /response-codes         → Reference of response codes
  - GET  /config-status          → Check if Redsys is configured
"""
import logging
from typing import Optional
from uuid import UUID
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.config import settings
from app.models.payment import Payment, PaymentStatus
from app.models.client import Client
from app.models.invitation import ClientInvitation
from app.models.product import Product
from app.middleware.auth import require_workspace, require_staff, CurrentUser
from app.services.auto_invoice import create_invoice_for_payment
from app.services.redsys import (
    redsys_service,
    RedsysRedirectPayment,
    RedsysRefund,
    SIGNATURE_VERSION,
    _decode_merchant_params,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ SCHEMAS ============

class CreatePaymentRequest(BaseModel):
    """Request to create a Redsys redirect payment."""
    client_id: UUID
    amount: float = Field(..., gt=0, description="Amount in EUR (e.g. 25.50)")
    description: str = Field("", max_length=125)
    ok_url: Optional[str] = None
    ko_url: Optional[str] = None
    merchant_data: str = Field("", max_length=1024, description="Free field returned in notification")


class CreatePaymentResponse(BaseModel):
    """Response with form data to submit to Redsys."""
    Ds_SignatureVersion: str
    Ds_MerchantParameters: str
    Ds_Signature: str
    redsys_url: str
    order_id: str
    payment_id: UUID


class RefundRequest(BaseModel):
    """Request to refund a payment."""
    payment_id: UUID
    amount: Optional[float] = Field(None, gt=0, description="Amount to refund in EUR. If null, refund full amount.")
    reason: str = ""


class RefundResponse(BaseModel):
    """Response for a refund operation."""
    success: bool
    refund_order_id: str
    response_code: Optional[str] = None
    response_message: Optional[str] = None


class PaymentStatusResponse(BaseModel):
    """Payment status info."""
    payment_id: UUID
    order_id: str
    status: str
    amount: float
    currency: str
    description: Optional[str]
    paid_at: Optional[datetime]
    response_code: Optional[str] = None
    response_message: Optional[str] = None
    authorization_code: Optional[str] = None
    card_country: Optional[str] = None
    card_brand: Optional[str] = None


class RedsysConfigStatus(BaseModel):
    """Configuration status."""
    configured: bool
    environment: str
    merchant_code_set: bool
    secret_key_set: bool
    terminal: str


# ============ HELPER ============

def _get_default_urls() -> dict:
    """Get default notification/redirect URLs based on settings."""
    frontend = settings.FRONTEND_URL.rstrip("/")
    backend_base = f"{settings.FRONTEND_URL.split(':')[0]}:{settings.FRONTEND_URL.split(':')[1]}:8001" if ":" in settings.FRONTEND_URL else settings.FRONTEND_URL
    
    # For the webhook, we need the backend's public URL
    # In development, Redsys test can't reach localhost, so we note this
    api_prefix = settings.API_V1_PREFIX
    
    return {
        "ok_url": f"{frontend}/payments/redsys/success",
        "ko_url": f"{frontend}/payments/redsys/error",
    }


# ============ ONBOARDING PAYMENT (PUBLIC) ============

class OnboardingPaymentRequest(BaseModel):
    """Request to create a payment during client onboarding."""
    token: str = Field(..., min_length=10, max_length=100)


class OnboardingPaymentResponse(BaseModel):
    """Response with form data for onboarding payment."""
    Ds_SignatureVersion: str
    Ds_MerchantParameters: str
    Ds_Signature: str
    redsys_url: str
    order_id: str


class OnboardingPaymentStatusResponse(BaseModel):
    """Status of the onboarding payment."""
    payment_completed: bool
    status: str
    product_name: Optional[str] = None
    amount: Optional[float] = None


# Simple in-memory rate limiter for onboarding payments
_onboarding_rate_limit: dict = {}  # token -> (count, first_attempt_time)
_RATE_LIMIT_MAX = 5
_RATE_LIMIT_WINDOW = 3600  # 1 hour


def _check_rate_limit(token: str) -> bool:
    """Returns True if request is allowed, False if rate-limited."""
    import time
    now = time.time()
    if token in _onboarding_rate_limit:
        count, first_time = _onboarding_rate_limit[token]
        if now - first_time > _RATE_LIMIT_WINDOW:
            _onboarding_rate_limit[token] = (1, now)
            return True
        if count >= _RATE_LIMIT_MAX:
            return False
        _onboarding_rate_limit[token] = (count + 1, first_time)
        return True
    _onboarding_rate_limit[token] = (1, now)
    return True


@router.post("/create-onboarding-payment", response_model=OnboardingPaymentResponse)
async def create_onboarding_payment(
    data: OnboardingPaymentRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Redsys payment for a client during onboarding.

    This is a PUBLIC endpoint (no auth) because the client doesn't have an
    account yet. Security is enforced via:
      - Valid, non-expired invitation token
      - Rate limiting per token
      - HMAC signature on the Redsys side
      - Amount taken from DB product (not from client input)
    """
    # Rate limit
    if not _check_rate_limit(data.token):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera unos minutos.",
        )

    # Validate Redsys is configured
    if not redsys_service.config.merchant_code or not redsys_service.config.secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Pasarela de pago no configurada.",
        )

    # Find invitation
    result = await db.execute(
        select(ClientInvitation).where(ClientInvitation.token == data.token)
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

    # Check if payment already succeeded (prevent double charge)
    if invitation.payment_id:
        existing_pay = await db.execute(
            select(Payment).where(Payment.id == invitation.payment_id)
        )
        existing_payment = existing_pay.scalar_one_or_none()
        if existing_payment:
            if existing_payment.status == PaymentStatus.succeeded:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El pago ya fue completado.",
                )
            # If previous payment failed/is pending, we'll create a new one

    # Load product (amount comes from DB, never from client)
    product_result = await db.execute(
        select(Product).where(Product.id == invitation.product_id)
    )
    product = product_result.scalar_one_or_none()
    if not product or not product.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El producto ya no está disponible")

    # Generate order ID and calculate amount
    order_id = redsys_service.generate_order_id()
    amount_cents = int(round(float(product.price) * 100))

    if amount_cents <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El importe del producto no es válido")

    # Create payment record
    # client_id is NOT set yet (client doesn't exist), it will be linked in complete_invitation
    payment = Payment(
        workspace_id=invitation.workspace_id,
        client_id=invitation.client_id,  # May be None; linked later
        description=f"Suscripción: {product.name}",
        amount=product.price,
        currency=product.currency or "EUR",
        status=PaymentStatus.pending,
        payment_type="subscription",
        extra_data={
            "gateway": "redsys",
            "redsys_order_id": order_id,
            "redsys_environment": redsys_service.config.environment,
            "invitation_id": str(invitation.id),
            "product_id": str(product.id),
            "onboarding_payment": True,
        },
    )
    db.add(payment)
    await db.flush()

    # Link payment to invitation
    invitation.payment_id = payment.id
    await db.commit()

    logger.info(
        f"Onboarding payment created: order={order_id}, amount={amount_cents}c, "
        f"product={product.name}, invitation={invitation.id}"
    )

    # Build URLs
    frontend = settings.FRONTEND_URL.rstrip("/")
    ok_url = f"{frontend}/onboarding/invite/{data.token}?payment=success"
    ko_url = f"{frontend}/onboarding/invite/{data.token}?payment=error"

    base_url = str(request.base_url).rstrip("/")
    merchant_url = f"{base_url}{settings.API_V1_PREFIX}/redsys/notification"

    # COF params: initial operation for recurring subscription
    # IDENTIFIER=REQUIRED tells Redsys to generate and return a card token
    # COF_INI=S marks this as the first operation in the COF chain
    # COF_TYPE=R indicates recurring payments
    redsys_payment = RedsysRedirectPayment(
        order_id=order_id,
        amount=amount_cents,
        description=f"Suscripción: {product.name}"[:125],
        merchant_url=merchant_url,
        ok_url=ok_url,
        ko_url=ko_url,
        merchant_data=str(payment.id),
        identifier="REQUIRED",
        cof_ini="S",
        cof_type="R",
    )

    form_data = redsys_service.create_redirect_payment(redsys_payment)

    return OnboardingPaymentResponse(
        Ds_SignatureVersion=form_data["Ds_SignatureVersion"],
        Ds_MerchantParameters=form_data["Ds_MerchantParameters"],
        Ds_Signature=form_data["Ds_Signature"],
        redsys_url=form_data["redsys_url"],
        order_id=order_id,
    )


@router.get("/onboarding-payment-status/{token}", response_model=OnboardingPaymentStatusResponse)
async def get_onboarding_payment_status(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Check the payment status for an onboarding invitation.
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

    return OnboardingPaymentStatusResponse(
        payment_completed=payment.status == PaymentStatus.succeeded,
        status=payment.status.value,
        product_name=product.name if product else None,
        amount=float(product.price) if product else None,
    )


# ============ ENDPOINTS ============

@router.post("/create-payment", response_model=CreatePaymentResponse)
async def create_redsys_payment(
    data: CreatePaymentRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """
    Crear un pago por redirección con Redsys.
    
    Devuelve los parámetros del formulario que el frontend debe enviar 
    como POST a redsys_url para redirigir al cliente al TPV.
    """
    # Validate Redsys is configured
    if not redsys_service.config.merchant_code or not redsys_service.config.secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redsys no está configurado. Configura REDSYS_MERCHANT_CODE y REDSYS_SECRET_KEY.",
        )

    # Verify client exists in workspace
    result = await db.execute(
        select(Client).where(
            and_(
                Client.id == data.client_id,
                Client.workspace_id == current_user.workspace_id,
            )
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado",
        )

    # Generate unique order ID
    order_id = redsys_service.generate_order_id()

    # Default URLs
    defaults = _get_default_urls()
    ok_url = data.ok_url or defaults["ok_url"]
    ko_url = data.ko_url or defaults["ko_url"]

    # Build the notification URL (webhook) - must be publicly accessible
    # In production this would be the real domain
    base_url = str(request.base_url).rstrip("/")
    merchant_url = f"{base_url}{settings.API_V1_PREFIX}/redsys/notification"

    # Create payment record
    amount_cents = int(round(data.amount * 100))

    payment = Payment(
        workspace_id=current_user.workspace_id,
        client_id=data.client_id,
        description=data.description or f"Pago {client.first_name} {client.last_name}",
        amount=data.amount,
        currency="EUR",
        status=PaymentStatus.pending,
        payment_type="one_time",
        extra_data={
            "gateway": "redsys",
            "redsys_order_id": order_id,
            "redsys_environment": redsys_service.config.environment,
        },
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    logger.info(
        f"Creating Redsys payment: order={order_id}, amount={amount_cents}c, "
        f"client={client.first_name} {client.last_name}, payment_id={payment.id}"
    )

    # Create Redsys redirect payment
    redsys_payment = RedsysRedirectPayment(
        order_id=order_id,
        amount=amount_cents,
        description=data.description or f"Pago {client.first_name} {client.last_name}",
        merchant_url=merchant_url,
        ok_url=ok_url,
        ko_url=ko_url,
        merchant_data=data.merchant_data or str(payment.id),
    )

    form_data = redsys_service.create_redirect_payment(redsys_payment)

    return CreatePaymentResponse(
        Ds_SignatureVersion=form_data["Ds_SignatureVersion"],
        Ds_MerchantParameters=form_data["Ds_MerchantParameters"],
        Ds_Signature=form_data["Ds_Signature"],
        redsys_url=form_data["redsys_url"],
        order_id=order_id,
        payment_id=payment.id,
    )


@router.post("/notification")
async def redsys_notification(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook de notificación de Redsys.
    
    Redsys envía un POST con form-data conteniendo:
      - Ds_SignatureVersion
      - Ds_MerchantParameters  
      - Ds_Signature
    
    Este endpoint NO requiere autenticación (es llamado por Redsys).
    """
    # Parse form data
    form = await request.form()
    ds_signature_version = form.get("Ds_SignatureVersion", "")
    ds_merchant_params = form.get("Ds_MerchantParameters", "")
    ds_signature = form.get("Ds_Signature", "")

    # Log source IP for security auditing
    client_ip = request.client.host if request.client else "unknown"

    if not ds_merchant_params or not ds_signature:
        logger.warning(f"Redsys notification with missing params from IP={client_ip}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parámetros incompletos",
        )

    logger.info(f"Redsys notification received: version={ds_signature_version}, IP={client_ip}")

    # Verify HMAC signature
    params = redsys_service.verify_notification(ds_merchant_params, ds_signature)
    if params is None:
        logger.error(f"Redsys notification: INVALID SIGNATURE from IP={client_ip}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firma inválida",
        )

    # Extract key fields
    order_id = params.get("Ds_Order", "")
    response_code = params.get("Ds_Response", "9999")
    amount_str = params.get("Ds_Amount", "0")
    auth_code = params.get("Ds_AuthorisationCode", "")
    card_country = params.get("Ds_Card_Country", "")
    card_brand = params.get("Ds_Card_Brand", "")
    secure_payment = params.get("Ds_SecurePayment", "")
    merchant_code = params.get("Ds_MerchantCode", "")
    # COF token fields for recurring payments
    redsys_identifier = params.get("Ds_Merchant_Identifier", "")
    redsys_cof_txnid = params.get("Ds_Merchant_Cof_Txnid", "")
    card_number = params.get("Ds_Card_Number", "")
    card_last4 = params.get("Ds_Card_Last4", "")

    logger.info(
        f"Redsys notification decoded: order={order_id}, response={response_code}, "
        f"amount={amount_str}, auth_code={auth_code}"
    )

    # Security: verify merchant code matches ours
    if merchant_code and merchant_code != redsys_service.config.merchant_code:
        logger.error(
            f"Redsys notification: merchant code mismatch! "
            f"Expected={redsys_service.config.merchant_code}, Got={merchant_code}, IP={client_ip}"
        )
        return {"status": "ok", "message": "Merchant code mismatch"}

    # Find payment by Redsys order ID
    result = await db.execute(
        select(Payment).where(
            Payment.extra_data["redsys_order_id"].astext == order_id
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        logger.error(f"Redsys notification: payment not found for order {order_id}")
        return {"status": "ok", "message": "Payment not found"}

    # Idempotency: skip if already processed
    if payment.status != PaymentStatus.pending:
        logger.info(f"Redsys notification: payment {payment.id} already processed (status={payment.status.value})")
        return {"status": "ok", "message": "Already processed"}

    # Security: verify amount matches expected
    try:
        notified_amount_cents = int(amount_str)
        expected_amount_cents = int(round(float(payment.amount) * 100))
        if notified_amount_cents != expected_amount_cents:
            logger.error(
                f"Redsys notification: amount mismatch for payment {payment.id}! "
                f"Expected={expected_amount_cents}, Got={notified_amount_cents}"
            )
            return {"status": "ok", "message": "Amount mismatch"}
    except (ValueError, TypeError):
        logger.error(f"Redsys notification: invalid amount '{amount_str}'")

    # Determine success/failure
    is_success = redsys_service.is_successful_response(response_code)
    response_message = redsys_service.get_response_code_message(response_code)

    if is_success:
        payment.status = PaymentStatus.succeeded
        payment.paid_at = datetime.utcnow()
        logger.info(f"Payment {payment.id} SUCCEEDED: {response_message}")
    else:
        payment.status = PaymentStatus.failed
        logger.warning(f"Payment {payment.id} FAILED: {response_code} - {response_message}")

    # Map Redsys brand codes to human-readable names
    brand_map = {"1": "Visa", "2": "Mastercard", "8": "Amex", "9": "JCB", "6": "Diners"}

    # Store complete Redsys response including COF tokens
    payment.extra_data = {
        **(payment.extra_data or {}),
        "redsys_response": params,
        "redsys_response_code": response_code,
        "redsys_response_message": response_message,
        "redsys_auth_code": auth_code,
        "redsys_card_country": card_country,
        "redsys_card_brand": card_brand,
        "redsys_card_brand_name": brand_map.get(card_brand, card_brand),
        "redsys_card_number": card_number,
        "redsys_card_last4": card_last4 or (card_number[-4:] if len(card_number) >= 4 else ""),
        "redsys_secure_payment": secure_payment,
        "redsys_notification_received_at": datetime.utcnow().isoformat(),
        "redsys_notification_ip": client_ip,
    }

    # Store COF tokens for recurring payments
    if redsys_identifier:
        payment.extra_data["redsys_identifier"] = redsys_identifier
    if redsys_cof_txnid:
        payment.extra_data["redsys_cof_txnid"] = redsys_cof_txnid

    if is_success:
        try:
            await create_invoice_for_payment(db, payment, ip_address=client_ip)
        except Exception as e:
            logger.error(f"Auto-invoice failed for payment {payment.id}: {e}")

    await db.commit()

    logger.info(
        f"Payment {payment.id} notification processed: status={payment.status.value}, "
        f"identifier={'yes' if redsys_identifier else 'no'}, cof_txnid={'yes' if redsys_cof_txnid else 'no'}"
    )

    # Always return 200 OK to Redsys
    return {"status": "ok"}


@router.post("/confirm-return")
async def confirm_return(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Process Redsys parameters received via URL return (GET redirect).
    
    When Redsys redirects the user back to the frontend with payment=success,
    the Ds_MerchantParameters and Ds_Signature are included as URL parameters.
    The frontend sends them here so we can verify the signature and update the
    payment status as a fallback when the webhook (merchant_url) cannot reach
    the server (e.g. localhost development or network issues).
    
    This is a PUBLIC endpoint (no auth required).
    """
    body = await request.json()
    ds_merchant_params = body.get("Ds_MerchantParameters", "")
    ds_signature = body.get("Ds_Signature", "")

    if not ds_merchant_params or not ds_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parámetros de Redsys incompletos",
        )

    # Verify HMAC signature
    params = redsys_service.verify_notification(ds_merchant_params, ds_signature)
    if params is None:
        logger.error("confirm-return: INVALID SIGNATURE")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firma inválida",
        )

    # Extract fields
    order_id = params.get("Ds_Order", "")
    response_code = params.get("Ds_Response", "9999")
    amount_str = params.get("Ds_Amount", "0")
    auth_code = params.get("Ds_AuthorisationCode", "")
    card_brand = params.get("Ds_Card_Brand", "")
    merchant_code = params.get("Ds_MerchantCode", "")
    redsys_identifier = params.get("Ds_Merchant_Identifier", "")
    redsys_cof_txnid = params.get("Ds_Merchant_Cof_Txnid", "")
    card_number = params.get("Ds_Card_Number", "")
    card_last4 = params.get("Ds_Card_Last4", "")
    secure_payment = params.get("Ds_SecurePayment", "")
    card_country = params.get("Ds_Card_Country", "")

    # Security: verify merchant code
    if merchant_code and merchant_code != redsys_service.config.merchant_code:
        logger.error(f"confirm-return: merchant code mismatch! Expected={redsys_service.config.merchant_code}, Got={merchant_code}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Merchant code mismatch")

    # Find payment
    result = await db.execute(
        select(Payment).where(
            Payment.extra_data["redsys_order_id"].astext == order_id
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        logger.error(f"confirm-return: payment not found for order {order_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    # If already processed (e.g. webhook arrived first), just return current status
    if payment.status != PaymentStatus.pending:
        return {
            "status": "ok",
            "payment_status": payment.status.value,
            "already_processed": True,
        }

    # Verify amount
    try:
        notified_amount_cents = int(amount_str)
        expected_amount_cents = int(round(float(payment.amount) * 100))
        if notified_amount_cents != expected_amount_cents:
            logger.error(f"confirm-return: amount mismatch for payment {payment.id}!")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount mismatch")
    except (ValueError, TypeError):
        pass

    # Determine success/failure
    is_success = redsys_service.is_successful_response(response_code)
    response_message = redsys_service.get_response_code_message(response_code)

    if is_success:
        payment.status = PaymentStatus.succeeded
        payment.paid_at = datetime.utcnow()
    else:
        payment.status = PaymentStatus.failed

    # Store Redsys response data and COF tokens
    brand_map = {"1": "Visa", "2": "Mastercard", "8": "Amex", "9": "JCB", "6": "Diners"}
    payment.extra_data = {
        **(payment.extra_data or {}),
        "redsys_response": params,
        "redsys_response_code": response_code,
        "redsys_response_message": response_message,
        "redsys_auth_code": auth_code,
        "redsys_card_country": card_country,
        "redsys_card_brand": card_brand,
        "redsys_card_brand_name": brand_map.get(card_brand, card_brand),
        "redsys_card_number": card_number,
        "redsys_card_last4": card_last4 or (card_number[-4:] if len(card_number) >= 4 else ""),
        "redsys_secure_payment": secure_payment,
        "redsys_confirmed_via": "return_url",
        "redsys_confirmed_at": datetime.utcnow().isoformat(),
    }

    if redsys_identifier:
        payment.extra_data["redsys_identifier"] = redsys_identifier
    if redsys_cof_txnid:
        payment.extra_data["redsys_cof_txnid"] = redsys_cof_txnid

    if is_success:
        try:
            await create_invoice_for_payment(db, payment)
        except Exception as e:
            logger.error(f"Auto-invoice failed for payment {payment.id} (confirm-return): {e}")

    await db.commit()

    logger.info(
        f"confirm-return: payment {payment.id} updated to {payment.status.value} "
        f"(order={order_id}, response={response_code})"
    )

    return {
        "status": "ok",
        "payment_status": payment.status.value,
        "already_processed": False,
    }


@router.get("/payment-status/{order_id}", response_model=PaymentStatusResponse)
async def get_payment_status(
    order_id: str,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Obtener el estado de un pago por order_id de Redsys.
    """
    result = await db.execute(
        select(Payment).where(
            and_(
                Payment.extra_data["redsys_order_id"].astext == order_id,
                Payment.workspace_id == current_user.workspace_id,
            )
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pago no encontrado",
        )

    extra = payment.extra_data or {}

    return PaymentStatusResponse(
        payment_id=payment.id,
        order_id=order_id,
        status=payment.status.value,
        amount=float(payment.amount),
        currency=payment.currency,
        description=payment.description,
        paid_at=payment.paid_at,
        response_code=extra.get("redsys_response_code"),
        response_message=extra.get("redsys_response_message"),
        authorization_code=extra.get("redsys_auth_code"),
        card_country=extra.get("redsys_card_country"),
        card_brand=extra.get("redsys_card_brand"),
    )


@router.post("/refund", response_model=RefundResponse)
async def refund_payment(
    data: RefundRequest,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """
    Realizar una devolución de un pago hecho por Redsys.
    
    Usa la API REST de Redsys (trataPeticionREST) para procesar el reembolso.
    """
    # Find original payment
    result = await db.execute(
        select(Payment).where(
            and_(
                Payment.id == data.payment_id,
                Payment.workspace_id == current_user.workspace_id,
            )
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    extra = payment.extra_data or {}
    if extra.get("gateway") != "redsys":
        raise HTTPException(status_code=400, detail="Este pago no fue procesado por Redsys")

    if payment.status != PaymentStatus.succeeded:
        raise HTTPException(status_code=400, detail="Solo se pueden devolver pagos completados")

    # Determine refund amount
    refund_amount = data.amount or float(payment.amount)
    if refund_amount > float(payment.amount):
        raise HTTPException(status_code=400, detail="El monto de devolución excede el pago original")

    refund_amount_cents = int(round(refund_amount * 100))

    # Generate new order for refund
    refund_order_id = redsys_service.generate_order_id()

    refund = RedsysRefund(
        order_id=refund_order_id,
        original_amount=refund_amount_cents,
    )
    refund_data = redsys_service.create_refund_request(refund)

    logger.info(f"Sending refund to Redsys: order={refund_order_id}, amount={refund_amount_cents}c")

    # Send refund request to Redsys REST endpoint
    try:
        async with httpx.AsyncClient(timeout=30.0) as client_http:
            response = await client_http.post(
                refund_data["rest_url"],
                json={
                    "Ds_SignatureVersion": refund_data["Ds_SignatureVersion"],
                    "Ds_MerchantParameters": refund_data["Ds_MerchantParameters"],
                    "Ds_Signature": refund_data["Ds_Signature"],
                },
                headers={"Content-Type": "application/json"},
            )

        if response.status_code == 200:
            resp_json = response.json()
            resp_params_b64 = resp_json.get("Ds_MerchantParameters", "")

            if resp_params_b64:
                resp_params = _decode_merchant_params(resp_params_b64)
                resp_code = resp_params.get("Ds_Response", "9999")
                resp_message = redsys_service.get_response_code_message(resp_code)

                if redsys_service.is_successful_response(resp_code):
                    payment.status = PaymentStatus.refunded
                    payment.refunded_at = datetime.utcnow()
                    payment.extra_data = {
                        **extra,
                        "refund_order_id": refund_order_id,
                        "refund_response_code": resp_code,
                        "refund_response_message": resp_message,
                        "refund_amount": refund_amount,
                        "refund_reason": data.reason,
                        "refunded_at": datetime.utcnow().isoformat(),
                    }
                    await db.commit()

                    logger.info(f"Refund successful: {refund_order_id}")
                    return RefundResponse(
                        success=True,
                        refund_order_id=refund_order_id,
                        response_code=resp_code,
                        response_message=resp_message,
                    )
                else:
                    logger.warning(f"Refund failed: {resp_code} - {resp_message}")
                    return RefundResponse(
                        success=False,
                        refund_order_id=refund_order_id,
                        response_code=resp_code,
                        response_message=resp_message,
                    )
            else:
                error_code = resp_json.get("errorCode", "UNKNOWN")
                logger.error(f"Redsys refund error: {error_code}")
                return RefundResponse(
                    success=False,
                    refund_order_id=refund_order_id,
                    response_code=error_code,
                    response_message=f"Error de Redsys: {error_code}",
                )
        else:
            logger.error(f"Redsys refund HTTP error: {response.status_code}")
            raise HTTPException(status_code=502, detail=f"Error de comunicación con Redsys: {response.status_code}")

    except httpx.RequestError as e:
        logger.error(f"Redsys refund connection error: {e}")
        raise HTTPException(status_code=502, detail=f"No se pudo conectar con Redsys: {str(e)}")


@router.get("/config-status", response_model=RedsysConfigStatus)
async def get_redsys_config_status(
    current_user: CurrentUser = Depends(require_staff),
):
    """
    Verificar el estado de configuración de Redsys.
    """
    config = redsys_service.config
    return RedsysConfigStatus(
        configured=bool(config.merchant_code and config.secret_key),
        environment=config.environment,
        merchant_code_set=bool(config.merchant_code),
        secret_key_set=bool(config.secret_key),
        terminal=config.terminal,
    )


@router.get("/response-codes")
async def get_response_codes(
    current_user: CurrentUser = Depends(require_workspace),
):
    """
    Obtener lista de códigos de respuesta de Redsys y sus significados.
    """
    return {
        "success_range": "0000-0099: Operación aprobada",
        "codes": {
            "0000": "Transacción aprobada",
            "0001": "Transacción aprobada previa identificación del titular",
            "0099": "Operación frictionless aprobada",
            "0101": "Tarjeta caducada",
            "0102": "Tarjeta en excepción transitoria o bajo sospecha de fraude",
            "0104": "Operación no permitida para esa tarjeta o terminal",
            "0106": "Intentos de PIN excedidos",
            "0116": "Disponible insuficiente",
            "0118": "Tarjeta no registrada",
            "0125": "Tarjeta no efectiva",
            "0129": "Código de seguridad (CVV2/CVC2) incorrecto",
            "0172": "Denegada – la marca ordena no repetir",
            "0173": "Denegada – la marca ordena no repetir sin actualizar datos",
            "0174": "Denegada – la marca ordena no repetir hasta 72h",
            "0180": "Tarjeta ajena al servicio",
            "0184": "Error en la autenticación del titular",
            "0190": "Denegación sin especificar motivo",
            "0191": "Fecha de caducidad errónea",
            "0202": "Tarjeta en excepción transitoria",
            "0904": "Comercio no registrado en FUC",
            "0909": "Error de sistema",
            "0912": "Emisor no disponible",
            "0913": "Pedido repetido",
            "0944": "Sesión incorrecta",
            "0950": "Operación de devolución no permitida",
            "9064": "Número de posiciones del CVV2/CVC2 incorrecto",
            "9078": "No existe método de pago válido",
            "9093": "Tarjeta no existente",
            "9094": "Rechazo servidores internacionales",
            "9104": "Operación rechazada por el comercio",
            "9218": "Comercio no permite op. seguras por entrada/telefonía",
            "9253": "Tarjeta no cumple el check-digit",
            "9256": "Comercio no puede realizar preautorizaciones",
            "9257": "Tarjeta no permite preautorizaciones",
            "9261": "Superado el control de restricciones",
            "9915": "Pago cancelado por el usuario",
            "9929": "Anulación de autorización en diferido",
            "9997": "Procesando otra transacción con la misma tarjeta",
            "9998": "En proceso de solicitud de datos de tarjeta",
            "9999": "Redirigida al emisor a autenticar",
        },
        "test_cards": {
            "visa_emv3ds_2.2": {
                "number": "4548810000000003",
                "expiry": "12/49",
                "cvv": "123",
            },
            "mastercard_emv3ds_2.1": {
                "number": "5576441563045037",
                "expiry": "12/49",
                "cvv": "123",
            },
        },
        "test_cvv_cases": {
            "999": "Simula denegación",
            "172": "Simula denegación 172 (marca ordena no repetir)",
            "173": "Simula denegación 173 (no repetir sin actualizar)",
            "174": "Simula denegación 174 (no repetir hasta 72h)",
        },
    }
