"""Supplement library models - matches Supabase schema."""
from sqlalchemy import Column, Text, Numeric, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Supplement(BaseModel):
    """Supplement library model - matches Supabase schema."""
    
    __tablename__ = "supplements"
    
    # DB columns: id, workspace_id, name, brand, category, description, 
    #             serving_size, serving_unit, calories, protein, carbs, fat,
    #             usage_instructions, warnings, image_url, is_global, created_at, updated_at
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Supplement details
    name = Column(Text, nullable=False)
    brand = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    category = Column(Text, nullable=True)
    
    # Serving info
    serving_size = Column(Numeric, nullable=True)
    serving_unit = Column(Text, nullable=True)
    
    # Nutritional info
    calories = Column(Numeric, nullable=True)
    protein = Column(Numeric, nullable=True)
    carbs = Column(Numeric, nullable=True)
    fat = Column(Numeric, nullable=True)
    
    # Additional info
    usage_instructions = Column(Text, nullable=True)
    warnings = Column(Text, nullable=True)
    
    # Media
    image_url = Column(Text, nullable=True)
    
    # Visibility
    is_global = Column(Boolean, default=False)
    
    def __repr__(self):
        return f"<Supplement {self.name}>"


# NOTE: SupplementRecommendation table does not exist in DB
# class SupplementRecommendation(BaseModel):
#     __tablename__ = "supplement_recommendations"
#     ... (table not in current schema)


class SupplementFavorite(BaseModel):
    """Supplement favorites for users."""
    
    __tablename__ = "supplement_favorites"
    __table_args__ = (
        UniqueConstraint('user_id', 'supplement_id', name='unique_user_supplement_favorite'),
    )
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    supplement_id = Column(UUID(as_uuid=True), ForeignKey("supplements.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    supplement = relationship("Supplement")
    
    def __repr__(self):
        return f"<SupplementFavorite user={self.user_id} supplement={self.supplement_id}>"
