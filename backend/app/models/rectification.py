"""Rectification request model for content correction tickets."""
from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class RectificationRequest(BaseModel):
    __tablename__ = "rectification_requests"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    entity_name = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending", server_default="pending")
