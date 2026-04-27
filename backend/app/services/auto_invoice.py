"""
Automatic invoice generation when a payment succeeds.
Called from all payment success points: manual mark-paid, Redsys webhook,
SeQura IPN, and recurring payment tasks.
"""

import logging
import uuid
from datetime import date, datetime, timezone
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.erp import Invoice, InvoiceAuditLog, InvoiceItem, InvoiceSettings
from app.models.payment import Payment
from app.services.verifactu import VeriFactuService

logger = logging.getLogger(__name__)


def _generate_invoice_number(prefix: str, year: int, number: int) -> str:
    return f"{prefix}{year}-{str(number).zfill(5)}"


# Mapeo mínimo de country_code (ISO-3166 alpha-2) a nombre legible para los
# fallbacks de billing. Solo cubrimos los casos que realmente usamos en
# facturación; cualquier otro código se devuelve tal cual.
_COUNTRY_CODE_NAMES = {
    "ES": "España",
    "AD": "Andorra",
    "PT": "Portugal",
    "FR": "Francia",
    "IT": "Italia",
    "DE": "Alemania",
    "GB": "Reino Unido",
    "US": "Estados Unidos",
    "MX": "México",
    "AR": "Argentina",
    "CL": "Chile",
    "CO": "Colombia",
}


def _country_from_code(code: str) -> Optional[str]:
    if not code:
        return None
    return _COUNTRY_CODE_NAMES.get(code.upper(), code.upper())


async def _get_settings(db: AsyncSession, workspace_id: UUID) -> Optional[InvoiceSettings]:
    result = await db.execute(
        select(InvoiceSettings).where(InvoiceSettings.workspace_id == workspace_id)
    )
    return result.scalar_one_or_none()


async def create_invoice_for_payment(
    db: AsyncSession,
    payment: Payment,
    *,
    user_id: Optional[UUID] = None,
    user_name: Optional[str] = None,
    ip_address: Optional[str] = None,
    auto_finalize: bool = True,
) -> Optional[Invoice]:
    """
    Create an invoice linked to a completed payment.
    Returns the created Invoice or None if invoicing is not configured.
    """
    if not payment.workspace_id:
        logger.warning(f"Payment {payment.id} has no workspace_id, skipping invoice")
        return None

    settings = await _get_settings(db, payment.workspace_id)
    if not settings:
        logger.info(f"No invoice settings for workspace {payment.workspace_id}, skipping auto-invoice")
        return None

    client: Optional[Client] = None
    if payment.client_id:
        result = await db.execute(select(Client).where(Client.id == payment.client_id))
        client = result.scalar_one_or_none()
        if client is None:
            logger.warning(
                "Payment %s has client_id=%s but client was not found (deleted?). "
                "Falling back to extra_data customer info.",
                payment.id, payment.client_id,
            )

    prefix = settings.invoice_prefix or "F"
    next_number = settings.invoice_next_number or 1
    year = date.today().year
    invoice_number = _generate_invoice_number(prefix, year, next_number)

    amount = float(payment.amount or 0)

    client_name = "Cliente sin identificar"
    client_email = None
    client_tax_id = None
    client_address = None
    client_city = None
    client_postal_code = None
    client_country = "España"

    if client:
        full_name = f"{client.first_name or ''} {client.last_name or ''}".strip()
        if full_name:
            client_name = full_name
        client_email = client.email
        client_tax_id = client.tax_id
        client_address = client.billing_address
        client_city = client.billing_city
        client_postal_code = client.billing_postal_code
        client_country = client.billing_country or "España"
    else:
        # Fallback: usar info que viaja en payment.extra_data (p.ej. SeQura
        # onboarding genera Payments antes de crear el Client). Esto evita
        # facturas con "Cliente sin identificar" cuando sí tenemos los datos.
        extra = payment.extra_data or {}
        order_data = extra.get("sequra_order_data") or {}
        customer = order_data.get("customer") or {}
        delivery_address = order_data.get("delivery_address") or order_data.get("invoice_address") or {}

        given = (customer.get("given_names") or "").strip()
        surname = (customer.get("surnames") or "").strip()
        composed_name = f"{given} {surname}".strip()
        if composed_name:
            client_name = composed_name
        client_email = customer.get("email") or None
        client_tax_id = customer.get("nin") or customer.get("vat_number") or None
        client_address = delivery_address.get("address_line_1") or None
        client_city = delivery_address.get("city") or None
        client_postal_code = delivery_address.get("postal_code") or None
        country_code = (delivery_address.get("country_code") or "").upper()
        client_country = _country_from_code(country_code) or "España"

    # Regla fiscal vigente del proyecto: el IVA solo aplica cuando el cliente
    # es de Andorra. Para cualquier otro país (España, resto UE, internacional)
    # la base sale al 0%. Además, el IVA se SUMA al importe del producto en
    # lugar de descontarlo: payment.amount = precio neto del producto.
    default_rate = float(settings.default_tax_rate or 21)
    tax_rate = default_rate if (client_country or "").strip().lower() == "andorra" else 0.0

    base_imponible = round(amount, 2)
    tax_amount = round(base_imponible * tax_rate / 100, 2)
    total_amount = round(base_imponible + tax_amount, 2)

    invoice_type = "F1" if client_tax_id else "F2"

    # Generamos la PK en Python para poder enlazar items y audit logs
    # antes de hacer flush. El modelo tiene server_default, pero al asignarlo
    # explícitamente nos aseguramos de que invoice.id sea conocido al instante,
    # lo cual evita que los InvoiceAuditLog se inserten con invoice_id=NULL
    # (que rompe la NOT NULL constraint).
    invoice = Invoice(
        id=uuid.uuid4(),
        workspace_id=payment.workspace_id,
        invoice_number=invoice_number,
        invoice_series="F",
        invoice_type=invoice_type,
        client_id=payment.client_id,
        client_name=client_name,
        client_tax_id=client_tax_id,
        client_address=client_address,
        client_city=client_city,
        client_postal_code=client_postal_code,
        client_country=client_country,
        client_email=client_email,
        issue_date=date.today(),
        due_date=date.today(),
        status="draft",
        subtotal=base_imponible,
        tax_amount=tax_amount,
        discount_amount=0,
        total=total_amount,
        tax_rate=tax_rate,
        tax_name=settings.default_tax_name or "IVA",
        payment_method=_resolve_payment_method(payment),
        payment_id=payment.id,
        notes=None,
    )
    db.add(invoice)

    item = InvoiceItem(
        description=payment.description or "Servicio de entrenamiento personal",
        quantity=1,
        unit_price=base_imponible,
        tax_rate=tax_rate,
        tax_name=settings.default_tax_name or "IVA",
        subtotal=base_imponible,
        tax_amount=tax_amount,
        total=total_amount,
        position=0,
    )
    invoice.items.append(item)

    settings.invoice_next_number = next_number + 1

    audit = InvoiceAuditLog(
        workspace_id=payment.workspace_id,
        action="created",
        new_values={
            "invoice_number": invoice_number,
            "total": total_amount,
            "payment_id": str(payment.id),
            "auto_generated": True,
        },
        user_id=user_id,
        user_name=user_name or "Sistema",
        ip_address=ip_address,
    )
    invoice.audit_logs.append(audit)

    if auto_finalize:
        invoice.status = "finalized"

        # Solo calculamos hash/UUID/QR de VeriFactu cuando está habilitado.
        # Si el toggle está desactivado, la factura NO debe llevar marcas
        # VeriFactu (badge, hash, UUID) ni en el modal ni en el PDF, y desde
        # luego nada se envía a AEAT (ni preproducción ni producción).
        if settings.verifactu_enabled:
            invoice.verifactu_status = "pending"
            try:
                await VeriFactuService.compute_and_set_hash(db, invoice, settings)
            except Exception:
                logger.exception("VeriFactu hash compute failed, continuing without chain hash")
                invoice.verifactu_hash = invoice.verifactu_hash or None

            try:
                resp = await VeriFactuService.send_to_provider(invoice, settings, db_session=db)
                invoice.verifactu_response = resp
                if resp.get("status") == "accepted":
                    invoice.verifactu_status = "accepted"
                    invoice.verifactu_sent_at = datetime.now(timezone.utc)
            except Exception:
                logger.exception(
                    "VeriFactu send_to_provider failed for invoice %s",
                    invoice_number,
                )
                invoice.verifactu_status = "pending"
        else:
            invoice.verifactu_status = None
            invoice.verifactu_hash = None
            invoice.verifactu_uuid = None
            invoice.verifactu_qr_data = None
            invoice.verifactu_prev_hash = None
            invoice.verifactu_response = None

        finalize_audit = InvoiceAuditLog(
            workspace_id=payment.workspace_id,
            action="finalized",
            new_values={
                "verifactu_hash": invoice.verifactu_hash,
                "verifactu_uuid": invoice.verifactu_uuid,
                "auto_finalized": True,
            },
            user_id=user_id,
            user_name=user_name or "Sistema",
            ip_address=ip_address,
        )
        invoice.audit_logs.append(finalize_audit)

    logger.info(
        f"Auto-invoice {invoice_number} created for payment {payment.id} "
        f"(amount={amount}, finalized={auto_finalize})"
    )
    return invoice


def _resolve_payment_method(payment: Payment) -> str:
    """Determine payment method label from payment metadata."""
    extra = payment.extra_data or {}

    if extra.get("redsys_auth_code"):
        brand = extra.get("redsys_card_brand_name", "Tarjeta")
        last4 = extra.get("redsys_card_last4", "")
        return f"{brand} ****{last4}" if last4 else brand

    if extra.get("sequra_order_ref"):
        return "SeQura (pago fraccionado)"

    if payment.stripe_payment_intent_id:
        return "Stripe"

    return "Cobro manual"
