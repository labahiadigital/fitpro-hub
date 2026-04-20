"""Product, Session Package, and Coupon models."""
from sqlalchemy import Column, String, Text, Numeric, Integer, Boolean, ForeignKey, ARRAY, Table
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


product_machines = Table(
    "product_machines",
    BaseModel.metadata,
    Column("product_id", UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("machine_id", UUID(as_uuid=True), ForeignKey("machines.id", ondelete="CASCADE"), primary_key=True),
    Column("is_primary", Boolean, nullable=False, server_default="true"),
)

product_boxes = Table(
    "product_boxes",
    BaseModel.metadata,
    Column("product_id", UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("box_id", UUID(as_uuid=True), ForeignKey("boxes.id", ondelete="CASCADE"), primary_key=True),
    Column("is_primary", Boolean, nullable=False, server_default="true"),
)


class Product(BaseModel):
    """Product/Service model for subscriptions and one-time purchases."""
    
    __tablename__ = "products"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    product_type = Column(String(50), nullable=False, default='subscription')
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default='EUR')
    stripe_price_id = Column(String(255))
    stripe_product_id = Column(String(255))
    interval = Column(String(20))
    interval_count = Column(Integer, default=1)
    trial_days = Column(Integer, default=0)
    max_users = Column(Integer, nullable=True)  # None = unlimited
    is_active = Column(Boolean, default=True)
    extra_data = Column("metadata", JSONB, default={})
    
    # Relationships
    session_packages = relationship("SessionPackage", back_populates="product")
    stock_consumption = relationship("ProductStockConsumption", back_populates="product", cascade="all, delete-orphan")
    staff_assignments = relationship("ProductStaff", back_populates="product", cascade="all, delete-orphan")


class ProductStockConsumption(BaseModel):
    """M2M with extra: stock consumed per product sale."""
    __tablename__ = "product_stock_consumption"

    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    stock_item_id = Column(UUID(as_uuid=True), ForeignKey("stock_items.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Numeric(10, 2), nullable=False, server_default="1")

    product = relationship("Product", back_populates="stock_consumption")
    stock_item = relationship("StockItem", lazy="selectin")


class ProductStaff(BaseModel):
    """M2M with extra: staff members assigned to deliver this product."""
    __tablename__ = "product_staff"

    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    is_primary = Column(Boolean, nullable=False, server_default="false")

    product = relationship("Product", back_populates="staff_assignments")
    user = relationship("User", lazy="selectin")


class SessionPackage(BaseModel):
    """Session package (bonos) model."""
    
    __tablename__ = "session_packages"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id', ondelete='SET NULL'))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    total_sessions = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default='EUR')
    validity_days = Column(Integer, default=365)
    session_types = Column(ARRAY(String), default=[])
    is_active = Column(Boolean, default=True)
    
    # Relationships
    product = relationship("Product", back_populates="session_packages")
    client_packages = relationship("ClientPackage", back_populates="package")


class ClientPackage(BaseModel):
    """Client purchased package model."""
    
    __tablename__ = "client_packages"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey('clients.id', ondelete='CASCADE'), nullable=False)
    package_id = Column(UUID(as_uuid=True), ForeignKey('session_packages.id', ondelete='CASCADE'), nullable=False)
    payment_id = Column(UUID(as_uuid=True), ForeignKey('payments.id', ondelete='SET NULL'))
    total_sessions = Column(Integer, nullable=False)
    used_sessions = Column(Integer, default=0)
    purchased_at = Column(String)
    expires_at = Column(String)
    status = Column(String(20), default='active')  # active, expired, exhausted, cancelled
    
    # Relationships
    client = relationship("Client", back_populates="packages")
    package = relationship("SessionPackage", back_populates="client_packages")


class Coupon(BaseModel):
    """Discount coupon model."""
    
    __tablename__ = "coupons"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    code = Column(String(50), nullable=False)
    description = Column(Text)
    discount_type = Column(String(20), nullable=False, default='percentage')  # percentage, fixed
    discount_value = Column(Numeric(10, 2), nullable=False)
    max_uses = Column(Integer)
    current_uses = Column(Integer, default=0)
    valid_from = Column(String)
    valid_until = Column(String)
    applicable_products = Column(ARRAY(UUID(as_uuid=True)), default=[])
    is_active = Column(Boolean, default=True)
