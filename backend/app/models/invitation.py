"""Client invitation model."""
from enum import Enum as PyEnum
from datetime import datetime, timedelta
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
    
    # Status
    status = Column(Enum(InvitationStatus), default=InvitationStatus.PENDING, nullable=False)
    
    # Expiration (default 7 days)
    expires_at = Column(DateTime, nullable=False)
    
    # When accepted
    accepted_at = Column(DateTime, nullable=True)
    
    # Optional: pre-created client record
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    
    # Custom message from trainer
    message = Column(String(1000), nullable=True)
    
    # Relationships
    workspace = relationship("Workspace")
    inviter = relationship("User")
    client = relationship("Client")
    
    @property
    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_valid(self) -> bool:
        return self.status == InvitationStatus.PENDING and not self.is_expired
    
    def __repr__(self):
        return f"<ClientInvitation {self.email} - {self.status}>"
