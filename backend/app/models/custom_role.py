"""Custom role model for granular permission management."""
from sqlalchemy import Column, String, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models.base import BaseModel


class CustomRole(BaseModel):
    __tablename__ = "custom_roles"

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(50), nullable=True, default="blue")
    is_system = Column(Boolean, default=False, nullable=False)
    permissions = Column(JSONB, nullable=False, default=dict, server_default="{}")
