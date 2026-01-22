"""Nutrition endpoints - simplified to match actual DB schema."""
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from pydantic import BaseModel

from app.core.database import get_db
from app.models.nutrition import Food, MealPlan, FoodFavorite
from app.middleware.auth import require_workspace, require_staff, CurrentUser, get_current_user

router = APIRouter()


# ============ SCHEMAS ============

class FoodResponse(BaseModel):
    id: UUID
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    serving_size: Optional[Decimal] = None
    serving_unit: Optional[str] = None
    calories: Optional[Decimal] = None
    protein_g: Optional[Decimal] = None
    carbs_g: Optional[Decimal] = None
    fat_g: Optional[Decimal] = None
    fiber_g: Optional[Decimal] = None
    is_global: bool = False
    
    class Config:
        from_attributes = True


class FoodListResponse(BaseModel):
    items: List[FoodResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class MealPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    duration_days: int = 7
    target_calories: Optional[float] = None
    target_protein: Optional[float] = None
    target_carbs: Optional[float] = None
    target_fat: Optional[float] = None
    dietary_tags: List[str] = []
    plan: dict = {"days": []}
    is_template: bool = True


class MealPlanResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    client_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    duration_days: int
    target_calories: Optional[Decimal] = None
    target_protein: Optional[Decimal] = None
    target_carbs: Optional[Decimal] = None
    target_fat: Optional[Decimal] = None
    dietary_tags: List[str] = []
    plan: dict = {}
    is_template: bool
    
    class Config:
        from_attributes = True


# ============ FOODS ============

@router.get("/foods", response_model=FoodListResponse)
async def list_foods(
    search: Optional[str] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar alimentos (globales y del workspace).
    """
    query = select(Food).where(
        or_(
            Food.workspace_id == current_user.workspace_id,
            Food.is_global == True
        )
    )
    
    if search:
        query = query.where(Food.name.ilike(f"%{search}%"))
    
    if category:
        query = query.where(Food.category == category)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(Food.name).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    foods = result.scalars().all()
    
    return FoodListResponse(
        items=[FoodResponse.model_validate(f) for f in foods],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/foods/{food_id}", response_model=FoodResponse)
async def get_food(
    food_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener un alimento por ID.
    """
    result = await db.execute(
        select(Food).where(
            Food.id == food_id,
            or_(
                Food.workspace_id == current_user.workspace_id,
                Food.is_global == True
            )
        )
    )
    food = result.scalar_one_or_none()
    
    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alimento no encontrado"
        )
    
    return FoodResponse.model_validate(food)


# ============ MEAL PLANS ============

@router.get("/meal-plans", response_model=List[MealPlanResponse])
async def list_meal_plans(
    client_id: Optional[UUID] = None,
    is_template: Optional[bool] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar planes nutricionales.
    """
    query = select(MealPlan).where(MealPlan.workspace_id == current_user.workspace_id)
    
    if client_id:
        query = query.where(MealPlan.client_id == client_id)
    
    if is_template is not None:
        query = query.where(MealPlan.is_template == is_template)
    
    result = await db.execute(query.order_by(MealPlan.created_at.desc()))
    return result.scalars().all()


@router.post("/meal-plans", response_model=MealPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_meal_plan(
    data: MealPlanCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un plan nutricional.
    """
    meal_plan = MealPlan(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        client_id=data.client_id,
        name=data.name,
        description=data.description,
        duration_days=data.duration_days,
        target_calories=data.target_calories,
        target_protein=data.target_protein,
        target_carbs=data.target_carbs,
        target_fat=data.target_fat,
        dietary_tags=data.dietary_tags,
        plan=data.plan,
        is_template=data.is_template
    )
    db.add(meal_plan)
    await db.commit()
    await db.refresh(meal_plan)
    return meal_plan


@router.get("/meal-plans/{plan_id}", response_model=MealPlanResponse)
async def get_meal_plan(
    plan_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener un plan nutricional por ID.
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
            detail="Plan nutricional no encontrado"
        )
    
    return plan


@router.put("/meal-plans/{plan_id}", response_model=MealPlanResponse)
async def update_meal_plan(
    plan_id: UUID,
    data: MealPlanCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar un plan nutricional.
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
            detail="Plan nutricional no encontrado"
        )
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    
    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/meal-plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal_plan(
    plan_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un plan nutricional.
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
            detail="Plan nutricional no encontrado"
        )
    
    await db.delete(plan)
    await db.commit()


# ============ FAVORITES ============

@router.get("/favorites/foods")
async def list_food_favorites(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar alimentos favoritos del usuario.
    """
    result = await db.execute(
        select(FoodFavorite).where(FoodFavorite.user_id == current_user.id)
    )
    favorites = result.scalars().all()
    return [{"food_id": f.food_id} for f in favorites]


@router.post("/favorites/foods/{food_id}", status_code=status.HTTP_201_CREATED)
async def add_food_favorite(
    food_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Añadir alimento a favoritos.
    """
    # Check if already favorited
    existing = await db.execute(
        select(FoodFavorite).where(
            FoodFavorite.user_id == current_user.id,
            FoodFavorite.food_id == food_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El alimento ya está en favoritos"
        )
    
    favorite = FoodFavorite(
        workspace_id=current_user.workspace_id,
        user_id=current_user.id,
        food_id=food_id
    )
    db.add(favorite)
    await db.commit()
    return {"message": "Alimento añadido a favoritos"}


@router.delete("/favorites/foods/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_food_favorite(
    food_id: UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar alimento de favoritos.
    """
    result = await db.execute(
        select(FoodFavorite).where(
            FoodFavorite.user_id == current_user.id,
            FoodFavorite.food_id == food_id
        )
    )
    favorite = result.scalar_one_or_none()
    
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El alimento no está en favoritos"
        )
    
    await db.delete(favorite)
    await db.commit()
