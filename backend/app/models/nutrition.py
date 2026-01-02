"""Nutrition and Food models."""
from sqlalchemy import Column, String, Text, ForeignKey, Float, Boolean, Numeric, Integer, CHAR
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Food(BaseModel):
    """Food library model - matches Supabase schema."""
    
    __tablename__ = "foods"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Basic food details
    name = Column(Text, nullable=False)
    brand = Column(Text, nullable=True)
    category = Column(Text, nullable=True)
    generic_name = Column(Text, nullable=True)
    quantity = Column(Text, nullable=True)
    packaging = Column(Text, nullable=True)
    labels = Column(Text, nullable=True)
    origins = Column(Text, nullable=True)
    manufacturing_places = Column(Text, nullable=True)
    
    # Serving info
    serving_size = Column(Numeric, default=100)
    serving_unit = Column(Text, default='g')
    
    # Basic nutritional info
    calories = Column(Numeric, default=0)
    energy_kj = Column(Numeric, default=0)
    protein_g = Column(Numeric, default=0)
    carbs_g = Column(Numeric, default=0)
    fat_g = Column(Numeric, default=0)
    fiber_g = Column(Numeric, default=0)
    
    # Extended nutritional info
    saturated_fat_g = Column(Numeric, default=0)
    monounsaturated_fat_g = Column(Numeric, nullable=True)
    polyunsaturated_fat_g = Column(Numeric, nullable=True)
    trans_fat_g = Column(Numeric, nullable=True)
    cholesterol_mg = Column(Numeric, nullable=True)
    omega3_g = Column(Numeric, nullable=True)
    
    # Sugars and carbs
    sugars_g = Column(Numeric, default=0)
    added_sugars_g = Column(Numeric, nullable=True)
    starch_g = Column(Numeric, nullable=True)
    polyols_g = Column(Numeric, nullable=True)
    
    # Minerals
    salt_g = Column(Numeric, default=0)
    sodium_mg = Column(Numeric, default=0)
    potassium_mg = Column(Numeric, nullable=True)
    calcium_mg = Column(Numeric, nullable=True)
    phosphorus_mg = Column(Numeric, nullable=True)
    iron_mg = Column(Numeric, nullable=True)
    magnesium_mg = Column(Numeric, nullable=True)
    zinc_mg = Column(Numeric, nullable=True)
    copper_mg = Column(Numeric, nullable=True)
    manganese_mg = Column(Numeric, nullable=True)
    selenium_ug = Column(Numeric, nullable=True)
    iodine_ug = Column(Numeric, nullable=True)
    
    # Vitamins
    vitamin_a_ug = Column(Numeric, nullable=True)
    vitamin_d_ug = Column(Numeric, nullable=True)
    vitamin_e_mg = Column(Numeric, nullable=True)
    vitamin_k_ug = Column(Numeric, nullable=True)
    vitamin_c_mg = Column(Numeric, nullable=True)
    vitamin_b1_mg = Column(Numeric, nullable=True)
    vitamin_b2_mg = Column(Numeric, nullable=True)
    vitamin_b6_mg = Column(Numeric, nullable=True)
    vitamin_b9_ug = Column(Numeric, nullable=True)
    vitamin_b12_ug = Column(Numeric, nullable=True)
    vitamin_pp_mg = Column(Numeric, nullable=True)
    pantothenic_acid_mg = Column(Numeric, nullable=True)
    
    # Other
    alcohol_g = Column(Numeric, default=0)
    caffeine_mg = Column(Numeric, nullable=True)
    choline_mg = Column(Numeric, nullable=True)
    
    # Allergens and ingredients
    ingredients_text = Column(Text, nullable=True)
    allergens = Column(Text, nullable=True)
    allergens_tags = Column(ARRAY(Text), nullable=True)
    traces = Column(Text, nullable=True)
    traces_tags = Column(ARRAY(Text), nullable=True)
    
    # Scores
    nutriscore_grade = Column(CHAR(1), nullable=True)
    nutriscore_score = Column(Integer, nullable=True)
    nova_group = Column(Integer, nullable=True)
    ecoscore_grade = Column(CHAR(1), nullable=True)
    ecoscore_score = Column(Integer, nullable=True)
    
    # Metadata
    barcode = Column(Text, unique=True, nullable=True)
    image_url = Column(Text, nullable=True)
    food_groups = Column(Text, nullable=True)
    source_supermarket = Column(Text, nullable=True)
    data_source = Column(Text, default='open_food_facts')
    nutrients = Column(JSONB, default={})
    
    # Visibility
    is_global = Column(Boolean, default=False)
    
    def __repr__(self):
        return f"<Food {self.name}>"


class MealPlan(BaseModel):
    """Meal plan model - matches Supabase schema."""
    
    __tablename__ = "meal_plans"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Plan details
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    duration_days = Column(Integer, default=7)
    
    # Dietary preferences
    dietary_tags = Column(ARRAY(Text), default=[])
    
    # Target macros
    target_calories = Column(Numeric, nullable=True)
    target_protein = Column(Numeric, nullable=True)
    target_carbs = Column(Numeric, nullable=True)
    target_fat = Column(Numeric, nullable=True)
    
    # Plan structure (days -> meals -> foods with portions)
    plan = Column(JSONB, default={"days": []})
    
    # Shopping list (auto-generated)
    shopping_list = Column(JSONB, default={"items": []})
    
    # Is this a template or assigned plan
    is_template = Column(Boolean, default=True)
    
    # Adherence tracking
    adherence = Column(JSONB, default={"logs": []})
    
    # Relationships
    workspace = relationship("Workspace", back_populates="meal_plans")
    client = relationship("Client", back_populates="meal_plans")
    
    def __repr__(self):
        return f"<MealPlan {self.name}>"
