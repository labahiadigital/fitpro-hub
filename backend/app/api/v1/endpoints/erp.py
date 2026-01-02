"""
Endpoints de la API para el módulo ERP (Facturación y Gastos)
"""

from datetime import date, datetime
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.middleware.auth import require_workspace
from app.models.erp import (
    Expense,
    ExpenseCategory,
    Invoice,
    InvoiceItem,
    InvoiceSettings,
    Quote,
    QuoteItem,
)
from app.models.client import Client

router = APIRouter()


# =====================================================
# SCHEMAS
# =====================================================

class InvoiceSettingsBase(BaseModel):
    business_name: str
    tax_id: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "España"
    phone: Optional[str] = None
    email: Optional[str] = None
    invoice_prefix: str = "F"
    default_tax_rate: float = 21
    default_tax_name: str = "IVA"
    payment_terms_days: int = 30
    default_payment_method: str = "transferencia"
    bank_account: Optional[str] = None
    bank_name: Optional[str] = None
    footer_text: Optional[str] = None
    terms_and_conditions: Optional[str] = None


class InvoiceSettingsResponse(InvoiceSettingsBase):
    id: UUID
    workspace_id: UUID
    invoice_next_number: int
    logo_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceItemBase(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float
    discount_type: str = "percentage"
    discount_value: float = 0
    tax_rate: Optional[float] = None


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
    invoice_type: str = "invoice"
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
    payment_method: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate] = []


class InvoiceUpdate(BaseModel):
    client_name: Optional[str] = None
    client_tax_id: Optional[str] = None
    client_address: Optional[str] = None
    client_email: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None


class InvoiceResponse(InvoiceBase):
    id: UUID
    workspace_id: UUID
    invoice_number: str
    status: str
    subtotal: float
    tax_amount: float
    discount_amount: float
    total: float
    currency: str
    paid_date: Optional[date] = None
    internal_notes: Optional[str] = None
    payment_reference: Optional[str] = None
    pdf_url: Optional[str] = None
    items: List[InvoiceItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


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
# CONFIGURACIÓN DE FACTURACIÓN
# =====================================================

@router.get("/settings", response_model=Optional[InvoiceSettingsResponse])
async def get_invoice_settings(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Obtener configuración de facturación del workspace"""
    result = await db.execute(
        select(InvoiceSettings).where(InvoiceSettings.workspace_id == current_user.workspace_id)
    )
    return result.scalar_one_or_none()


@router.post("/settings", response_model=InvoiceSettingsResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_settings(
    settings_data: InvoiceSettingsBase,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Crear o actualizar configuración de facturación"""
    result = await db.execute(
        select(InvoiceSettings).where(InvoiceSettings.workspace_id == current_user.workspace_id)
    )
    settings = result.scalar_one_or_none()

    if settings:
        for field, value in settings_data.model_dump().items():
            setattr(settings, field, value)
    else:
        settings = InvoiceSettings(
            workspace_id=current_user.workspace_id,
            **settings_data.model_dump()
        )
        db.add(settings)

    await db.commit()
    await db.refresh(settings)
    return settings


# =====================================================
# FACTURAS
# =====================================================

def generate_invoice_number(prefix: str, year: int, number: int) -> str:
    """Generar número de factura"""
    return f"{prefix}{year}-{str(number).zfill(5)}"


def calculate_item_totals(item: InvoiceItemCreate, default_tax_rate: float) -> dict:
    """Calcular totales de una línea de factura"""
    subtotal = float(item.quantity) * float(item.unit_price)
    
    # Aplicar descuento
    if item.discount_type == "percentage":
        discount = subtotal * (float(item.discount_value) / 100)
    else:
        discount = float(item.discount_value)
    
    subtotal_after_discount = subtotal - discount
    
    # Calcular impuesto
    tax_rate = item.tax_rate if item.tax_rate is not None else default_tax_rate
    tax_amount = subtotal_after_discount * (float(tax_rate) / 100)
    
    total = subtotal_after_discount + tax_amount
    
    return {
        "subtotal": subtotal_after_discount,
        "tax_amount": tax_amount,
        "total": total,
    }


@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = Query(None),
    client_id: Optional[UUID] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
):
    """Listar facturas del workspace"""
    query = (
        select(Invoice)
        .where(Invoice.workspace_id == current_user.workspace_id)
        .options(selectinload(Invoice.items))
    )

    if status:
        query = query.where(Invoice.status == status)
    if client_id:
        query = query.where(Invoice.client_id == client_id)
    if from_date:
        query = query.where(Invoice.issue_date >= from_date)
    if to_date:
        query = query.where(Invoice.issue_date <= to_date)

    query = query.order_by(Invoice.issue_date.desc())

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Crear una nueva factura"""
    # Obtener configuración
    settings_result = await db.execute(
        select(InvoiceSettings).where(InvoiceSettings.workspace_id == current_user.workspace_id)
    )
    settings = settings_result.scalar_one_or_none()

    # Generar número de factura
    prefix = settings.invoice_prefix if settings else "F"
    next_number = settings.invoice_next_number if settings else 1
    year = date.today().year
    invoice_number = generate_invoice_number(prefix, year, next_number)

    # Crear factura
    invoice_dict = invoice_data.model_dump(exclude={"items"})
    invoice = Invoice(
        workspace_id=current_user.workspace_id,
        invoice_number=invoice_number,
        **invoice_dict
    )
    db.add(invoice)

    # Calcular totales
    subtotal = 0
    tax_amount = 0

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
            subtotal=totals["subtotal"],
            tax_amount=totals["tax_amount"],
            total=totals["total"],
            position=i,
        )
        invoice.items.append(item)
        
        subtotal += totals["subtotal"]
        tax_amount += totals["tax_amount"]

    # Aplicar descuento global
    if invoice_data.discount_type == "percentage":
        discount_amount = subtotal * (invoice_data.discount_value / 100)
    else:
        discount_amount = invoice_data.discount_value

    invoice.subtotal = subtotal
    invoice.tax_amount = tax_amount
    invoice.discount_amount = discount_amount
    invoice.total = subtotal + tax_amount - discount_amount

    # Actualizar siguiente número
    if settings:
        settings.invoice_next_number = next_number + 1

    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Obtener una factura por ID"""
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
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Actualizar una factura"""
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .where(Invoice.workspace_id == current_user.workspace_id)
        .options(selectinload(Invoice.items))
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    update_data = invoice_data.model_dump(exclude_unset=True)

    # Si se marca como pagada, registrar fecha
    if update_data.get("status") == "paid" and not invoice.paid_date:
        update_data["paid_date"] = date.today()

    for field, value in update_data.items():
        setattr(invoice, field, value)

    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.delete("/invoices/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Eliminar una factura (solo borradores)"""
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


@router.post("/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Marcar factura como enviada"""
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .where(Invoice.workspace_id == current_user.workspace_id)
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    invoice.status = "sent"
    await db.commit()

    return {"message": "Factura marcada como enviada"}


# =====================================================
# GASTOS
# =====================================================

@router.get("/expenses", response_model=List[ExpenseResponse])
async def list_expenses(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
):
    """Listar gastos del workspace"""
    query = select(Expense).where(Expense.workspace_id == current_user.workspace_id)

    if category:
        query = query.where(Expense.category == category)
    if status:
        query = query.where(Expense.status == status)
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
    """Crear un nuevo gasto"""
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
    """Actualizar un gasto"""
    result = await db.execute(
        select(Expense)
        .where(Expense.id == expense_id)
        .where(Expense.workspace_id == current_user.workspace_id)
    )
    expense = result.scalar_one_or_none()

    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    update_data = expense_data.model_dump(exclude_unset=True)

    # Recalcular totales si cambia el importe
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
    """Eliminar un gasto"""
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
    """Listar categorías de gastos"""
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
    """Crear una categoría de gasto"""
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
    status: Optional[str] = Query(None),
):
    """Listar presupuestos del workspace"""
    query = select(Quote).where(Quote.workspace_id == current_user.workspace_id)

    if status:
        query = query.where(Quote.status == status)

    query = query.order_by(Quote.issue_date.desc())

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/quotes/{quote_id}/convert", response_model=InvoiceResponse)
async def convert_quote_to_invoice(
    quote_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Convertir presupuesto en factura"""
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

    # Crear factura desde presupuesto
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

    # Usar el endpoint de crear factura
    invoice = await create_invoice(invoice_data, current_user, db)

    # Actualizar presupuesto
    quote.status = "converted"
    quote.converted_to_invoice_id = invoice.id
    quote.converted_at = datetime.utcnow()

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
    """Obtener resumen financiero del período"""
    # Totales de facturas
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

    # Facturas pagadas
    paid_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0))
        .where(Invoice.workspace_id == current_user.workspace_id)
        .where(Invoice.issue_date >= from_date)
        .where(Invoice.issue_date <= to_date)
        .where(Invoice.status == "paid")
    )
    total_paid = paid_result.scalar() or 0

    # Facturas pendientes
    pending_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0))
        .where(Invoice.workspace_id == current_user.workspace_id)
        .where(Invoice.issue_date >= from_date)
        .where(Invoice.issue_date <= to_date)
        .where(Invoice.status.in_(["draft", "sent"]))
    )
    total_pending = pending_result.scalar() or 0

    # Facturas vencidas
    overdue_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0))
        .where(Invoice.workspace_id == current_user.workspace_id)
        .where(Invoice.status == "overdue")
    )
    total_overdue = overdue_result.scalar() or 0

    # Gastos
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
