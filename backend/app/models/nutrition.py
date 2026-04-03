"""Nutrition and Food models."""
from sqlalchemy import Column, String, Text, ForeignKey, Float, Boolean, Numeric, Integer, CHAR, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship, deferred
from sqlalchemy.ext.mutable import MutableDict

from app.models.base import BaseModel


# NOTE: FoodCategory table does not exist in DB - foods have 'category' as text directly
# class FoodCategory(BaseModel):
#     """Food category model."""
#     __tablename__ = "food_categories"
#     ... (table not in current schema)


class Food(BaseModel):
    """Food library model - matches Supabase schema."""
    
    __tablename__ = "foods"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    # NOTE: No category_id FK - category is stored as text directly
    
    # Basic food details
    name = Column(Text, nullable=False)
    brand = Column(Text, nullable=True)
    category = Column(Text, nullable=True)  # Legacy text category field
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
    nutrients = Column(JSONB, default=lambda: {})
    
    # Visibility
    is_global = Column(Boolean, default=False)
    
    # Aliases for backward compatibility with endpoints
    @property
    def protein(self):
        return self.protein_g
    
    @property
    def carbs(self):
        return self.carbs_g
    
    @property
    def fat(self):
        return self.fat_g
    
    @property
    def fiber(self):
        return self.fiber_g
    
    @property
    def sugar(self):
        return self.sugars_g
    
    @property
    def sodium(self):
        return self.sodium_mg
    
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
    _duration_weeks = deferred(Column("duration_weeks", Integer, default=1, server_default="1", nullable=True))
    
    # Dietary preferences
    dietary_tags = Column(ARRAY(Text), default=[])
    
    # Target macros
    target_calories = Column(Numeric, nullable=True)
    target_protein = Column(Numeric, nullable=True)
    target_carbs = Column(Numeric, nullable=True)
    target_fat = Column(Numeric, nullable=True)
    
    # Meal times structure: {"meals": [{"name": "Comida 1", "time": "08:00"}, ...]}
    meal_times = Column(JSONB, default=lambda: {
        "meals": [
            {"name": "Comida 1", "time": "08:00"},
            {"name": "Comida 2", "time": "13:00"},
            {"name": "Comida 3", "time": "20:00"}
        ]
    })
    
    # Plan structure: { weeks: [{ week: 1, days: [{ day: 1, meals: [...] }] }] }
    plan = Column(JSONB, default=lambda: {"weeks": [{"week": 1, "days": []}]})
    
    # Shopping list (auto-generated)
    shopping_list = Column(JSONB, default=lambda: {"items": []})
    
    # Is this a template or assigned plan
    is_template = Column(Boolean, default=True)
    
    # Whether this plan is the active one for the client
    is_active = Column(Boolean, default=False, server_default="false")
    
    # Adherence tracking - MutableDict allows SQLAlchemy to detect in-place changes
    adherence = Column(MutableDict.as_mutable(JSONB), default=lambda: {"logs": []})
    
    # Relationships
    workspace = relationship("Workspace", back_populates="meal_plans")
    client = relationship("Client", back_populates="meal_plans")

    @property
    def duration_weeks(self):
        try:
            from sqlalchemy import inspect as sa_inspect
            state = sa_inspect(self)
            if "_duration_weeks" in state.dict:
                val = state.dict["_duration_weeks"]
                if val is not None:
                    return val
        except Exception:
            pass
        return max(1, (self.duration_days or 7) // 7)

    @duration_weeks.setter
    def duration_weeks(self, value):
        self._duration_weeks = value
    
    def __repr__(self):
        return f"<MealPlan {self.name}>"


class CustomFood(BaseModel):
    """Custom food created by workspace users."""
    
    __tablename__ = "custom_foods"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Basic food details
    name = Column(Text, nullable=False, index=True)
    brand = Column(Text, nullable=True)
    # NOTE: food_categories table doesn't exist - using category as text field like in Food model
    category = Column(Text, nullable=True)
    
    # Serving info
    serving_size = Column(Numeric, default=100, nullable=False)
    serving_unit = Column(Text, default='g', nullable=False)
    
    # Nutritional info per 1g
    calories = Column(Numeric, default=0, nullable=False)
    protein_g = Column(Numeric, default=0, nullable=False)
    carbs_g = Column(Numeric, default=0, nullable=False)
    fat_g = Column(Numeric, default=0, nullable=False)
    fiber_g = Column(Numeric, default=0, nullable=False)
    sugars_g = Column(Numeric, default=0, nullable=False)
    saturated_fat_g = Column(Numeric, default=0, nullable=False)
    sodium_mg = Column(Numeric, default=0, nullable=False)
    
    # Additional details
    ingredients = Column(Text, nullable=True)
    allergens = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<CustomFood {self.name}>"


class FoodFavorite(BaseModel):
    """Food favorites for users."""
    
    __tablename__ = "food_favorites"
    __table_args__ = (
        UniqueConstraint('user_id', 'food_id', name='unique_user_food_favorite'),
    )
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    food_id = Column(UUID(as_uuid=True), ForeignKey("foods.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    food = relationship("Food")
    
    def __repr__(self):
        return f"<FoodFavorite user={self.user_id} food={self.food_id}>"


class Recipe(BaseModel):
    """Reusable recipe composed of foods and supplements."""
    
    __tablename__ = "recipes"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Text, nullable=True)
    tags = Column(ARRAY(Text), default=[])
    
    servings = Column(Integer, default=1)
    prep_time_minutes = Column(Integer, nullable=True)
    cook_time_minutes = Column(Integer, nullable=True)
    difficulty = Column(Text, nullable=True)
    
    image_url = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    is_public = Column(Boolean, default=False)
    is_global = Column(Boolean, default=False)
    
    # Items: [{"food_id": "...", "quantity_grams": 100, "name": "...", "type": "food"|"supplement", "calories": ..., "protein": ..., "carbs": ..., "fat": ...}]
    items = Column(JSONB, default=lambda: [])
    
    # Aggregated macros (cached, computed from items)
    total_calories = Column(Numeric, default=0)
    total_protein = Column(Numeric, default=0)
    total_carbs = Column(Numeric, default=0)
    total_fat = Column(Numeric, default=0)
    total_fiber = Column(Numeric, default=0)
    total_sugar = Column(Numeric, default=0)
    
    def __repr__(self):
        return f"<Recipe {self.name}>"
