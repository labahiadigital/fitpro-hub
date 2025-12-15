from sqlalchemy import Column, String, Text, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Food(BaseModel):
    __tablename__ = "foods"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Food details
    name = Column(String(255), nullable=False)
    brand = Column(String(255), nullable=True)
    category = Column(String(100), nullable=True)  # protein, carbs, vegetables, etc.
    
    # Nutritional info (per 100g)
    calories = Column(Float, default=0)
    protein_g = Column(Float, default=0)
    carbs_g = Column(Float, default=0)
    fat_g = Column(Float, default=0)
    fiber_g = Column(Float, default=0)
    
    # Additional nutrients
    nutrients = Column(JSONB, default={})
    
    # Serving info
    serving_size = Column(Float, default=100)
    serving_unit = Column(String(50), default="g")
    
    # Global food (null workspace_id) or workspace-specific
    is_global = Column(String(1), default="N")  # Y/N
    
    def __repr__(self):
        return f"<Food {self.name}>"


class MealPlan(BaseModel):
    __tablename__ = "meal_plans"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Plan details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Dietary preferences
    dietary_tags = Column(ARRAY(String), default=[])  # vegetarian, keto, gluten-free, etc.
    
    # Target macros
    target_calories = Column(Float, nullable=True)
    target_protein = Column(Float, nullable=True)
    target_carbs = Column(Float, nullable=True)
    target_fat = Column(Float, nullable=True)
    
    # Plan structure
    # Contains: days -> meals -> foods with portions
    plan = Column(JSONB, default={
        "days": []
    })
    
    # Shopping list (auto-generated)
    shopping_list = Column(JSONB, default={
        "items": []
    })
    
    # Is this a template or assigned plan
    is_template = Column(String(1), default="Y")  # Y/N
    
    # Adherence tracking
    adherence = Column(JSONB, default={
        "logs": []
    })
    
    # Relationships
    workspace = relationship("Workspace", back_populates="meal_plans")
    client = relationship("Client", back_populates="meal_plans")
    
    def __repr__(self):
        return f"<MealPlan {self.name}>"

