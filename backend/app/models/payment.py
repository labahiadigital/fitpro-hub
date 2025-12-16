from enum import Enum as PyEnum
from sqlalchemy import Column, String, Text, Enum, ForeignKey, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class SubscriptionStatus(str, PyEnum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    TRIALING = "trialing"
    PAUSED = "paused"


class PaymentStatus(str, PyEnum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"


class StripeAccount(BaseModel):
    __tablename__ = "stripe_accounts"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Stripe Connect account
    stripe_account_id = Column(String(255), unique=True, nullable=False)
    
    # Account status
    is_active = Column(String(1), default="Y")  # Y/N
    onboarding_complete = Column(String(1), default="N")  # Y/N
    
    # Account details
    details = Column(JSONB, default={})
    
    # Relationships
    workspace = relationship("Workspace", back_populates="stripe_account")
    
    def __repr__(self):
        return f"<StripeAccount {self.stripe_account_id}>"


class Subscription(BaseModel):
    __tablename__ = "subscriptions"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    
    # Stripe subscription
    stripe_subscription_id = Column(String(255), unique=True, nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_price_id = Column(String(255), nullable=True)
    
    # Subscription details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE)
    
    # Pricing
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="EUR")
    interval = Column(String(20), default="month")  # month, year, week
    
    # Dates
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    
    # Extra data
    extra_data = Column(JSONB, default={})
    
    # Relationships
    product = relationship("Product", back_populates="subscriptions")
    
    def __repr__(self):
        return f"<Subscription {self.name}>"


class Payment(BaseModel):
    __tablename__ = "payments"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True)
    
    # Stripe payment
    stripe_payment_intent_id = Column(String(255), unique=True, nullable=True)
    stripe_invoice_id = Column(String(255), nullable=True)
    
    # Payment details
    description = Column(String(255), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="EUR")
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    
    # Payment type
    payment_type = Column(String(50), default="subscription")  # subscription, package, one_time
    
    # Dates
    paid_at = Column(DateTime(timezone=True), nullable=True)
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Extra data
    extra_data = Column(JSONB, default={})
    
    def __repr__(self):
        return f"<Payment {self.amount} {self.currency}>"

