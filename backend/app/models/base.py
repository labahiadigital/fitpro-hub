import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declared_attr
from app.core.database import Base

# Re-export Base for other models to use
__all__ = ["Base", "TimestampMixin", "WorkspaceMixin", "BaseModel"]


class TimestampMixin:
    """Mixin that adds created_at and updated_at timestamps."""
    
    @declared_attr
    def created_at(cls):
        return Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    @declared_attr
    def updated_at(cls):
        return Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class WorkspaceMixin:
    """Mixin for models that belong to a workspace."""
    
    @declared_attr
    def workspace_id(cls):
        return Column(UUID(as_uuid=True), ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)


class BaseModel(Base, TimestampMixin):
    """Base model with UUID primary key and timestamps."""
    __abstract__ = True
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

