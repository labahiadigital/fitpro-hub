"""
Automatic invoice generation when a payment succeeds.
Called from all payment success points: manual mark-paid, Redsys webhook,
SeQura IPN, and recurring payment tasks.
"""

import logging
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

    prefix = settings.invoice_prefix or "F"
    next_number = settings.invoice_next_number or 1
    year = date.today().year
    invoice_number = _generate_invoice_number(prefix, year, next_number)

    tax_rate = float(settings.default_tax_rate or 21)
    amount = float(payment.amount or 0)

    base_imponible = round(amount / (1 + tax_rate / 100), 2)
    tax_amount = round(amount - base_imponible, 2)

    client_name = "Cliente sin identificar"
    client_email = None
    client_tax_id = None
    client_address = None
    client_city = None
    client_postal_code = None
    client_country = "España"

    if client:
        client_name = f"{client.first_name} {client.last_name}".strip()
        client_email = client.email
        client_tax_id = client.tax_id
        client_address = client.billing_address
        client_city = client.billing_city
        client_postal_code = client.billing_postal_code
        client_country = client.billing_country or "España"

    invoice_type = "F1" if client_tax_id else "F2"

    invoice = Invoice(
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
        total=amount,
        tax_rate=tax_rate,
        tax_name=settings.default_tax_name or "IVA",
        payment_method=_resolve_payment_method(payment),
        payment_id=payment.id,
        notes=None,
    )
    db.add(invoice)

    item = InvoiceItem(
        invoice_id=invoice.id,
        description=payment.description or "Servicio de entrenamiento personal",
        quantity=1,
        unit_price=base_imponible,
        tax_rate=tax_rate,
        tax_name=settings.default_tax_name or "IVA",
        subtotal=base_imponible,
        tax_amount=tax_amount,
        total=amount,
        position=0,
    )
    invoice.items.append(item)

    settings.invoice_next_number = next_number + 1

    audit = InvoiceAuditLog(
        invoice_id=invoice.id,
        workspace_id=payment.workspace_id,
        action="created",
        new_values={
            "invoice_number": invoice_number,
            "total": amount,
            "payment_id": str(payment.id),
            "auto_generated": True,
        },
        user_id=user_id,
        user_name=user_name or "Sistema",
        ip_address=ip_address,
    )
    db.add(audit)

    if auto_finalize:
        await VeriFactuService.compute_and_set_hash(db, invoice, settings)
        invoice.status = "finalized"
        invoice.verifactu_status = "pending"

        if settings.verifactu_enabled:
            resp = await VeriFactuService.send_to_provider(invoice, settings, db_session=db)
            invoice.verifactu_response = resp
            if resp.get("status") == "accepted":
                invoice.verifactu_status = "accepted"
                invoice.verifactu_sent_at = datetime.now(timezone.utc)

        finalize_audit = InvoiceAuditLog(
            invoice_id=invoice.id,
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
        db.add(finalize_audit)

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
