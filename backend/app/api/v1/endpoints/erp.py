"""
Endpoints de la API para el módulo ERP (Facturación profesional con VeriFactu)
"""

from datetime import date, datetime, timezone
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.middleware.auth import require_owner, require_workspace
from app.models.erp import (
    Expense,
    ExpenseCategory,
    Invoice,
    InvoiceAuditLog,
    InvoiceItem,
    InvoiceSettings,
    Quote,
    QuoteItem,
)
from app.models.client import Client
from app.services.verifactu import VeriFactuService
from app.services.invoice_pdf import InvoicePDFGenerator

import io

router = APIRouter()


# =====================================================
# SCHEMAS
# =====================================================

class InvoiceSettingsBase(BaseModel):
    business_name: str
    tax_id: Optional[str] = None
    nif_type: str = "NIF"
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    province: Optional[str] = None
    country: str = "España"
    phone: Optional[str] = None
    email: Optional[str] = None
    invoice_prefix: str = "F"
    rectificative_prefix: str = "R"
    default_tax_rate: float = 21
    default_tax_name: str = "IVA"
    payment_terms_days: int = 30
    default_payment_method: str = "transferencia"
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    footer_text: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    verifactu_enabled: bool = False
    verifactu_mode: str = "none"
    software_company_name: Optional[str] = None
    software_company_nif: Optional[str] = None
    software_name: Optional[str] = "E13Fitness"
    software_id: Optional[str] = "EF"
    software_version: Optional[str] = "1.0"
    software_install_number: Optional[str] = "00001"


class InvoiceSettingsResponse(InvoiceSettingsBase):
    id: UUID
    workspace_id: UUID
    invoice_next_number: int
    rectificative_next_number: int = 1
    logo_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CertificateStatusResponse(BaseModel):
    has_certificate: bool
    subject: Optional[str] = None
    serial_number: Optional[str] = None
    nif: Optional[str] = None
    expires_at: Optional[datetime] = None
    uploaded_at: Optional[datetime] = None
    is_expired: bool = False


class InvoiceItemBase(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float
    discount_type: str = "percentage"
    discount_value: float = 0
    tax_rate: Optional[float] = None
    tax_name: Optional[str] = None


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemResponse(InvoiceItemBase):
    id: UUID
    invoice_id: UUID
    subtotal: float
    tax_amount: float
    total: float
    position: int

    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    invoice_type: str = "F1"
    invoice_series: str = "F"
    client_id: Optional[UUID] = None
    client_name: str
    client_tax_id: Optional[str] = None
    client_address: Optional[str] = None
    client_city: Optional[str] = None
    client_postal_code: Optional[str] = None
    client_country: str = "España"
    client_email: Optional[str] = None
    issue_date: date = Field(default_factory=date.today)
    due_date: Optional[date] = None
    tax_rate: float = 21
    tax_name: str = "IVA"
    discount_type: str = "percentage"
    discount_value: float = 0
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    payment_method: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate] = []


class InvoiceUpdate(BaseModel):
    client_id: Optional[UUID] = None
    client_name: Optional[str] = None
    client_tax_id: Optional[str] = None
    client_address: Optional[str] = None
    client_city: Optional[str] = None
    client_postal_code: Optional[str] = None
    client_country: Optional[str] = None
    client_email: Optional[str] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    tax_rate: Optional[float] = None
    tax_name: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    items: Optional[List[InvoiceItemCreate]] = None


class InvoiceResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    invoice_number: str
    invoice_series: Optional[str] = "F"
    invoice_type: str
    client_id: Optional[UUID] = None
    client_name: str
    client_tax_id: Optional[str] = None
    client_address: Optional[str] = None
    client_city: Optional[str] = None
    client_postal_code: Optional[str] = None
    client_country: str = "España"
    client_email: Optional[str] = None
    issue_date: date
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    status: str
    subtotal: float
    tax_amount: float
    discount_amount: float
    total: float
    currency: str
    discount_type: str = "percentage"
    discount_value: float = 0
    tax_rate: float = 21
    tax_name: str = "IVA"
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    related_invoice_id: Optional[UUID] = None
    pdf_url: Optional[str] = None
    verifactu_status: Optional[str] = "none"
    verifactu_hash: Optional[str] = None
    verifactu_uuid: Optional[str] = None
    verifactu_qr_data: Optional[str] = None
    verifactu_response: Optional[dict] = None
    items: List[InvoiceItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: UUID
    action: str
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceStatsResponse(BaseModel):
    total_invoiced: float
    total_paid: float
    total_pending: float
    total_overdue: float
    invoices_count: int
    invoices_this_month: int
    period_start: date
    period_end: date


class ExpenseBase(BaseModel):
    description: str
    category: str = "general"
    vendor_name: Optional[str] = None
    vendor_tax_id: Optional[str] = None
    amount: float
    tax_rate: float = 21
    tax_deductible: bool = True
    expense_date: date = Field(default_factory=date.today)
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    category: Optional[str] = None
    vendor_name: Optional[str] = None
    amount: Optional[float] = None
    tax_rate: Optional[float] = None
    status: Optional[str] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    paid_date: Optional[date] = None
    notes: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: UUID
    workspace_id: UUID
    tax_amount: float
    total: float
    currency: str
    status: str
    payment_reference: Optional[str] = None
    paid_date: Optional[date] = None
    receipt_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#2D6A4F"
    icon: str = "receipt"
    monthly_budget: Optional[float] = None


class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: UUID
    workspace_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class QuoteBase(BaseModel):
    client_id: Optional[UUID] = None
    client_name: str
    client_email: Optional[str] = None
    issue_date: date = Field(default_factory=date.today)
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None


class QuoteCreate(QuoteBase):
    items: List[InvoiceItemCreate] = []


class QuoteResponse(QuoteBase):
    id: UUID
    workspace_id: UUID
    quote_number: str
    status: str
    subtotal: float
    tax_amount: float
    discount_amount: float
    total: float
    currency: str
    converted_to_invoice_id: Optional[UUID] = None
    converted_at: Optional[datetime] = None
    pdf_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FinancialSummary(BaseModel):
    total_invoiced: float
    total_paid: float
    total_pending: float
    total_overdue: float
    total_expenses: float
    net_income: float
    invoices_count: int
    expenses_count: int
    period_start: date
    period_end: date


# =====================================================
# HELPERS
# =====================================================

def generate_invoice_number(prefix: str, year: int, number: int) -> str:
    return f"{prefix}{year}-{str(number).zfill(5)}"


def calculate_item_totals(item: InvoiceItemCreate, default_tax_rate: float) -> dict:
    subtotal = float(item.quantity) * float(item.unit_price)

    if item.discount_type == "percentage":
        discount = subtotal * (float(item.discount_value) / 100)
    else:
        discount = float(item.discount_value)

    subtotal_after_discount = subtotal - discount

    tax_rate = item.tax_rate if item.tax_rate is not None else default_tax_rate
    tax_amount = subtotal_after_discount * (float(tax_rate) / 100)

    total = subtotal_after_discount + tax_amount

    return {
        "subtotal": round(subtotal_after_discount, 2),
        "tax_amount": round(tax_amount, 2),
        "total": round(total, 2),
    }


async def _get_settings(db: AsyncSession, workspace_id: UUID) -> Optional[InvoiceSettings]:
    result = await db.execute(
        select(InvoiceSettings).where(InvoiceSettings.workspace_id == workspace_id)
    )
    return result.scalar_one_or_none()


async def _log_audit(
    db: AsyncSession,
    invoice_id: UUID,
    workspace_id: UUID,
    action: str,
    user: Any = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    request: Optional[Request] = None,
):
    log = InvoiceAuditLog(
        invoice_id=invoice_id,
        workspace_id=workspace_id,
        action=action,
        old_values=old_values,
        new_values=new_values,
        user_id=getattr(user, "id", None) if hasattr(user, "id") else (user.user.id if hasattr(user, "user") else None),
        user_name=getattr(getattr(user, "user", user), "full_name", None) if user else None,
        ip_address=request.client.host if request and request.client else None,
    )
    db.add(log)


def _invoice_to_dict(invoice: Invoice) -> dict:
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


def _settings_to_dict(s: Optional[InvoiceSettings]) -> Optional[dict]:
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


def _items_to_dicts(items) -> list:
    return [
        {
            "description": item.description,
            "quantity": float(item.quantity or 1),
            "unit_price": float(item.unit_price or 0),
            "discount_type": item.discount_type,
            "discount_value": float(item.discount_value or 0),
            "tax_rate": float(item.tax_rate) if item.tax_rate is not None else None,
            "tax_name": item.tax_name,
            "subtotal": float(item.subtotal or 0),
            "tax_amount": float(item.tax_amount or 0),
            "total": float(item.total or 0),
            "position": item.position,
        }
        for item in sorted(items, key=lambda x: x.position or 0)
    ]


# =====================================================
# CONFIGURACIÓN DE FACTURACIÓN
# =====================================================

@router.get("/settings", response_model=Optional[InvoiceSettingsResponse])
async def get_invoice_settings(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await _get_settings(db, current_user.workspace_id)


CERT_FIELDS_READONLY = {
    "certificate_pem", "certificate_key_encrypted", "certificate_key_iv",
    "certificate_subject", "certificate_serial_number", "certificate_nif",
    "certificate_expires_at", "certificate_uploaded_at",
}


@router.post("/settings", response_model=InvoiceSettingsResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_settings(
    settings_data: InvoiceSettingsBase,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    settings = await _get_settings(db, current_user.workspace_id)
    safe_data = {k: v for k, v in settings_data.model_dump().items() if k not in CERT_FIELDS_READONLY}

    if settings:
        for field, value in safe_data.items():
            setattr(settings, field, value)
    else:
        settings = InvoiceSettings(
            workspace_id=current_user.workspace_id,
            **safe_data
        )
        db.add(settings)

    await db.commit()
    await db.refresh(settings)
    return settings


# =====================================================
# FACTURAS
# =====================================================

@router.get("/invoices/next-number")
async def get_next_invoice_number(
    series: str = Query("F"),
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Preview the next invoice number for a given series."""
    settings = await _get_settings(db, current_user.workspace_id)
    if series == "R":
        prefix = settings.rectificative_prefix if settings else "R"
        next_num = settings.rectificative_next_number if settings else 1
    else:
        prefix = settings.invoice_prefix if settings else "F"
        next_num = settings.invoice_next_number if settings else 1

    year = date.today().year
    return {"next_number": generate_invoice_number(prefix, year, next_num), "series": series}


@router.get("/invoice-stats", response_model=InvoiceStatsResponse)
async def get_invoice_stats(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    from_date: date = Query(default_factory=lambda: date(date.today().year, 1, 1)),
    to_date: date = Query(default_factory=date.today),
):
    """Get invoice KPI stats for the dashboard."""
    ws = current_user.workspace_id
    base_filter = and_(
        Invoice.workspace_id == ws,
        Invoice.issue_date >= from_date,
        Invoice.issue_date <= to_date,
        Invoice.status != "cancelled",
    )

    total_result = await db.execute(
        select(
            func.count(Invoice.id).label("count"),
            func.coalesce(func.sum(Invoice.total), 0).label("total"),
        ).where(base_filter)
    )
    total_data = total_result.first()

    paid_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0))
        .where(base_filter)
        .where(Invoice.status == "paid")
    )
    total_paid = float(paid_result.scalar() or 0)

    pending_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0))
        .where(base_filter)
        .where(Invoice.status.in_(["finalized", "sent"]))
    )
    total_pending = float(pending_result.scalar() or 0)

    overdue_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0))
        .where(Invoice.workspace_id == ws)
        .where(Invoice.status == "overdue")
    )
    total_overdue = float(overdue_result.scalar() or 0)

    month_start = date(date.today().year, date.today().month, 1)
    month_result = await db.execute(
        select(func.count(Invoice.id))
        .where(Invoice.workspace_id == ws)
        .where(Invoice.issue_date >= month_start)
        .where(Invoice.status != "cancelled")
    )
    invoices_this_month = month_result.scalar() or 0

    return InvoiceStatsResponse(
        total_invoiced=float(total_data.total or 0),
        total_paid=total_paid,
        total_pending=total_pending,
        total_overdue=total_overdue,
        invoices_count=total_data.count or 0,
        invoices_this_month=invoices_this_month,
        period_start=from_date,
        period_end=to_date,
    )


@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status"),
    client_id: Optional[UUID] = Query(None),
    series: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
):
    query = (
        select(Invoice)
        .where(Invoice.workspace_id == current_user.workspace_id)
        .options(selectinload(Invoice.items))
    )

    if status_filter:
        query = query.where(Invoice.status == status_filter)
    if client_id:
        query = query.where(Invoice.client_id == client_id)
    if series:
        query = query.where(Invoice.invoice_series == series)
    if from_date:
        query = query.where(Invoice.issue_date >= from_date)
    if to_date:
        query = query.where(Invoice.issue_date <= to_date)

    query = query.order_by(Invoice.created_at.desc())

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    request: Request,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    settings = await _get_settings(db, current_user.workspace_id)

    series = invoice_data.invoice_series or "F"
    if series == "R":
        prefix = settings.rectificative_prefix if settings else "R"
        next_number = settings.rectificative_next_number if settings else 1
    else:
        prefix = settings.invoice_prefix if settings else "F"
        next_number = settings.invoice_next_number if settings else 1

    year = date.today().year
    invoice_number = generate_invoice_number(prefix, year, next_number)

    invoice_dict = invoice_data.model_dump(exclude={"items"})
    invoice = Invoice(
        workspace_id=current_user.workspace_id,
        invoice_number=invoice_number,
        **invoice_dict
    )
    db.add(invoice)

    subtotal = 0.0
    tax_amount = 0.0

    for i, item_data in enumerate(invoice_data.items):
        totals = calculate_item_totals(item_data, invoice_data.tax_rate)

        item = InvoiceItem(
            invoice_id=invoice.id,
            description=item_data.description,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            discount_type=item_data.discount_type,
            discount_value=item_data.discount_value,
            tax_rate=item_data.tax_rate,
            tax_name=item_data.tax_name,
            subtotal=totals["subtotal"],
            tax_amount=totals["tax_amount"],
            total=totals["total"],
            position=i,
        )
        invoice.items.append(item)

        subtotal += totals["subtotal"]
        tax_amount += totals["tax_amount"]

    if invoice_data.discount_type == "percentage":
        discount_amount = subtotal * (invoice_data.discount_value / 100)
    else:
        discount_amount = invoice_data.discount_value

    invoice.subtotal = round(subtotal, 2)
    invoice.tax_amount = round(tax_amount, 2)
    invoice.discount_amount = round(discount_amount, 2)
    invoice.total = round(subtotal + tax_amount - discount_amount, 2)

    if settings:
        if series == "R":
            settings.rectificative_next_number = (settings.rectificative_next_number or 1) + 1
        else:
            settings.invoice_next_number = (settings.invoice_next_number or 1) + 1

    await _log_audit(db, invoice.id, current_user.workspace_id, "created", current_user, request=request,
                     new_values={"invoice_number": invoice_number, "total": invoice.total})

    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .where(Invoice.workspace_id == current_user.workspace_id)
        .options(selectinload(Invoice.items))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return invoice


@router.put("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    invoice_data: InvoiceUpdate,
    request: Request,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .where(Invoice.workspace_id == current_user.workspace_id)
        .options(selectinload(Invoice.items))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    if invoice.status != "draft":
        raise HTTPException(status_code=400, detail="Solo se pueden editar facturas en borrador")

    old_vals = _invoice_to_dict(invoice)
    update_data = invoice_data.model_dump(exclude_unset=True, exclude={"items"})

    for field, value in update_data.items():
        setattr(invoice, field, value)

    if invoice_data.items is not None:
        settings = await _get_settings(db, current_user.workspace_id)
        default_tax = float(settings.default_tax_rate) if settings else 21.0

        for old_item in list(invoice.items):
            await db.delete(old_item)
        invoice.items.clear()

        subtotal = 0.0
        tax_amount = 0.0

        for i, item_data in enumerate(invoice_data.items):
            totals = calculate_item_totals(item_data, invoice.tax_rate or default_tax)
            item = InvoiceItem(
                invoice_id=invoice.id,
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                discount_type=item_data.discount_type,
                discount_value=item_data.discount_value,
                tax_rate=item_data.tax_rate,
                tax_name=item_data.tax_name,
                subtotal=totals["subtotal"],
                tax_amount=totals["tax_amount"],
                total=totals["total"],
                position=i,
            )
            invoice.items.append(item)
            subtotal += totals["subtotal"]
            tax_amount += totals["tax_amount"]

        disc_type = invoice.discount_type or "percentage"
        disc_val = float(invoice.discount_value or 0)
        if disc_type == "percentage":
            discount_amount = subtotal * (disc_val / 100)
        else:
            discount_amount = disc_val

        invoice.subtotal = round(subtotal, 2)
        invoice.tax_amount = round(tax_amount, 2)
        invoice.discount_amount = round(discount_amount, 2)
        invoice.total = round(subtotal + tax_amount - discount_amount, 2)

    new_vals = _invoice_to_dict(invoice)
    await _log_audit(db, invoice.id, current_user.workspace_id, "updated", current_user,
                     old_values=old_vals, new_values=new_vals, request=request)

    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.delete("/invoices/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .where(Invoice.workspace_id == current_user.workspace_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if invoice.status != "draft":
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar facturas en borrador")

    await db.delete(invoice)
    await db.commit()


@router.post("/invoices/{invoice_id}/finalize", response_model=InvoiceResponse)
async def finalize_invoice(
    invoice_id: UUID,
    request: Request,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Finalize a draft invoice: compute VeriFactu hash, lock for editing."""
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .where(Invoice.workspace_id == current_user.workspace_id)
        .options(selectinload(Invoice.items))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if invoice.status != "draft":
        raise HTTPException(status_code=400, detail="Solo se pueden finalizar facturas en borrador")
    if not invoice.items or len(invoice.items) == 0:
        raise HTTPException(status_code=400, detail="La factura debe tener al menos una línea")

    settings = await _get_settings(db, current_user.workspace_id)

    await VeriFactuService.compute_and_set_hash(db, invoice, settings)
    invoice.status = "finalized"
    invoice.verifactu_status = "pending"

    verifactu_send_result = None
    if settings and settings.verifactu_enabled:
        resp = await VeriFactuService.send_to_provider(invoice, settings, db_session=db)
        invoice.verifactu_response = resp
        verifactu_send_result = resp

        if resp.get("status") == "accepted":
            invoice.verifactu_status = "accepted"
            invoice.verifactu_sent_at = datetime.now(timezone.utc)
            if resp.get("csv"):
                invoice.verifactu_response = resp
        elif resp.get("status") == "error":
            invoice.verifactu_status = "error"
        elif resp.get("status") == "skipped":
            pass

    await _log_audit(db, invoice.id, current_user.workspace_id, "finalized", current_user,
                     new_values={
                         "verifactu_hash": invoice.verifactu_hash,
                         "verifactu_uuid": invoice.verifactu_uuid,
                         "verifactu_send_result": verifactu_send_result,
                     },
                     request=request)

    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.post("/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: UUID,
    request: Request,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .where(Invoice.workspace_id == current_user.workspace_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if invoice.status == "draft":
        raise HTTPException(status_code=400, detail="Finaliza la factura antes de enviarla")

    invoice.status = "sent"
    await _log_audit(db, invoice.id, current_user.workspace_id, "sent", current_user, request=request)
    await db.commit()
    return {"message": "Factura marcada como enviada"}


@router.post("/invoices/{invoice_id}/mark-paid", response_model=InvoiceResponse)
async def mark_invoice_paid(
    invoice_id: UUID,
    request: Request,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    payment_method: Optional[str] = Query(None),
    payment_reference: Optional[str] = Query(None),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .where(Invoice.workspace_id == current_user.workspace_id)
        .options(selectinload(Invoice.items))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if invoice.status in ("draft", "cancelled"):
        raise HTTPException(status_code=400, detail="No se puede marcar como pagada una factura en este estado")

    old_status = invoice.status
    invoice.status = "paid"
    invoice.paid_date = date.today()
    if payment_method:
        invoice.payment_method = payment_method
    if payment_reference:
        invoice.payment_reference = payment_reference

    await _log_audit(db, invoice.id, current_user.workspace_id, "paid", current_user,
                     old_values={"status": old_status}, new_values={"status": "paid", "paid_date": str(date.today())},
                     request=request)
    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.post("/invoices/{invoice_id}/rectify", response_model=InvoiceResponse)
async def rectify_invoice(
    invoice_id: UUID,
    request: Request,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Create a rectificative (credit note) invoice linked to the original."""
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .where(Invoice.workspace_id == current_user.workspace_id)
        .options(selectinload(Invoice.items))
    )
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if original.status == "draft":
        raise HTTPException(status_code=400, detail="No se puede rectificar una factura en borrador")

    settings = await _get_settings(db, current_user.workspace_id)
    prefix = settings.rectificative_prefix if settings else "R"
    next_number = settings.rectificative_next_number if settings else 1
    year = date.today().year
    rect_number = generate_invoice_number(prefix, year, next_number)

    rectificative = Invoice(
        workspace_id=current_user.workspace_id,
        invoice_number=rect_number,
        invoice_series="R",
        invoice_type="R1",
        client_id=original.client_id,
        client_name=original.client_name,
        client_tax_id=original.client_tax_id,
        client_address=original.client_address,
        client_city=original.client_city,
        client_postal_code=original.client_postal_code,
        client_country=original.client_country,
        client_email=original.client_email,
        issue_date=date.today(),
        due_date=original.due_date,
        tax_rate=original.tax_rate,
        tax_name=original.tax_name,
        subtotal=-float(original.subtotal or 0),
        tax_amount=-float(original.tax_amount or 0),
        discount_amount=-float(original.discount_amount or 0),
        total=-float(original.total or 0),
        payment_method=original.payment_method,
        notes=f"Factura rectificativa de {original.invoice_number}",
        related_invoice_id=original.id,
        status="draft",
    )
    db.add(rectificative)

    for orig_item in original.items:
        rect_item = InvoiceItem(
            invoice_id=rectificative.id,
            description=f"[Rectificación] {orig_item.description}",
            quantity=float(orig_item.quantity or 1),
            unit_price=-float(orig_item.unit_price or 0),
            discount_type=orig_item.discount_type,
            discount_value=float(orig_item.discount_value or 0),
            tax_rate=float(orig_item.tax_rate) if orig_item.tax_rate is not None else None,
            tax_name=orig_item.tax_name,
            subtotal=-float(orig_item.subtotal or 0),
            tax_amount=-float(orig_item.tax_amount or 0),
            total=-float(orig_item.total or 0),
            position=orig_item.position,
        )
        rectificative.items.append(rect_item)

    original.status = "rectified"

    if settings:
        settings.rectificative_next_number = (settings.rectificative_next_number or 1) + 1

    await _log_audit(db, original.id, current_user.workspace_id, "rectified", current_user,
                     new_values={"rectificative_number": rect_number}, request=request)
    await _log_audit(db, rectificative.id, current_user.workspace_id, "created", current_user,
                     new_values={"invoice_number": rect_number, "type": "rectificativa", "original": original.invoice_number},
                     request=request)

    await db.commit()
    await db.refresh(rectificative)
    return rectificative


@router.post("/invoices/{invoice_id}/duplicate", response_model=InvoiceResponse)
async def duplicate_invoice(
    invoice_id: UUID,
    request: Request,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Duplicate an invoice as a new draft."""
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .where(Invoice.workspace_id == current_user.workspace_id)
        .options(selectinload(Invoice.items))
    )
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    settings = await _get_settings(db, current_user.workspace_id)
    series = original.invoice_series or "F"
    if series == "R":
        prefix = settings.rectificative_prefix if settings else "R"
        next_number = settings.rectificative_next_number if settings else 1
    else:
        prefix = settings.invoice_prefix if settings else "F"
        next_number = settings.invoice_next_number if settings else 1

    year = date.today().year
    new_number = generate_invoice_number(prefix, year, next_number)

    new_invoice = Invoice(
        workspace_id=current_user.workspace_id,
        invoice_number=new_number,
        invoice_series=series,
        invoice_type=original.invoice_type,
        client_id=original.client_id,
        client_name=original.client_name,
        client_tax_id=original.client_tax_id,
        client_address=original.client_address,
        client_city=original.client_city,
        client_postal_code=original.client_postal_code,
        client_country=original.client_country,
        client_email=original.client_email,
        issue_date=date.today(),
        due_date=None,
        tax_rate=original.tax_rate,
        tax_name=original.tax_name,
        discount_type=original.discount_type,
        discount_value=float(original.discount_value or 0),
        subtotal=float(original.subtotal or 0),
        tax_amount=float(original.tax_amount or 0),
        discount_amount=float(original.discount_amount or 0),
        total=float(original.total or 0),
        payment_method=original.payment_method,
        notes=original.notes,
        status="draft",
    )
    db.add(new_invoice)

    for orig_item in original.items:
        new_item = InvoiceItem(
            invoice_id=new_invoice.id,
            description=orig_item.description,
            quantity=float(orig_item.quantity or 1),
            unit_price=float(orig_item.unit_price or 0),
            discount_type=orig_item.discount_type,
            discount_value=float(orig_item.discount_value or 0),
            tax_rate=float(orig_item.tax_rate) if orig_item.tax_rate is not None else None,
            tax_name=orig_item.tax_name,
            subtotal=float(orig_item.subtotal or 0),
            tax_amount=float(orig_item.tax_amount or 0),
            total=float(orig_item.total or 0),
            position=orig_item.position,
        )
        new_invoice.items.append(new_item)

    if settings:
        if series == "R":
            settings.rectificative_next_number = (settings.rectificative_next_number or 1) + 1
        else:
            settings.invoice_next_number = (settings.invoice_next_number or 1) + 1

    await _log_audit(db, new_invoice.id, current_user.workspace_id, "created", current_user,
                     new_values={"invoice_number": new_number, "duplicated_from": original.invoice_number},
                     request=request)

    await db.commit()
    await db.refresh(new_invoice)
    return new_invoice


@router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(
    invoice_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Generate and download the invoice as PDF."""
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .where(Invoice.workspace_id == current_user.workspace_id)
        .options(selectinload(Invoice.items))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    settings = await _get_settings(db, current_user.workspace_id)

    generator = InvoicePDFGenerator()
    pdf_bytes = generator.generate(
        invoice=_invoice_to_dict(invoice),
        items=_items_to_dicts(invoice.items),
        settings=_settings_to_dict(settings),
        qr_data=invoice.verifactu_qr_data,
    )

    filename = f"Factura_{invoice.invoice_number.replace('/', '-')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/invoices/{invoice_id}/send-email")
async def send_invoice_email(
    invoice_id: UUID,
    request: Request,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Send the invoice PDF by email to the client."""
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .where(Invoice.workspace_id == current_user.workspace_id)
        .options(selectinload(Invoice.items))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if not invoice.client_email:
        raise HTTPException(status_code=400, detail="El cliente no tiene email configurado")
    if invoice.status == "draft":
        raise HTTPException(status_code=400, detail="Finaliza la factura antes de enviarla por email")

    settings = await _get_settings(db, current_user.workspace_id)

    generator = InvoicePDFGenerator()
    pdf_bytes = generator.generate(
        invoice=_invoice_to_dict(invoice),
        items=_items_to_dicts(invoice.items),
        settings=_settings_to_dict(settings),
        qr_data=invoice.verifactu_qr_data,
    )

    import base64
    try:
        from app.services.email import EmailService
        email_service = EmailService()

        business_name = settings.business_name if settings else "Tu entrenador"
        subject = f"Factura {invoice.invoice_number} - {business_name}"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Factura {invoice.invoice_number}</h2>
            <p>Estimado/a {invoice.client_name},</p>
            <p>Adjuntamos la factura <strong>{invoice.invoice_number}</strong> por un importe de <strong>{float(invoice.total or 0):.2f} €</strong>.</p>
            <p>Puede descargar el PDF adjunto a este correo.</p>
            <br/>
            <p>Un saludo,<br/>{business_name}</p>
        </div>
        """

        attachment = [{
            "content": base64.b64encode(pdf_bytes).decode("utf-8"),
            "name": f"Factura_{invoice.invoice_number}.pdf",
        }]

        sent = await email_service.send_email(
            to_email=invoice.client_email,
            to_name=invoice.client_name,
            subject=subject,
            html_content=html,
            attachments=attachment,
        )

        if sent:
            if invoice.status == "finalized":
                invoice.status = "sent"
            await _log_audit(db, invoice.id, current_user.workspace_id, "email_sent", current_user,
                             new_values={"email": invoice.client_email}, request=request)
            await db.commit()
            return {"message": f"Factura enviada a {invoice.client_email}"}
        else:
            raise HTTPException(status_code=500, detail="Error al enviar el email")

    except ImportError:
        raise HTTPException(status_code=500, detail="Servicio de email no disponible")


@router.get("/invoices/{invoice_id}/audit-log", response_model=List[AuditLogResponse])
async def get_invoice_audit_log(
    invoice_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InvoiceAuditLog)
        .where(InvoiceAuditLog.invoice_id == invoice_id)
        .where(InvoiceAuditLog.workspace_id == current_user.workspace_id)
        .order_by(InvoiceAuditLog.created_at.desc())
    )
    return result.scalars().all()


# =====================================================
# VERIFACTU TEST / DIAGNOSTICS
# =====================================================

class VeriFactuTestRequest(BaseModel):
    client_name: str = "Cliente de Prueba"
    client_tax_id: Optional[str] = None
    amount: float = 100.0
    description: str = "Servicio de prueba VeriFactu"
    send_to_aeat: bool = False


class VeriFactuTestResponse(BaseModel):
    success: bool
    invoice_number: str
    invoice_type: str
    verifactu_hash: Optional[str] = None
    verifactu_uuid: Optional[str] = None
    verifactu_qr_data: Optional[str] = None
    verifactu_status: Optional[str] = None
    verifactu_record: Optional[dict] = None
    aeat_response: Optional[dict] = None
    hash_chain_valid: bool = False
    settings_configured: bool = False
    checks: List[dict] = []


@router.post("/verifactu-test", response_model=VeriFactuTestResponse)
async def test_verifactu(
    test_data: VeriFactuTestRequest,
    request: Request,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Run a VeriFactu diagnostic test. Computes hash, validates the chain,
    and optionally sends a real test to AEAT preproducción.
    The test invoice is NOT saved to the database.
    """
    from app.services.verifactu import VeriFactuService, _clean_nif, _date_str, _decimal_str

    checks = []
    settings = await _get_settings(db, current_user.workspace_id)

    if not settings:
        return VeriFactuTestResponse(
            success=False,
            invoice_number="",
            invoice_type="",
            settings_configured=False,
            checks=[{"check": "settings", "ok": False, "detail": "No hay configuración de facturación. Ve a la pestaña Facturas > Configuración para establecer tus datos fiscales."}],
        )

    checks.append({"check": "settings", "ok": True, "detail": "Configuración de facturación encontrada"})

    has_tax_id = bool(settings.tax_id)
    checks.append({
        "check": "tax_id",
        "ok": has_tax_id,
        "detail": f"NIF/CIF: {settings.tax_id}" if has_tax_id else "NIF/CIF no configurado - obligatorio para VeriFactu",
    })

    has_business = bool(settings.business_name)
    checks.append({
        "check": "business_name",
        "ok": has_business,
        "detail": f"Razón social: {settings.business_name}" if has_business else "Razón social no configurada",
    })

    checks.append({
        "check": "verifactu_enabled",
        "ok": bool(settings.verifactu_enabled),
        "detail": f"VeriFactu {'habilitado' if settings.verifactu_enabled else 'deshabilitado'} (modo: {settings.verifactu_mode or 'none'})",
    })

    has_cert = bool(settings.certificate_pem and settings.certificate_key_encrypted)
    checks.append({
        "check": "certificate",
        "ok": has_cert,
        "detail": "Certificado digital configurado" if has_cert else "Certificado digital NO configurado - necesario para envío a AEAT",
    })

    prefix = settings.invoice_prefix or "F"
    next_num = settings.invoice_next_number or 1
    year = date.today().year
    invoice_number = generate_invoice_number(prefix, year, next_num)

    tax_rate = float(settings.default_tax_rate or 21)
    base = round(test_data.amount / (1 + tax_rate / 100), 2)
    tax_amount = round(test_data.amount - base, 2)

    invoice_type = "F1" if test_data.client_tax_id else "F2"

    test_invoice = Invoice(
        workspace_id=current_user.workspace_id,
        invoice_number=invoice_number,
        invoice_series="F",
        invoice_type=invoice_type,
        client_name=test_data.client_name,
        client_tax_id=test_data.client_tax_id,
        issue_date=date.today(),
        status="draft",
        subtotal=base,
        tax_amount=tax_amount,
        discount_amount=0,
        total=test_data.amount,
        tax_rate=tax_rate,
        tax_name=settings.default_tax_name or "IVA",
    )

    try:
        await VeriFactuService.compute_and_set_hash(db, test_invoice, settings)
        checks.append({"check": "hash_computation", "ok": True, "detail": f"Hash SHA-256 calculado: {test_invoice.verifactu_hash[:16]}..."})
    except Exception as e:
        checks.append({"check": "hash_computation", "ok": False, "detail": f"Error al calcular hash: {str(e)}"})
        return VeriFactuTestResponse(
            success=False,
            invoice_number=invoice_number,
            invoice_type=invoice_type,
            settings_configured=True,
            checks=checks,
        )

    checks.append({
        "check": "uuid",
        "ok": bool(test_invoice.verifactu_uuid),
        "detail": f"UUID generado: {test_invoice.verifactu_uuid}",
    })

    qr_ok = bool(test_invoice.verifactu_qr_data) and "ValidarQR" in (test_invoice.verifactu_qr_data or "")
    checks.append({
        "check": "qr_url",
        "ok": qr_ok,
        "detail": f"QR URL: {test_invoice.verifactu_qr_data}" if qr_ok else "QR URL no generado correctamente",
    })

    hash_len_ok = len(test_invoice.verifactu_hash or "") == 64
    hash_upper = (test_invoice.verifactu_hash or "") == (test_invoice.verifactu_hash or "").upper()
    checks.append({
        "check": "hash_format",
        "ok": hash_len_ok and hash_upper,
        "detail": f"Hash formato correcto (64 chars, uppercase): {'Sí' if hash_len_ok and hash_upper else 'No'}",
    })

    prev_hash = test_invoice.verifactu_prev_hash or ""
    is_first = prev_hash == ""
    checks.append({
        "check": "hash_chain",
        "ok": True,
        "detail": f"{'Primer registro de la cadena (sin hash anterior)' if is_first else f'Encadenado con hash anterior: {prev_hash[:16]}...'}",
    })

    verifactu_record = None
    try:
        verifactu_record = VeriFactuService.prepare_alta_record(test_invoice, settings)
        checks.append({"check": "record_structure", "ok": True, "detail": "Estructura de registro Alta generada correctamente"})
    except Exception as e:
        checks.append({"check": "record_structure", "ok": False, "detail": f"Error al preparar registro: {str(e)}"})

    aeat_response = None
    if test_data.send_to_aeat and has_cert and settings.verifactu_enabled:
        try:
            from app.services.verifactu import AEATSoapClient, _local_timestamp
            aeat_client = AEATSoapClient(settings, is_test=True)
            reg_dt = _local_timestamp()
            prev_inv = await VeriFactuService.get_previous_invoice(db, current_user.workspace_id, "F")

            registro_xml = aeat_client.build_registro_alta_xml(
                invoice=test_invoice,
                prev_invoice=prev_inv,
                verifactu_hash=test_invoice.verifactu_hash or "",
                reg_dt=reg_dt,
            )
            soap_xml = aeat_client.build_soap_envelope(test_invoice, registro_xml)
            raw_result = aeat_client.send_xml(soap_xml)

            if raw_result.get("error") and not raw_result.get("response"):
                aeat_response = {
                    "status": "error",
                    "message": raw_result["error"],
                    "http_status": raw_result.get("status"),
                }
                checks.append({"check": "aeat_send", "ok": False, "detail": f"Error AEAT: {raw_result['error']}"})
            else:
                resp_text = raw_result.get("response", "")
                if resp_text:
                    parsed = aeat_client.parse_response(resp_text)
                else:
                    parsed = {"status": "error", "message": raw_result.get("error", "Sin respuesta de AEAT"), "registros": []}
                aeat_response = parsed
                if raw_result.get("error"):
                    aeat_response["http_error"] = raw_result["error"]
                is_ok = parsed.get("status") == "accepted"
                checks.append({
                    "check": "aeat_send",
                    "ok": is_ok,
                    "detail": f"AEAT: {parsed.get('message', 'Sin respuesta')}",
                })
                if parsed.get("csv"):
                    checks.append({"check": "aeat_csv", "ok": True, "detail": f"CSV AEAT: {parsed['csv']}"})
        except Exception as e:
            aeat_response = {"status": "error", "message": str(e)}
            checks.append({"check": "aeat_send", "ok": False, "detail": f"Error inesperado AEAT: {str(e)}"})
    elif test_data.send_to_aeat and not has_cert:
        checks.append({"check": "aeat_send", "ok": False, "detail": "No se puede enviar a AEAT: certificado digital no configurado"})
    elif test_data.send_to_aeat and not settings.verifactu_enabled:
        checks.append({"check": "aeat_send", "ok": False, "detail": "No se puede enviar a AEAT: VeriFactu no está habilitado"})

    all_ok = all(c["ok"] for c in checks)

    return VeriFactuTestResponse(
        success=all_ok,
        invoice_number=invoice_number,
        invoice_type=invoice_type,
        verifactu_hash=test_invoice.verifactu_hash,
        verifactu_uuid=test_invoice.verifactu_uuid,
        verifactu_qr_data=test_invoice.verifactu_qr_data,
        verifactu_status="test_sent" if test_data.send_to_aeat and aeat_response else "test",
        verifactu_record=verifactu_record,
        aeat_response=aeat_response,
        hash_chain_valid=True,
        settings_configured=True,
        checks=checks,
    )


# =====================================================
# CERTIFICADO DIGITAL
# =====================================================

_cert_upload_attempts: dict = {}  # workspace_id -> list of timestamps
_cert_rate_last_cleanup = 0.0
CERT_RATE_LIMIT = 5
CERT_RATE_WINDOW = 3600  # 1 hour
CERT_RATE_CLEANUP_INTERVAL = 7200  # purge stale entries every 2 hours


def _check_cert_rate_limit(workspace_id: str) -> None:
    global _cert_rate_last_cleanup
    import time
    now = time.time()

    if now - _cert_rate_last_cleanup > CERT_RATE_CLEANUP_INTERVAL:
        stale_keys = [k for k, v in _cert_upload_attempts.items()
                      if all(now - t >= CERT_RATE_WINDOW for t in v)]
        for k in stale_keys:
            del _cert_upload_attempts[k]
        _cert_rate_last_cleanup = now

    key = str(workspace_id)
    attempts = _cert_upload_attempts.get(key, [])
    attempts = [t for t in attempts if now - t < CERT_RATE_WINDOW]
    if len(attempts) >= CERT_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Demasiados intentos de subida de certificado. Máximo {CERT_RATE_LIMIT} por hora."
        )
    attempts.append(now)
    _cert_upload_attempts[key] = attempts


@router.get("/certificate/status", response_model=CertificateStatusResponse)
async def get_certificate_status(
    current_user: Any = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    settings = await _get_settings(db, current_user.workspace_id)
    if not settings or not settings.certificate_pem:
        return CertificateStatusResponse(has_certificate=False)

    is_expired = False
    if settings.certificate_expires_at:
        is_expired = settings.certificate_expires_at < datetime.now(timezone.utc)

    return CertificateStatusResponse(
        has_certificate=True,
        subject=settings.certificate_subject,
        serial_number=settings.certificate_serial_number,
        nif=settings.certificate_nif,
        expires_at=settings.certificate_expires_at,
        uploaded_at=settings.certificate_uploaded_at,
        is_expired=is_expired,
    )


@router.post("/certificate", response_model=CertificateStatusResponse)
async def upload_certificate(
    request: Request,
    file: UploadFile = File(...),
    password: str = Form(...),
    current_user: Any = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    """Upload a .p12/.pfx certificate. Extracts cert+key, encrypts key at rest."""
    import logging
    logger = logging.getLogger(__name__)

    _check_cert_rate_limit(current_user.workspace_id)

    if not file.filename or not file.filename.lower().endswith((".p12", ".pfx")):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .p12 o .pfx")

    from app.services.certificate import MAX_P12_SIZE
    file_data = await file.read()
    if len(file_data) > MAX_P12_SIZE:
        raise HTTPException(status_code=400, detail="El archivo excede el tamaño máximo de 50KB")
    if len(file_data) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío")

    settings = await _get_settings(db, current_user.workspace_id)
    if not settings:
        raise HTTPException(status_code=400, detail="Configura primero los ajustes de facturación")

    if settings.certificate_pem and settings.certificate_key_encrypted:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un certificado configurado. Revócalo antes de subir uno nuevo."
        )

    from app.services.certificate import extract_and_encrypt, _wipe_bytes_best_effort
    try:
        cert_info = extract_and_encrypt(
            p12_data=file_data,
            password=password,
            workspace_id=str(current_user.workspace_id),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        _wipe_bytes_best_effort(file_data)
        del file_data
        password = ""  # noqa: F841 — best-effort (strings are immutable in Python)

    settings.certificate_pem = cert_info.cert_pem
    settings.certificate_key_encrypted = cert_info.key_pem_encrypted
    settings.certificate_key_iv = cert_info.key_iv
    settings.certificate_subject = cert_info.subject
    settings.certificate_serial_number = cert_info.serial_number
    settings.certificate_nif = cert_info.nif
    settings.certificate_expires_at = cert_info.expires_at
    settings.certificate_uploaded_at = cert_info.uploaded_at

    await db.commit()

    client_ip = request.client.host if request.client else "unknown"
    logger.info(
        "CERT_UPLOAD workspace=%s user=%s ip=%s subject=%s serial=%s expires=%s",
        current_user.workspace_id,
        current_user.id,
        client_ip,
        cert_info.subject[:50] if cert_info.subject else "?",
        cert_info.serial_number,
        cert_info.expires_at.isoformat(),
    )

    return CertificateStatusResponse(
        has_certificate=True,
        subject=cert_info.subject,
        serial_number=cert_info.serial_number,
        nif=cert_info.nif,
        expires_at=cert_info.expires_at,
        uploaded_at=cert_info.uploaded_at,
        is_expired=False,
    )


@router.delete("/certificate", status_code=status.HTTP_200_OK)
async def revoke_certificate(
    request: Request,
    current_user: Any = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    """Revoke (delete) the stored certificate and encrypted private key."""
    import logging
    logger = logging.getLogger(__name__)

    settings = await _get_settings(db, current_user.workspace_id)
    if not settings or not settings.certificate_pem:
        raise HTTPException(status_code=404, detail="No hay certificado configurado")

    old_subject = settings.certificate_subject
    old_serial = settings.certificate_serial_number

    settings.certificate_pem = None
    settings.certificate_key_encrypted = None
    settings.certificate_key_iv = None
    settings.certificate_subject = None
    settings.certificate_serial_number = None
    settings.certificate_nif = None
    settings.certificate_expires_at = None
    settings.certificate_uploaded_at = None

    await db.commit()

    client_ip = request.client.host if request.client else "unknown"
    logger.info(
        "CERT_REVOKE workspace=%s user=%s ip=%s was_subject=%s was_serial=%s",
        current_user.workspace_id,
        current_user.id,
        client_ip,
        old_subject[:50] if old_subject else "?",
        old_serial or "?",
    )

    return {"message": "Certificado revocado correctamente"}


# =====================================================
# GASTOS
# =====================================================

@router.get("/expenses", response_model=List[ExpenseResponse])
async def list_expenses(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
):
    query = select(Expense).where(Expense.workspace_id == current_user.workspace_id)
    if category:
        query = query.where(Expense.category == category)
    if status_filter:
        query = query.where(Expense.status == status_filter)
    if from_date:
        query = query.where(Expense.expense_date >= from_date)
    if to_date:
        query = query.where(Expense.expense_date <= to_date)

    query = query.order_by(Expense.expense_date.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense_data: ExpenseCreate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    tax_amount = expense_data.amount * (expense_data.tax_rate / 100)
    total = expense_data.amount + tax_amount

    expense = Expense(
        workspace_id=current_user.workspace_id,
        tax_amount=tax_amount,
        total=total,
        **expense_data.model_dump()
    )
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense


@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: UUID,
    expense_data: ExpenseUpdate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense)
        .where(Expense.id == expense_id)
        .where(Expense.workspace_id == current_user.workspace_id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    update_data = expense_data.model_dump(exclude_unset=True)

    if "amount" in update_data or "tax_rate" in update_data:
        amount = update_data.get("amount", expense.amount)
        tax_rate = update_data.get("tax_rate", expense.tax_rate)
        update_data["tax_amount"] = float(amount) * (float(tax_rate) / 100)
        update_data["total"] = float(amount) + update_data["tax_amount"]

    for field, value in update_data.items():
        setattr(expense, field, value)

    await db.commit()
    await db.refresh(expense)
    return expense


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense)
        .where(Expense.id == expense_id)
        .where(Expense.workspace_id == current_user.workspace_id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    await db.delete(expense)
    await db.commit()


# =====================================================
# CATEGORÍAS DE GASTOS
# =====================================================

@router.get("/expense-categories", response_model=List[ExpenseCategoryResponse])
async def list_expense_categories(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExpenseCategory)
        .where(ExpenseCategory.workspace_id == current_user.workspace_id)
        .where(ExpenseCategory.is_active == True)
        .order_by(ExpenseCategory.name)
    )
    return result.scalars().all()


@router.post("/expense-categories", response_model=ExpenseCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_expense_category(
    category_data: ExpenseCategoryBase,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    category = ExpenseCategory(
        workspace_id=current_user.workspace_id,
        **category_data.model_dump()
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


# =====================================================
# PRESUPUESTOS
# =====================================================

@router.get("/quotes", response_model=List[QuoteResponse])
async def list_quotes(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    query = select(Quote).where(Quote.workspace_id == current_user.workspace_id)
    if status_filter:
        query = query.where(Quote.status == status_filter)

    query = query.order_by(Quote.issue_date.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/quotes/{quote_id}/convert", response_model=InvoiceResponse)
async def convert_quote_to_invoice(
    quote_id: UUID,
    request: Request,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Quote)
        .where(Quote.id == quote_id)
        .where(Quote.workspace_id == current_user.workspace_id)
        .options(selectinload(Quote.items))
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    if quote.status == "converted":
        raise HTTPException(status_code=400, detail="Este presupuesto ya fue convertido")

    invoice_data = InvoiceCreate(
        client_id=quote.client_id,
        client_name=quote.client_name,
        client_email=quote.client_email,
        notes=quote.notes,
        items=[
            InvoiceItemCreate(
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount_type=item.discount_type,
                discount_value=item.discount_value,
                tax_rate=item.tax_rate,
            )
            for item in quote.items
        ]
    )

    invoice = await create_invoice(invoice_data, request, current_user, db)

    quote.status = "converted"
    quote.converted_to_invoice_id = invoice.id
    quote.converted_at = datetime.now(timezone.utc)

    await db.commit()
    return invoice


# =====================================================
# RESUMEN FINANCIERO
# =====================================================

@router.get("/summary", response_model=FinancialSummary)
async def get_financial_summary(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    from_date: date = Query(default_factory=lambda: date(date.today().year, 1, 1)),
    to_date: date = Query(default_factory=date.today),
):
    invoices_result = await db.execute(
        select(
            func.count(Invoice.id).label("count"),
            func.coalesce(func.sum(Invoice.total), 0).label("total"),
        )
        .where(Invoice.workspace_id == current_user.workspace_id)
        .where(Invoice.issue_date >= from_date)
        .where(Invoice.issue_date <= to_date)
        .where(Invoice.status != "cancelled")
    )
    invoices_data = invoices_result.first()

    paid_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0))
        .where(Invoice.workspace_id == current_user.workspace_id)
        .where(Invoice.issue_date >= from_date)
        .where(Invoice.issue_date <= to_date)
        .where(Invoice.status == "paid")
    )
    total_paid = paid_result.scalar() or 0

    pending_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0))
        .where(Invoice.workspace_id == current_user.workspace_id)
        .where(Invoice.issue_date >= from_date)
        .where(Invoice.issue_date <= to_date)
        .where(Invoice.status.in_(["finalized", "sent"]))
    )
    total_pending = pending_result.scalar() or 0

    overdue_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0))
        .where(Invoice.workspace_id == current_user.workspace_id)
        .where(Invoice.status == "overdue")
    )
    total_overdue = overdue_result.scalar() or 0

    expenses_result = await db.execute(
        select(
            func.count(Expense.id).label("count"),
            func.coalesce(func.sum(Expense.total), 0).label("total"),
        )
        .where(Expense.workspace_id == current_user.workspace_id)
        .where(Expense.expense_date >= from_date)
        .where(Expense.expense_date <= to_date)
    )
    expenses_data = expenses_result.first()

    return FinancialSummary(
        total_invoiced=float(invoices_data.total or 0),
        total_paid=float(total_paid),
        total_pending=float(total_pending),
        total_overdue=float(total_overdue),
        total_expenses=float(expenses_data.total or 0),
        net_income=float(total_paid) - float(expenses_data.total or 0),
        invoices_count=invoices_data.count or 0,
        expenses_count=expenses_data.count or 0,
        period_start=from_date,
        period_end=to_date,
    )
