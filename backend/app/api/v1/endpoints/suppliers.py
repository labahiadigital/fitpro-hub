"""Suppliers (proveedores) CRUD endpoints.

Proveedores vinculados a un workspace. Se utilizarán posteriormente desde
``stock_items`` a través de ``supplier_id`` para saber de qué proveedor
procede cada artículo de stock.
"""
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_workspace, require_staff, CurrentUser
from app.models.supplier import Supplier

router = APIRouter()


# ============ SCHEMAS ============

class BankAccount(BaseModel):
    model_config = {"extra": "ignore"}

    iban: str = Field(..., min_length=4, max_length=50)
    bic: Optional[str] = Field(default=None, max_length=20)
    notes: Optional[str] = None
    is_default: bool = False


class SupplierBase(BaseModel):
    model_config = {"extra": "ignore"}

    tax_id: Optional[str] = Field(default=None, max_length=50)
    legal_name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = Field(default=None, max_length=500)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    city: Optional[str] = Field(default=None, max_length=150)
    province: Optional[str] = Field(default=None, max_length=150)
    country: Optional[str] = Field(default="España", max_length=100)

    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None

    default_discount_pct: Optional[Decimal] = Field(default=None, ge=0, le=100)

    bank_accounts: List[BankAccount] = []

    phone: Optional[str] = Field(default=None, max_length=50)
    mobile: Optional[str] = Field(default=None, max_length=50)
    fax: Optional[str] = Field(default=None, max_length=50)
    email: Optional[EmailStr] = None
    url: Optional[str] = Field(default=None, max_length=500)

    custom_field_1: Optional[str] = Field(default=None, max_length=255)
    custom_field_2: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = None
    tags: List[str] = []

    is_active: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    model_config = {"extra": "ignore"}

    tax_id: Optional[str] = None
    legal_name: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    default_discount_pct: Optional[Decimal] = None
    bank_accounts: Optional[List[BankAccount]] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[EmailStr] = None
    url: Optional[str] = None
    custom_field_1: Optional[str] = None
    custom_field_2: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class SupplierResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    workspace_id: UUID
    tax_id: Optional[str]
    legal_name: str
    address: Optional[str]
    postal_code: Optional[str]
    city: Optional[str]
    province: Optional[str]
    country: str
    latitude: Optional[Decimal]
    longitude: Optional[Decimal]
    default_discount_pct: Optional[Decimal]
    bank_accounts: List[dict] = []
    phone: Optional[str]
    mobile: Optional[str]
    fax: Optional[str]
    email: Optional[str]
    url: Optional[str]
    custom_field_1: Optional[str]
    custom_field_2: Optional[str]
    notes: Optional[str]
    tags: List[str] = []
    is_active: bool


# ============ HELPERS ============

def _serialize(supplier: Supplier) -> SupplierResponse:
    return SupplierResponse(
        id=supplier.id,
        workspace_id=supplier.workspace_id,
        tax_id=supplier.tax_id,
        legal_name=supplier.legal_name,
        address=supplier.address,
        postal_code=supplier.postal_code,
        city=supplier.city,
        province=supplier.province,
        country=supplier.country,
        latitude=supplier.latitude,
        longitude=supplier.longitude,
        default_discount_pct=supplier.default_discount_pct,
        bank_accounts=list(supplier.bank_accounts or []),
        phone=supplier.phone,
        mobile=supplier.mobile,
        fax=supplier.fax,
        email=supplier.email,
        url=supplier.url,
        custom_field_1=supplier.custom_field_1,
        custom_field_2=supplier.custom_field_2,
        notes=supplier.notes,
        tags=list(supplier.tags or []),
        is_active=bool(supplier.is_active),
    )


# ============ ENDPOINTS ============

@router.get("", response_model=List[SupplierResponse])
async def list_suppliers(
    is_active: Optional[bool] = None,
    search: Optional[str] = Query(default=None, min_length=1),
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    query = select(Supplier).where(Supplier.workspace_id == current_user.workspace_id)

    if is_active is not None:
        query = query.where(Supplier.is_active == is_active)

    if search:
        term = f"%{search.lower()}%"
        query = query.where(
            or_(
                func.lower(Supplier.legal_name).like(term),
                func.lower(Supplier.tax_id).like(term),
                func.lower(Supplier.email).like(term),
                func.lower(Supplier.city).like(term),
            )
        )

    result = await db.execute(query.order_by(Supplier.legal_name.asc()))
    return [_serialize(s) for s in result.scalars().all()]


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.workspace_id == current_user.workspace_id,
        )
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return _serialize(supplier)


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    payload: SupplierCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    supplier = Supplier(
        workspace_id=current_user.workspace_id,
        tax_id=payload.tax_id,
        legal_name=payload.legal_name,
        address=payload.address,
        postal_code=payload.postal_code,
        city=payload.city,
        province=payload.province,
        country=payload.country or "España",
        latitude=payload.latitude,
        longitude=payload.longitude,
        default_discount_pct=payload.default_discount_pct,
        bank_accounts=[b.model_dump() for b in payload.bank_accounts],
        phone=payload.phone,
        mobile=payload.mobile,
        fax=payload.fax,
        email=payload.email,
        url=payload.url,
        custom_field_1=payload.custom_field_1,
        custom_field_2=payload.custom_field_2,
        notes=payload.notes,
        tags=payload.tags,
        is_active=payload.is_active,
    )
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return _serialize(supplier)


@router.patch("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: UUID,
    payload: SupplierUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.workspace_id == current_user.workspace_id,
        )
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    data = payload.model_dump(exclude_unset=True)
    if "bank_accounts" in data and data["bank_accounts"] is not None:
        data["bank_accounts"] = [
            b.model_dump() if isinstance(b, BankAccount) else b
            for b in data["bank_accounts"]
        ]

    for field, value in data.items():
        setattr(supplier, field, value)

    await db.commit()
    await db.refresh(supplier)
    return _serialize(supplier)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(
    supplier_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.workspace_id == current_user.workspace_id,
        )
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    await db.delete(supplier)
    await db.commit()
