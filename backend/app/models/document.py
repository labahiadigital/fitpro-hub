"""Document and file management models."""
from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime

from app.models.base import BaseModel


class Document(BaseModel):
    """Document model for files sent/received by clients."""
    
    __tablename__ = "documents"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Document details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=True)  # pdf, image, etc.
    file_size = Column(Integer, nullable=True)  # in bytes
    
    # Document type/category
    document_type = Column(String(50), default="general")  # general, diet_plan, workout_plan, medical, contract, etc.
    
    # Direction
    direction = Column(String(20), default="outbound")  # outbound (trainer->client), inbound (client->trainer)
    
    # Status
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Extra data
    extra_data = Column(JSONB, default={})
    
    # Relationships
    client = relationship("Client", back_populates="documents")
    
    def __repr__(self):
        return f"<Document {self.name}>"


class ProgressPhoto(BaseModel):
    """Progress photos for tracking client evolution."""
    
    __tablename__ = "progress_photos"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Photo details
    photo_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    
    # Photo metadata
    photo_type = Column(String(50), default="front")  # front, back, side_left, side_right, other
    photo_date = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Measurements at time of photo (optional)
    weight_kg = Column(String(10), nullable=True)
    body_fat_percentage = Column(String(10), nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Privacy
    is_private = Column(Boolean, default=True)
    
    # Extra data
    extra_data = Column(JSONB, default={})
    
    # Relationships
    client = relationship("Client", back_populates="progress_photos")
    
    def __repr__(self):
        return f"<ProgressPhoto {self.id}>"
