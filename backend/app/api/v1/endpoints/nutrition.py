from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.models.nutrition import Food, MealPlan
from app.middleware.auth import require_workspace, require_staff, CurrentUser

router = APIRouter()


# ============ SCHEMAS ============

class FoodCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    calories: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0
    nutrients: dict = {}
    serving_size: float = 100
    serving_unit: str = "g"


class FoodResponse(BaseModel):
    id: UUID
    name: str
    brand: Optional[str]
    category: Optional[str]
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    serving_size: float
    serving_unit: str
    
    class Config:
        from_attributes = True


class MealPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    dietary_tags: List[str] = []
    target_calories: Optional[float] = None
    target_protein: Optional[float] = None
    target_carbs: Optional[float] = None
    target_fat: Optional[float] = None
    plan: dict = {"days": []}
    is_template: str = "Y"


class MealPlanResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    client_id: Optional[UUID]
    name: str
    description: Optional[str]
    dietary_tags: List[str]
    target_calories: Optional[float]
    target_protein: Optional[float]
    target_carbs: Optional[float]
    target_fat: Optional[float]
    plan: dict
    shopping_list: dict
    is_template: str
    created_at: str
    
    class Config:
        from_attributes = True


# ============ FOODS ============

@router.get("/foods", response_model=List[FoodResponse])
async def list_foods(
    search: Optional[str] = None,
    category: Optional[str] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar alimentos (globales y del workspace).
    """
    query = select(Food).where(
        (Food.workspace_id == current_user.workspace_id) |
        (Food.is_global == "Y")
    )
    
    if search:
        query = query.where(Food.name.ilike(f"%{search}%"))
    
    if category:
        query = query.where(Food.category == category)
    
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
        category=data.category,
        calories=data.calories,
        protein_g=data.protein_g,
        carbs_g=data.carbs_g,
        fat_g=data.fat_g,
        fiber_g=data.fiber_g,
        nutrients=data.nutrients,
        serving_size=data.serving_size,
        serving_unit=data.serving_unit,
        is_global="N"
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
    
    for field, value in data.model_dump().items():
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

