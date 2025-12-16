"""Nutrition and Food models."""
from sqlalchemy import Column, String, Text, ForeignKey, Float, Boolean, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class FoodCategory(BaseModel):
    """Food category model."""
    
    __tablename__ = "food_categories"
    
    name = Column(String(100), nullable=False)
    description = Column(Text)
    icon = Column(String(50))
    parent_id = Column(UUID(as_uuid=True), ForeignKey('food_categories.id', ondelete='SET NULL'))
    is_system = Column(Boolean, default=False)
    
    # Relationships
    foods = relationship("Food", back_populates="category")
    children = relationship("FoodCategory", backref="parent", remote_side="FoodCategory.id")


class Food(BaseModel):
    """Food library model."""
    
    __tablename__ = "foods"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey('food_categories.id', ondelete='SET NULL'))
    
    # Food details
    name = Column(String(255), nullable=False)
    brand = Column(String(255), nullable=True)
    
    # Nutritional info (per serving)
    serving_size = Column(Numeric(10, 2), default=100)
    serving_unit = Column(String(20), default='g')
    calories = Column(Numeric(10, 2))
    protein = Column(Numeric(10, 2))
    carbs = Column(Numeric(10, 2))
    fat = Column(Numeric(10, 2))
    fiber = Column(Numeric(10, 2))
    sugar = Column(Numeric(10, 2))
    sodium = Column(Numeric(10, 2))
    micronutrients = Column(JSONB, default={})
    allergens = Column(ARRAY(String), default=[])
    
    # Visibility
    is_public = Column(Boolean, default=False)
    is_system = Column(Boolean, default=False)
    barcode = Column(String(50))
    
    # Relationships
    category = relationship("FoodCategory", back_populates="foods")
    
    def __repr__(self):
        return f"<Food {self.name}>"


class MealPlan(BaseModel):
    """Meal plan model."""
    
    __tablename__ = "meal_plans"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Plan details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Dietary preferences
    dietary_tags = Column(ARRAY(String), default=[])
    
    # Target macros
    target_calories = Column(Float, nullable=True)
    target_protein = Column(Float, nullable=True)
    target_carbs = Column(Float, nullable=True)
    target_fat = Column(Float, nullable=True)
    
    # Plan structure (days -> meals -> foods with portions)
    plan = Column(JSONB, default={"days": []})
    
    # Shopping list (auto-generated)
    shopping_list = Column(JSONB, default={"items": []})
    
    # Is this a template or assigned plan
    is_template = Column(String(1), default="Y")
    
    # Adherence tracking
    adherence = Column(JSONB, default={"logs": []})
    
    # Relationships
    workspace = relationship("Workspace", back_populates="meal_plans")
    client = relationship("Client", back_populates="meal_plans")
    
    def __repr__(self):
        return f"<MealPlan {self.name}>"
