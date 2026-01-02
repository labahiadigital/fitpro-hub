"""Redsys payment gateway endpoints."""
from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.models.payment import Payment, PaymentStatus
from app.models.client import Client
from app.middleware.auth import require_workspace, require_staff, CurrentUser
from app.services.redsys import redsys_service, RedsysPayment

router = APIRouter()


# ============ SCHEMAS ============

class RedsysPaymentRequest(BaseModel):
    client_id: UUID
    amount: float  # Amount in EUR
    description: str
    ok_url: str
    ko_url: str
    merchant_url: str  # Notification URL


class RedsysPaymentResponse(BaseModel):
    Ds_SignatureVersion: str
    Ds_MerchantParameters: str
    Ds_Signature: str
    redsys_url: str
    order_id: str
    payment_id: UUID


# ============ ENDPOINTS ============

@router.post("/create-payment", response_model=RedsysPaymentResponse)
async def create_redsys_payment(
    data: RedsysPaymentRequest,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un pago con Redsys.
    Devuelve los parámetros necesarios para el formulario de pago.
    """
    # Verify client exists
    result = await db.execute(
        select(Client).where(
            Client.id == data.client_id,
            Client.workspace_id == current_user.workspace_id
        )
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    
    # Generate order ID
    order_id = redsys_service.generate_order_id()
    
    # Create payment record in database
    payment = Payment(
        workspace_id=current_user.workspace_id,
        client_id=data.client_id,
        description=data.description,
        amount=data.amount,
        currency="EUR",
        status=PaymentStatus.PENDING,
        payment_type="one_time",
        extra_data={
            "redsys_order_id": order_id,
            "gateway": "redsys"
        }
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    
    # Create Redsys payment request
    redsys_payment = RedsysPayment(
        order_id=order_id,
        amount=int(data.amount * 100),  # Convert to cents
        currency="978",  # EUR
        description=data.description[:125],  # Max 125 chars
        merchant_url=data.merchant_url,
        ok_url=data.ok_url,
        ko_url=data.ko_url
    )
    
    # Get payment form data
    form_data = redsys_service.create_payment_request(redsys_payment)
    
    return RedsysPaymentResponse(
        **form_data,
        order_id=order_id,
        payment_id=payment.id
    )


@router.post("/notification")
async def redsys_notification(
    request: Request,
    Ds_SignatureVersion: str = Form(...),
    Ds_MerchantParameters: str = Form(...),
    Ds_Signature: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Recibir notificación de Redsys (webhook).
    Este endpoint es llamado por Redsys cuando se completa un pago.
    """
    # Verify signature and get parameters
    params = redsys_service.verify_notification(Ds_MerchantParameters, Ds_Signature)
    
    if not params:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firma inválida"
        )
    
    # Get order ID and response code
    order_id = params.get("Ds_Order", "")
    response_code = params.get("Ds_Response", "9999")
    
    # Find payment by order ID
    result = await db.execute(
        select(Payment).where(
            Payment.extra_data["redsys_order_id"].astext == order_id
        )
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        # Log error but return OK to Redsys
        return {"status": "ok", "message": "Payment not found"}
    
    # Update payment status based on response code
    is_success = redsys_service.is_successful_response(response_code)
    
    if is_success:
        payment.status = PaymentStatus.SUCCEEDED
        payment.paid_at = datetime.utcnow()
    else:
        payment.status = PaymentStatus.FAILED
    
    # Store Redsys response data
    payment.extra_data = {
        **payment.extra_data,
        "redsys_response": params,
        "redsys_response_code": response_code,
        "redsys_response_message": redsys_service.get_response_code_message(response_code)
    }
    
    await db.commit()
    
    return {"status": "ok"}


@router.get("/payment-status/{order_id}")
async def get_payment_status(
    order_id: str,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener el estado de un pago por order_id de Redsys.
    """
    result = await db.execute(
        select(Payment).where(
            Payment.extra_data["redsys_order_id"].astext == order_id,
            Payment.workspace_id == current_user.workspace_id
        )
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pago no encontrado"
        )
    
    return {
        "payment_id": payment.id,
        "order_id": order_id,
        "status": payment.status.value,
        "amount": payment.amount,
        "currency": payment.currency,
        "description": payment.description,
        "paid_at": payment.paid_at,
        "response_message": payment.extra_data.get("redsys_response_message")
    }


@router.get("/response-codes")
async def get_response_codes(
    current_user: CurrentUser = Depends(require_workspace),
):
    """
    Obtener lista de códigos de respuesta de Redsys y sus significados.
    """
    return {
        "codes": {
            "0000": "Transacción aprobada",
            "0001": "Transacción aprobada previa identificación del titular",
            "0101": "Tarjeta caducada",
            "0102": "Tarjeta en excepción transitoria o bajo sospecha de fraude",
            "0104": "Operación no permitida para esa tarjeta o terminal",
            "0106": "Intentos de PIN excedidos",
            "0116": "Disponible insuficiente",
            "0129": "Código de seguridad (CVV2/CVC2) incorrecto",
            "0180": "Tarjeta ajena al servicio",
            "0190": "Denegación sin especificar motivo",
            "0191": "Fecha de caducidad errónea",
            "0909": "Error de sistema",
            "0913": "Pedido repetido",
            "9915": "A petición del usuario se ha cancelado el pago",
        }
    }
