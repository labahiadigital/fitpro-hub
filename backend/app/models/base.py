import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

# Re-export Base for compatibility
__all__ = ["Base", "BaseModel", "TimestampMixin"]


class TimestampMixin:
    """Mixin that adds created_at and updated_at timestamps.
    
    Note: This is kept for backwards compatibility but BaseModel 
    already includes these columns.
    """
    pass


class BaseModel(Base):
    """Base model with UUID primary key and timestamps.
    
    All models should inherit from this class.
    """
    __abstract__ = True
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
