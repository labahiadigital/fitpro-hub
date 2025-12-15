"""Product, Session Package, and Coupon schemas."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

from .base import BaseSchema


# Product schemas
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    product_type: str = Field(default='subscription')
    price: float = Field(..., ge=0)
    currency: str = Field(default='EUR', max_length=3)
    interval: Optional[str] = None
    interval_count: int = Field(default=1, ge=1)
    trial_days: int = Field(default=0, ge=0)
    is_active: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ProductCreate(ProductBase):
    workspace_id: UUID


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    product_type: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    interval: Optional[str] = None
    interval_count: Optional[int] = Field(None, ge=1)
    trial_days: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class ProductResponse(ProductBase, BaseSchema):
    id: UUID
    workspace_id: UUID
    stripe_price_id: Optional[str] = None
    stripe_product_id: Optional[str] = None


class ProductList(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    size: int


# Session Package schemas
class SessionPackageBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    total_sessions: int = Field(..., ge=1)
    price: float = Field(..., ge=0)
    currency: str = Field(default='EUR', max_length=3)
    validity_days: int = Field(default=365, ge=1)
    session_types: List[str] = Field(default_factory=list)
    is_active: bool = True


class SessionPackageCreate(SessionPackageBase):
    workspace_id: UUID
    product_id: Optional[UUID] = None


class SessionPackageUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    total_sessions: Optional[int] = Field(None, ge=1)
    price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    validity_days: Optional[int] = Field(None, ge=1)
    session_types: Optional[List[str]] = None
    is_active: Optional[bool] = None


class SessionPackageResponse(SessionPackageBase, BaseSchema):
    id: UUID
    workspace_id: UUID
    product_id: Optional[UUID] = None


class SessionPackageList(BaseModel):
    items: List[SessionPackageResponse]
    total: int
    page: int
    size: int


# Client Package schemas
class ClientPackageBase(BaseModel):
    total_sessions: int = Field(..., ge=1)
    status: str = Field(default='active')


class ClientPackageCreate(ClientPackageBase):
    workspace_id: UUID
    client_id: UUID
    package_id: UUID
    payment_id: Optional[UUID] = None
    expires_at: Optional[datetime] = None


class ClientPackageUpdate(BaseModel):
    used_sessions: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None
    expires_at: Optional[datetime] = None


class ClientPackageResponse(ClientPackageBase, BaseSchema):
    id: UUID
    workspace_id: UUID
    client_id: UUID
    package_id: UUID
    payment_id: Optional[UUID] = None
    used_sessions: int = 0
    remaining_sessions: int
    purchased_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class ClientPackageList(BaseModel):
    items: List[ClientPackageResponse]
    total: int
    page: int
    size: int


# Coupon schemas
class CouponBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    discount_type: str = Field(default='percentage')
    discount_value: float = Field(..., ge=0)
    max_uses: Optional[int] = Field(None, ge=1)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    applicable_products: List[UUID] = Field(default_factory=list)
    is_active: bool = True


class CouponCreate(CouponBase):
    workspace_id: UUID


class CouponUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = Field(None, ge=0)
    max_uses: Optional[int] = Field(None, ge=1)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    applicable_products: Optional[List[UUID]] = None
    is_active: Optional[bool] = None


class CouponResponse(CouponBase, BaseSchema):
    id: UUID
    workspace_id: UUID
    current_uses: int = 0


class CouponList(BaseModel):
    items: List[CouponResponse]
    total: int
    page: int
    size: int


class CouponValidate(BaseModel):
    code: str
    product_id: Optional[UUID] = None


class CouponValidateResponse(BaseModel):
    is_valid: bool
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    message: Optional[str] = None

