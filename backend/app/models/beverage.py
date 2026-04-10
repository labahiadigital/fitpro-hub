"""Beverage model for drink tracking in ml."""
from sqlalchemy import Column, String, Text, Numeric, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class Beverage(BaseModel):
    __tablename__ = "beverages"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(500), nullable=False)
    category = Column(String(200), nullable=True)
    serving_size_ml = Column(Numeric, default=250)
    reference_ml = Column(Numeric, default=100)
    calories = Column(Numeric, default=0)
    protein = Column(Numeric, default=0)
    fat = Column(Numeric, default=0)
    carbs = Column(Numeric, default=0)
    is_global = Column(Boolean, default=False, nullable=False, index=True)
