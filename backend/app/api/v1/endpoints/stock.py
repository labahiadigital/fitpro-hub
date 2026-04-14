"""Stock management API endpoints."""
import io
import logging
from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel as PydanticModel
from sqlalchemy import select, func, and_, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.middleware.auth import require_workspace
from app.models.stock import StockCategory, StockItem, StockMovement
from app.models.product import ProductStockConsumption, Product
from app.models.resource import ServiceStockConsumption, Service

logger = logging.getLogger(__name__)
router = APIRouter()

CurrentUser = Depends(require_workspace)


# --- Pydantic schemas ---

class CategoryCreate(PydanticModel):
    name: str
    icon: Optional[str] = None

class CategoryResponse(PydanticModel):
    id: UUID
    name: str
    icon: Optional[str] = None

    class Config:
        from_attributes = True

class ItemCreate(PydanticModel):
    name: str
    category_id: Optional[UUID] = None
    description: Optional[str] = None
    unit: str = "ud"
    current_stock: float = 0
    min_stock: float = 0
    max_stock: float = 0
    price: float = 0
    location: Optional[str] = None
    tax_rate: float = 21
    irpf_rate: float = 0

class ItemUpdate(PydanticModel):
    name: Optional[str] = None
    category_id: Optional[UUID] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    min_stock: Optional[float] = None
    max_stock: Optional[float] = None
    price: Optional[float] = None
    location: Optional[str] = None
    tax_rate: Optional[float] = None
    irpf_rate: Optional[float] = None

class MovementCreate(PydanticModel):
    movement_type: str  # entry, exit, adjustment
    quantity: float
    reason: str

class ItemResponse(PydanticModel):
    id: UUID
    name: str
    category_id: Optional[UUID] = None
    category_name: Optional[str] = None
    description: Optional[str] = None
    unit: str
    current_stock: float
    min_stock: float
    max_stock: float
    price: float
    location: Optional[str] = None
    tax_rate: float
    irpf_rate: float
    is_active: bool
    created_at: str

class MovementResponse(PydanticModel):
    id: UUID
    item_id: UUID
    movement_type: str
    quantity: float
    previous_stock: float
    new_stock: float
    reason: str
    created_by: Optional[UUID] = None
    created_at: str

class StockSummary(PydanticModel):
    total_items: int
    low_stock_count: int
    total_value: float
    movements_today: int


# --- Categories ---

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(user=CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StockCategory)
        .where(StockCategory.workspace_id == user.workspace_id)
        .order_by(StockCategory.name)
    )
    return result.scalars().all()


@router.post("/categories", response_model=CategoryResponse)
async def create_category(data: CategoryCreate, user=CurrentUser, db: AsyncSession = Depends(get_db)):
    cat = StockCategory(workspace_id=user.workspace_id, name=data.name, icon=data.icon)
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


# --- Items ---

@router.get("/items")
async def list_items(
    search: str = "",
    category_id: Optional[str] = None,
    low_stock: bool = False,
    user=CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(StockItem)
        .options(selectinload(StockItem.category))
        .where(StockItem.workspace_id == user.workspace_id, StockItem.is_active.is_(True))
    )
    if search:
        q = q.where(StockItem.name.ilike(f"%{search}%"))
    if category_id:
        q = q.where(StockItem.category_id == category_id)
    if low_stock:
        q = q.where(StockItem.current_stock <= StockItem.min_stock)
    q = q.order_by(StockItem.name)
    result = await db.execute(q)
    items = result.scalars().all()
    return [
        {
            "id": str(i.id),
            "name": i.name,
            "category_id": str(i.category_id) if i.category_id else None,
            "category_name": i.category.name if i.category else None,
            "description": i.description,
            "unit": i.unit,
            "current_stock": float(i.current_stock),
            "min_stock": float(i.min_stock),
            "max_stock": float(i.max_stock),
            "price": float(i.price),
            "location": i.location,
            "tax_rate": float(i.tax_rate),
            "irpf_rate": float(i.irpf_rate),
            "is_active": i.is_active,
            "created_at": i.created_at.isoformat() if i.created_at else "",
        }
        for i in items
    ]


@router.post("/items")
async def create_item(data: ItemCreate, user=CurrentUser, db: AsyncSession = Depends(get_db)):
    item = StockItem(
        workspace_id=user.workspace_id,
        name=data.name,
        category_id=data.category_id,
        description=data.description,
        unit=data.unit,
        current_stock=data.current_stock,
        min_stock=data.min_stock,
        max_stock=data.max_stock,
        price=data.price,
        location=data.location,
        tax_rate=data.tax_rate,
        irpf_rate=data.irpf_rate,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"id": str(item.id), "name": item.name}


@router.put("/items/{item_id}")
async def update_item(item_id: UUID, data: ItemUpdate, user=CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StockItem).where(StockItem.id == item_id, StockItem.workspace_id == user.workspace_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    return {"ok": True}


@router.delete("/items/{item_id}")
async def delete_item(item_id: UUID, user=CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StockItem).where(StockItem.id == item_id, StockItem.workspace_id == user.workspace_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")
    item.is_active = False
    await db.commit()
    return {"ok": True}


# --- Movements ---

@router.post("/items/{item_id}/movements")
async def register_movement(item_id: UUID, data: MovementCreate, user=CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StockItem).where(StockItem.id == item_id, StockItem.workspace_id == user.workspace_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")

    previous = float(item.current_stock)
    qty = data.quantity

    if data.movement_type == "entry":
        new_stock = previous + qty
    elif data.movement_type == "exit":
        new_stock = max(0, previous - qty)
    elif data.movement_type == "adjustment":
        new_stock = qty
    else:
        raise HTTPException(400, "Invalid movement type")

    item.current_stock = Decimal(str(new_stock))

    movement = StockMovement(
        workspace_id=user.workspace_id,
        item_id=item_id,
        movement_type=data.movement_type,
        quantity=Decimal(str(qty)),
        previous_stock=Decimal(str(previous)),
        new_stock=Decimal(str(new_stock)),
        reason=data.reason,
        created_by=user.id,
    )
    db.add(movement)
    await db.commit()
    return {"ok": True, "new_stock": new_stock}


@router.get("/items/{item_id}/movements")
async def list_movements(item_id: UUID, user=CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StockMovement)
        .where(StockMovement.item_id == item_id, StockMovement.workspace_id == user.workspace_id)
        .order_by(StockMovement.created_at.desc())
        .limit(100)
    )
    movements = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "item_id": str(m.item_id),
            "movement_type": m.movement_type,
            "quantity": float(m.quantity),
            "previous_stock": float(m.previous_stock),
            "new_stock": float(m.new_stock),
            "reason": m.reason,
            "created_by": str(m.created_by) if m.created_by else None,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }
        for m in movements
    ]


# --- Summary / KPIs ---

@router.get("/summary")
async def get_summary(user=CurrentUser, db: AsyncSession = Depends(get_db)):
    ws = user.workspace_id

    items_result = await db.execute(
        select(
            func.count(StockItem.id).label("total"),
            func.count().filter(StockItem.current_stock <= StockItem.min_stock).label("low"),
            func.coalesce(func.sum(StockItem.current_stock * StockItem.price), 0).label("value"),
        ).where(StockItem.workspace_id == ws, StockItem.is_active.is_(True))
    )
    row = items_result.one()

    today = date.today()
    mov_result = await db.execute(
        select(func.count(StockMovement.id)).where(
            StockMovement.workspace_id == ws,
            cast(StockMovement.created_at, Date) == today,
        )
    )
    movements_today = mov_result.scalar() or 0

    return {
        "total_items": row.total or 0,
        "low_stock_count": row.low or 0,
        "total_value": float(row.value or 0),
        "movements_today": movements_today,
    }


# --- Linked Products for a stock item ---

@router.get("/items/{item_id}/linked-products")
async def get_linked_products(item_id: UUID, user=CurrentUser, db: AsyncSession = Depends(get_db)):
    """Get products and services linked to a stock item via consumption tables."""
    product_links = await db.execute(
        select(ProductStockConsumption, Product.name)
        .join(Product, Product.id == ProductStockConsumption.product_id)
        .where(ProductStockConsumption.stock_item_id == item_id)
    )
    products = [
        {
            "type": "product",
            "id": str(row[0].product_id),
            "name": row[1],
            "quantity_per_sale": float(row[0].quantity),
        }
        for row in product_links
    ]

    service_links = await db.execute(
        select(ServiceStockConsumption, Service.name)
        .join(Service, Service.id == ServiceStockConsumption.service_id)
        .where(ServiceStockConsumption.stock_item_id == item_id)
    )
    services = [
        {
            "type": "service",
            "id": str(row[0].service_id),
            "name": row[1],
            "quantity_per_sale": float(row[0].quantity),
        }
        for row in service_links
    ]

    return products + services


# --- Export stock to Excel ---

@router.get("/export")
async def export_stock_excel(user=CurrentUser, db: AsyncSession = Depends(get_db)):
    """Export all stock items to an Excel file."""
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    except ImportError:
        raise HTTPException(500, "openpyxl not installed")

    q = (
        select(StockItem)
        .options(selectinload(StockItem.category))
        .where(StockItem.workspace_id == user.workspace_id, StockItem.is_active.is_(True))
        .order_by(StockItem.name)
    )
    result = await db.execute(q)
    items = result.scalars().all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Inventario"

    headers = ["Nombre", "Categoría", "Descripción", "Unidad", "Stock Actual", "Stock Mín.", "Stock Máx.", "Precio (€)", "Valor Total (€)", "Ubicación", "IVA %", "IRPF %", "Estado"]
    header_fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    thin_border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin"),
    )

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
        cell.border = thin_border

    for row_idx, item in enumerate(items, 2):
        stock = float(item.current_stock)
        price = float(item.price)
        values = [
            item.name,
            item.category.name if item.category else "",
            item.description or "",
            item.unit,
            stock,
            float(item.min_stock),
            float(item.max_stock),
            price,
            round(stock * price, 2),
            item.location or "",
            float(item.tax_rate),
            float(item.irpf_rate),
            "Bajo" if stock <= float(item.min_stock) else "Normal",
        ]
        for col_idx, v in enumerate(values, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=v)
            cell.border = thin_border

    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 40)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=stock_{date.today().isoformat()}.xlsx"},
    )
