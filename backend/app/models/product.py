"""Product, Session Package, and Coupon models."""
from sqlalchemy import Column, String, Text, Numeric, Integer, Boolean, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from .base import Base, TimestampMixin, WorkspaceMixin


class Product(Base, TimestampMixin, WorkspaceMixin):
    """Product/Service model for subscriptions and one-time purchases."""
    
    __tablename__ = "products"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    product_type = Column(String(50), nullable=False, default='subscription')  # subscription, one_time, package
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default='EUR')
    stripe_price_id = Column(String(255))
    stripe_product_id = Column(String(255))
    interval = Column(String(20))  # month, year, week
    interval_count = Column(Integer, default=1)
    trial_days = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    metadata = Column(JSONB, default={})
    
    # Relationships
    session_packages = relationship("SessionPackage", back_populates="product")
    subscriptions = relationship("Subscription", back_populates="product")


class SessionPackage(Base, TimestampMixin, WorkspaceMixin):
    """Session package (bonos) model."""
    
    __tablename__ = "session_packages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
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


class ClientPackage(Base, TimestampMixin, WorkspaceMixin):
    """Client purchased package model."""
    
    __tablename__ = "client_packages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
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


class Coupon(Base, TimestampMixin, WorkspaceMixin):
    """Discount coupon model."""
    
    __tablename__ = "coupons"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
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

