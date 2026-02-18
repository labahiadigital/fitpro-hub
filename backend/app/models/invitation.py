"""Client invitation model."""
from enum import Enum as PyEnum
from datetime import datetime, timedelta, timezone
from sqlalchemy import Column, String, Boolean, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class InvitationStatus(str, PyEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class ClientInvitation(BaseModel):
    """Invitation for a client to join a workspace."""
    
    __tablename__ = "client_invitations"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Client info
    email = Column(String(255), nullable=False, index=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    
    # Invitation token (unique, used in URL)
    token = Column(String(64), unique=True, nullable=False, index=True)
    
    # Status - using String instead of Enum for flexibility with DB values
    status = Column(String(20), default="pending", nullable=False)
    
    # Expiration (default 7 days)
    expires_at = Column(DateTime, nullable=False)
    
    # When accepted
    accepted_at = Column(DateTime, nullable=True)
    
    # Optional: pre-created client record
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    
    # Custom message from trainer
    message = Column(String(1000), nullable=True)
    
    # Product/plan to pay during onboarding
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    
    # Payment created during onboarding (set by create-onboarding-payment)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    workspace = relationship("Workspace")
    inviter = relationship("User")
    client = relationship("Client")
    product = relationship("Product")
    payment = relationship("Payment")
    
    @property
    def is_expired(self) -> bool:
        now = datetime.now(timezone.utc)
        # Handle both timezone-aware and timezone-naive expires_at
        if self.expires_at.tzinfo is None:
            expires_at = self.expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at = self.expires_at
        return now > expires_at
    
    @property
    def is_valid(self) -> bool:
        return self.status == "pending" and not self.is_expired
    
    @property
    def requires_payment(self) -> bool:
        """Whether this invitation requires payment before completing."""
        return self.product_id is not None
    
    @property
    def is_payment_completed(self) -> bool:
        """Whether the required payment has been completed."""
        if not self.requires_payment:
            return True
        if self.payment is None:
            return False
        from app.models.payment import PaymentStatus
        return self.payment.status == PaymentStatus.succeeded
    
    def __repr__(self):
        return f"<ClientInvitation {self.email} - {self.status}>"
