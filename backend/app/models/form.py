from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Form(BaseModel):
    __tablename__ = "forms"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Form details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    form_type = Column(String(50), default="custom")  # parq, custom, consent, etc.
    
    # Form schema (fields definition)
    schema = Column(JSONB, default={
        "fields": []
    })
    
    # Settings
    settings = Column(JSONB, default={
        "require_signature": False,
        "send_reminder": True,
        "reminder_days": 3,
        "allow_edit": False
    })
    
    # Status
    is_active = Column(String(1), default="Y")  # Y/N
    
    # Relationships
    workspace = relationship("Workspace", back_populates="forms")
    submissions = relationship("FormSubmission", back_populates="form", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Form {self.name}>"


class FormSubmission(BaseModel):
    __tablename__ = "form_submissions"
    
    form_id = Column(UUID(as_uuid=True), ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Submission data
    answers = Column(JSONB, default={})
    
    # Status
    status = Column(String(50), default="pending")  # pending, submitted, reviewed
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Signature (if required)
    signature_data = Column(JSONB, nullable=True)  # Contains timestamp and signature image/hash
    
    # Relationships
    form = relationship("Form", back_populates="submissions")
    client = relationship("Client", back_populates="form_submissions")
    
    def __repr__(self):
        return f"<FormSubmission {self.form_id} by {self.client_id}>"

