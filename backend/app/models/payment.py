from enum import Enum as PyEnum
from sqlalchemy import Column, String, Text, Enum, ForeignKey, Numeric, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


# Enum values must match DB exactly (lowercase)
class SubscriptionStatus(str, PyEnum):
    active = "active"
    past_due = "past_due"
    cancelled = "cancelled"
    trialing = "trialing"
    paused = "paused"


class PaymentStatus(str, PyEnum):
    pending = "pending"
    succeeded = "succeeded"
    failed = "failed"
    refunded = "refunded"


class StripeAccount(BaseModel):
    __tablename__ = "stripe_accounts"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Stripe Connect account
    stripe_account_id = Column(Text, unique=True, nullable=False)
    
    # Account status
    is_active = Column(Boolean, default=True)
    onboarding_complete = Column(Boolean, default=False)
    
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
    
    # Stripe subscription
    stripe_subscription_id = Column(Text, unique=True, nullable=True)
    stripe_customer_id = Column(Text, nullable=True)
    stripe_price_id = Column(Text, nullable=True)
    
    # Subscription details
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        Enum(SubscriptionStatus, name="subscription_status", create_type=False),
        default=SubscriptionStatus.active
    )
    
    # Pricing - use Numeric to match DB
    amount = Column(Numeric, nullable=False)
    currency = Column(Text, default="EUR")
    interval = Column(Text, default="month")  # month, year, week
    
    # Dates
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    
    # Extra metadata (DB column is 'metadata', but we use different attr name to avoid SQLAlchemy conflict)
    extra_data = Column("metadata", JSONB, default={})
    
    # Relationships
    payments = relationship("Payment", back_populates="subscription")
    client = relationship("Client", back_populates="subscriptions")
    
    def __repr__(self):
        return f"<Subscription {self.name}>"


class Payment(BaseModel):
    __tablename__ = "payments"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True)
    
    # Stripe payment
    stripe_payment_intent_id = Column(Text, unique=True, nullable=True)
    stripe_invoice_id = Column(Text, nullable=True)
    
    # Payment details
    description = Column(Text, nullable=True)
    amount = Column(Numeric, nullable=False)
    currency = Column(Text, default="EUR")
    status = Column(
        Enum(PaymentStatus, name="payment_status", create_type=False),
        default=PaymentStatus.pending
    )
    
    # Payment type
    payment_type = Column(Text, default="subscription")  # subscription, package, one_time
    
    # Dates
    paid_at = Column(DateTime(timezone=True), nullable=True)
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Extra metadata (DB column is 'metadata', but we use different attr name to avoid SQLAlchemy conflict)
    extra_data = Column("metadata", JSONB, default={})
    
    # Relationships
    subscription = relationship("Subscription", back_populates="payments")
    client = relationship("Client", back_populates="payments")
    
    def __repr__(self):
        return f"<Payment {self.amount} {self.currency}>"
