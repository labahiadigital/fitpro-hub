from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel

from app.core.database import get_db
from app.models.nutrition import Food, FoodCategory, MealPlan, CustomFood, FoodFavorite
from app.middleware.auth import require_workspace, require_staff, CurrentUser

router = APIRouter()


# ============ SCHEMAS ============

class FoodCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    category_id: Optional[UUID] = None
    serving_size: float = 100
    serving_unit: str = "g"
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    fiber: Optional[float] = None
    sugar: Optional[float] = None
    sodium: Optional[float] = None
    micronutrients: dict = {}
    allergens: List[str] = []


class FoodResponse(BaseModel):
    id: UUID
    name: str
    brand: Optional[str]
    category_id: Optional[UUID]
    serving_size: Optional[Decimal]
    serving_unit: Optional[str]
    calories: Optional[Decimal]
    protein: Optional[Decimal]
    carbs: Optional[Decimal]
    fat: Optional[Decimal]
    fiber: Optional[Decimal]
    is_public: bool
    is_system: bool
    
    class Config:
        from_attributes = True


class MealTimeSchema(BaseModel):
    name: str
    time: str

class MealTimesSchema(BaseModel):
    meals: List[MealTimeSchema]

class MealPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    duration_days: int = 7
    dietary_tags: List[str] = []
    target_calories: Optional[float] = None
    target_protein: Optional[float] = None
    target_carbs: Optional[float] = None
    target_fat: Optional[float] = None
    meal_times: Optional[MealTimesSchema] = None
    plan: dict = {"days": []}  # Puede incluir "supplements" en cada día/comida
    is_template: bool = True


class MealPlanResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    client_id: Optional[UUID]
    name: str
    description: Optional[str]
    duration_days: int = 7
    dietary_tags: List[str]
    target_calories: Optional[float]
    target_protein: Optional[float]
    target_carbs: Optional[float]
    target_fat: Optional[float]
    meal_times: dict
    plan: dict
    shopping_list: dict
    is_template: bool
    
    class Config:
        from_attributes = True

class CustomFoodCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    category_id: Optional[UUID] = None
    serving_size: float = 100
    serving_unit: str = "g"
    calories: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0
    sugars_g: float = 0
    saturated_fat_g: float = 0
    sodium_mg: float = 0
    ingredients: Optional[str] = None
    allergens: Optional[str] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None

class CustomFoodResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    brand: Optional[str]
    category_id: Optional[UUID]
    serving_size: Decimal
    serving_unit: str
    calories: Decimal
    protein_g: Decimal
    carbs_g: Decimal
    fat_g: Decimal
    fiber_g: Decimal
    sugars_g: Decimal
    saturated_fat_g: Decimal
    sodium_mg: Decimal
    ingredients: Optional[str]
    allergens: Optional[str]
    image_url: Optional[str]
    notes: Optional[str]
    
    class Config:
        from_attributes = True


# ============ FOODS ============

@router.get("/foods", response_model=List[FoodResponse])
async def list_foods(
    search: Optional[str] = None,
    category_id: Optional[UUID] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar alimentos (públicos, del sistema, y del workspace).
    """
    query = select(Food).where(
        or_(
            Food.workspace_id == current_user.workspace_id,
            Food.is_public == True,
            Food.is_system == True
        )
    )
    
    if search:
        query = query.where(Food.name.ilike(f"%{search}%"))
    
    if category_id:
        query = query.where(Food.category_id == category_id)
    
    result = await db.execute(query.order_by(Food.name))
    return result.scalars().all()


@router.post("/foods", response_model=FoodResponse, status_code=status.HTTP_201_CREATED)
async def create_food(
    data: FoodCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo alimento personalizado.
    """
    food = Food(
        workspace_id=current_user.workspace_id,
        name=data.name,
        brand=data.brand,
        category_id=data.category_id,
        serving_size=data.serving_size,
        serving_unit=data.serving_unit,
        calories=data.calories,
        protein=data.protein,
        carbs=data.carbs,
        fat=data.fat,
        fiber=data.fiber,
        sugar=data.sugar,
        sodium=data.sodium,
        micronutrients=data.micronutrients,
        allergens=data.allergens,
        is_public=False,
        is_system=False
    )
    db.add(food)
    await db.commit()
    await db.refresh(food)
    return food


# ============ MEAL PLANS ============

@router.get("/plans", response_model=List[MealPlanResponse])
async def list_meal_plans(
    is_template: Optional[str] = None,
    client_id: Optional[UUID] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar planes de nutrición.
    """
    query = select(MealPlan).where(
        MealPlan.workspace_id == current_user.workspace_id
    )
    
    if is_template:
        query = query.where(MealPlan.is_template == is_template)
    
    if client_id:
        query = query.where(MealPlan.client_id == client_id)
    
    result = await db.execute(query.order_by(MealPlan.created_at.desc()))
    return result.scalars().all()


@router.post("/plans", response_model=MealPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_meal_plan(
    data: MealPlanCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo plan de nutrición.
    """
    # Generate shopping list from plan
    shopping_list = generate_shopping_list(data.plan)
    
    # Set default meal times if not provided
    meal_times = data.meal_times.model_dump() if data.meal_times else {
        "meals": [
            {"name": "Comida 1", "time": "08:00"},
            {"name": "Comida 2", "time": "13:00"},
            {"name": "Comida 3", "time": "20:00"}
        ]
    }
    
    plan = MealPlan(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        client_id=data.client_id,
        name=data.name,
        description=data.description,
        dietary_tags=data.dietary_tags,
        target_calories=data.target_calories,
        target_protein=data.target_protein,
        target_carbs=data.target_carbs,
        target_fat=data.target_fat,
        meal_times=meal_times,
        plan=data.plan,
        shopping_list=shopping_list,
        is_template=data.is_template
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.get("/plans/{plan_id}", response_model=MealPlanResponse)
async def get_meal_plan(
    plan_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de un plan de nutrición.
    """
    result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.workspace_id == current_user.workspace_id
        )
    )
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan de nutrición no encontrado"
        )
    
    return plan


@router.put("/plans/{plan_id}", response_model=MealPlanResponse)
async def update_meal_plan(
    plan_id: UUID,
    data: MealPlanCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar un plan de nutrición.
    """
    result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.workspace_id == current_user.workspace_id
        )
    )
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan de nutrición no encontrado"
        )
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Handle meal_times separately
    if data.meal_times:
        update_data['meal_times'] = data.meal_times.model_dump()
    
    for field, value in update_data.items():
        if field != 'meal_times' or value is not None:
            setattr(plan, field, value)
    
    # Regenerate shopping list
    plan.shopping_list = generate_shopping_list(data.plan)
    
    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal_plan(
    plan_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un plan de nutrición.
    """
    result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.workspace_id == current_user.workspace_id
        )
    )
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan de nutrición no encontrado"
        )
    
    await db.delete(plan)
    await db.commit()


def generate_shopping_list(plan: dict) -> dict:
    """
    Generate a shopping list from a meal plan.
    """
    items = {}
    
    for day in plan.get("days", []):
        for meal in day.get("meals", []):
            for food in meal.get("foods", []):
                name = food.get("name", "")
                quantity = food.get("quantity", 0)
                unit = food.get("unit", "g")
                
                if name in items:
                    items[name]["quantity"] += quantity
                else:
                    items[name] = {
                        "name": name,
                        "quantity": quantity,
                        "unit": unit
                    }
    
    return {"items": list(items.values())}


# ============ CUSTOM FOODS ============

@router.get("/custom-foods", response_model=List[CustomFoodResponse])
async def list_custom_foods(
    search: Optional[str] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar alimentos personalizados del workspace.
    """
    query = select(CustomFood).where(
        CustomFood.workspace_id == current_user.workspace_id
    )
    
    if search:
        query = query.where(CustomFood.name.ilike(f"%{search}%"))
    
    result = await db.execute(query.order_by(CustomFood.name))
    return result.scalars().all()


@router.post("/custom-foods", response_model=CustomFoodResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_food(
    data: CustomFoodCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un alimento personalizado (todos los valores están en base a 1g).
    """
    food = CustomFood(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        name=data.name,
        brand=data.brand,
        category_id=data.category_id,
        serving_size=data.serving_size,
        serving_unit=data.serving_unit,
        calories=data.calories,
        protein_g=data.protein_g,
        carbs_g=data.carbs_g,
        fat_g=data.fat_g,
        fiber_g=data.fiber_g,
        sugars_g=data.sugars_g,
        saturated_fat_g=data.saturated_fat_g,
        sodium_mg=data.sodium_mg,
        ingredients=data.ingredients,
        allergens=data.allergens,
        image_url=data.image_url,
        notes=data.notes
    )
    db.add(food)
    await db.commit()
    await db.refresh(food)
    return food


@router.get("/custom-foods/{food_id}", response_model=CustomFoodResponse)
async def get_custom_food(
    food_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de un alimento personalizado.
    """
    result = await db.execute(
        select(CustomFood).where(
            CustomFood.id == food_id,
            CustomFood.workspace_id == current_user.workspace_id
        )
    )
    food = result.scalar_one_or_none()
    
    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alimento personalizado no encontrado"
        )
    
    return food


@router.put("/custom-foods/{food_id}", response_model=CustomFoodResponse)
async def update_custom_food(
    food_id: UUID,
    data: CustomFoodCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar un alimento personalizado.
    """
    result = await db.execute(
        select(CustomFood).where(
            CustomFood.id == food_id,
            CustomFood.workspace_id == current_user.workspace_id
        )
    )
    food = result.scalar_one_or_none()
    
    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alimento personalizado no encontrado"
        )
    
    for field, value in data.model_dump().items():
        setattr(food, field, value)
    
    await db.commit()
    await db.refresh(food)
    return food


@router.delete("/custom-foods/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_food(
    food_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un alimento personalizado.
    """
    result = await db.execute(
        select(CustomFood).where(
            CustomFood.id == food_id,
            CustomFood.workspace_id == current_user.workspace_id
        )
    )
    food = result.scalar_one_or_none()
    
    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alimento personalizado no encontrado"
        )
    
    await db.delete(food)
    await db.commit()


# ============ FOOD FAVORITES ============

@router.get("/favorites", response_model=List[FoodResponse])
async def list_favorite_foods(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar alimentos favoritos del usuario.
    """
    result = await db.execute(
        select(Food)
        .join(FoodFavorite)
        .where(
            FoodFavorite.user_id == current_user.id,
            FoodFavorite.workspace_id == current_user.workspace_id
        )
        .order_by(Food.name)
    )
    return result.scalars().all()


@router.post("/favorites/{food_id}", status_code=status.HTTP_201_CREATED)
async def add_food_to_favorites(
    food_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Añadir un alimento a favoritos.
    """
    # Check if food exists
    result = await db.execute(
        select(Food).where(Food.id == food_id)
    )
    food = result.scalar_one_or_none()
    
    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alimento no encontrado"
        )
    
    # Check if already favorited
    result = await db.execute(
        select(FoodFavorite).where(
            FoodFavorite.user_id == current_user.id,
            FoodFavorite.food_id == food_id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este alimento ya está en favoritos"
        )
    
    # Add to favorites
    favorite = FoodFavorite(
        workspace_id=current_user.workspace_id,
        user_id=current_user.id,
        food_id=food_id
    )
    db.add(favorite)
    await db.commit()
    
    return {"message": "Alimento añadido a favoritos"}


@router.delete("/favorites/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_food_from_favorites(
    food_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un alimento de favoritos.
    """
    result = await db.execute(
        select(FoodFavorite).where(
            FoodFavorite.user_id == current_user.id,
            FoodFavorite.food_id == food_id,
            FoodFavorite.workspace_id == current_user.workspace_id
        )
    )
    favorite = result.scalar_one_or_none()
    
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Este alimento no está en favoritos"
        )
    
    await db.delete(favorite)
    await db.commit()


# ============ MEAL PLAN CALCULATIONS WITH SUPPLEMENTS ============

class NutritionCalculationRequest(BaseModel):
    foods: List[dict]  # [{"id": "uuid", "quantity": 150, "is_custom": false}, ...]
    supplements: List[dict] = []  # [{"id": "uuid", "dosage_g": 30}, ...]

class NutritionCalculationResponse(BaseModel):
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    total_fiber: float
    breakdown: dict  # Detailed breakdown by item

@router.post("/calculate-nutrition", response_model=NutritionCalculationResponse)
async def calculate_nutrition(
    data: NutritionCalculationRequest,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Calcular valores nutricionales totales incluyendo alimentos y suplementos.
    """
    from app.models.supplement import Supplement
    
    totals = {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0,
        "fiber": 0
    }
    breakdown = {"foods": [], "supplements": []}
    
    # Calculate foods
    for food_item in data.foods:
        food_id = food_item.get("id")
        quantity = food_item.get("quantity", 100)  # grams
        is_custom = food_item.get("is_custom", False)
        
        if is_custom:
            result = await db.execute(
                select(CustomFood).where(CustomFood.id == food_id)
            )
            food = result.scalar_one_or_none()
            if not food:
                continue
            
            # Custom foods are stored per 1g, so multiply by quantity
            item_calories = float(food.calories * quantity)
            item_protein = float(food.protein_g * quantity)
            item_carbs = float(food.carbs_g * quantity)
            item_fat = float(food.fat_g * quantity)
            item_fiber = float(food.fiber_g * quantity)
        else:
            result = await db.execute(
                select(Food).where(Food.id == food_id)
            )
            food = result.scalar_one_or_none()
            if not food:
                continue
            
            # Regular foods are stored per serving_size (usually 100g)
            serving_size = float(food.serving_size) if food.serving_size else 100
            factor = quantity / serving_size
            
            item_calories = float(food.calories * factor) if food.calories else 0
            item_protein = float(food.protein_g * factor) if food.protein_g else 0
            item_carbs = float(food.carbs_g * factor) if food.carbs_g else 0
            item_fat = float(food.fat_g * factor) if food.fat_g else 0
            item_fiber = float(food.fiber_g * factor) if food.fiber_g else 0
        
        totals["calories"] += item_calories
        totals["protein"] += item_protein
        totals["carbs"] += item_carbs
        totals["fat"] += item_fat
        totals["fiber"] += item_fiber
        
        breakdown["foods"].append({
            "name": food.name,
            "quantity": quantity,
            "calories": round(item_calories, 2),
            "protein": round(item_protein, 2),
            "carbs": round(item_carbs, 2),
            "fat": round(item_fat, 2),
            "fiber": round(item_fiber, 2)
        })
    
    # Calculate supplements
    for supp_item in data.supplements:
        supp_id = supp_item.get("id")
        dosage_g = supp_item.get("dosage_g", 30)
        
        result = await db.execute(
            select(Supplement).where(Supplement.id == supp_id)
        )
        supplement = result.scalar_one_or_none()
        if not supplement:
            continue
        
        # Supplements might store values per serving, need to calculate
        # For simplicity, assuming values are per stated serving_size
        serving_match = supplement.serving_size.replace("g", "").strip() if supplement.serving_size else "30"
        try:
            serving_size = float(serving_match)
        except:
            serving_size = 30
        
        factor = dosage_g / serving_size
        
        item_calories = float(supplement.calories * factor) if supplement.calories else 0
        item_protein = float(supplement.protein * factor) if supplement.protein else 0
        item_carbs = float(supplement.carbs * factor) if supplement.carbs else 0
        item_fat = float(supplement.fat * factor) if supplement.fat else 0
        
        totals["calories"] += item_calories
        totals["protein"] += item_protein
        totals["carbs"] += item_carbs
        totals["fat"] += item_fat
        
        breakdown["supplements"].append({
            "name": supplement.name,
            "dosage_g": dosage_g,
            "calories": round(item_calories, 2),
            "protein": round(item_protein, 2),
            "carbs": round(item_carbs, 2),
            "fat": round(item_fat, 2)
        })
    
    return NutritionCalculationResponse(
        total_calories=round(totals["calories"], 2),
        total_protein=round(totals["protein"], 2),
        total_carbs=round(totals["carbs"], 2),
        total_fat=round(totals["fat"], 2),
        total_fiber=round(totals["fiber"], 2),
        breakdown=breakdown
    )
