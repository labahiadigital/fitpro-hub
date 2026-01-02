"""Supplement library models with referral codes."""
from sqlalchemy import Column, String, Text, Float, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Supplement(BaseModel):
    """Supplement library model."""
    
    __tablename__ = "supplements"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Supplement details
    name = Column(String(255), nullable=False)
    brand = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # proteína, creatina, vitaminas, etc.
    
    # Nutritional info
    serving_size = Column(String(50), default="30g")
    calories = Column(Float, nullable=True)
    protein = Column(Float, nullable=True)
    carbs = Column(Float, nullable=True)
    fat = Column(Float, nullable=True)
    
    # Additional info
    ingredients = Column(Text, nullable=True)
    usage_instructions = Column(Text, nullable=True)
    warnings = Column(Text, nullable=True)
    
    # Media
    image_url = Column(String(500), nullable=True)
    
    # Referral/affiliate info
    purchase_url = Column(String(500), nullable=True)
    referral_code = Column(String(100), nullable=True)
    referral_url = Column(String(500), nullable=True)
    commission_percentage = Column(Float, nullable=True)  # Porcentaje de comisión
    
    # Visibility
    is_public = Column(Boolean, default=False)
    is_system = Column(Boolean, default=False)
    
    # Extra data
    extra_data = Column(JSONB, default={})
    
    def __repr__(self):
        return f"<Supplement {self.name}>"


class SupplementRecommendation(BaseModel):
    """Supplement recommendations for clients."""
    
    __tablename__ = "supplement_recommendations"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    supplement_id = Column(UUID(as_uuid=True), ForeignKey("supplements.id", ondelete="CASCADE"), nullable=False)
    recommended_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Recommendation details
    dosage = Column(String(100), nullable=True)  # e.g., "30g después del entrenamiento"
    frequency = Column(String(100), nullable=True)  # e.g., "Diario", "Días de entrenamiento"
    notes = Column(Text, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Relationships
    supplement = relationship("Supplement")
    client = relationship("Client", back_populates="supplement_recommendations")
    
    def __repr__(self):
        return f"<SupplementRecommendation {self.id}>"
