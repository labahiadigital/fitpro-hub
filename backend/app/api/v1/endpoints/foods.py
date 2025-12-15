"""Food library endpoints."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.database import get_db
from app.middleware.auth import get_current_user, require_roles
from app.models.exercise import Food, FoodCategory
from app.models.user import User
from app.schemas.exercise import (
    FoodCreate, FoodUpdate, FoodResponse, FoodList,
    FoodCategoryCreate, FoodCategoryUpdate, FoodCategoryResponse, FoodCategoryList,
)

router = APIRouter()


# ==================== Food Categories ====================

@router.get("/categories/", response_model=FoodCategoryList)
async def list_food_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all food categories."""
    result = await db.execute(select(FoodCategory))
    categories = result.scalars().all()
    
    return FoodCategoryList(
        items=[FoodCategoryResponse.model_validate(c) for c in categories],
        total=len(categories),
    )


@router.post("/categories/", response_model=FoodCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_food_category(
    data: FoodCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Create a new food category."""
    category = FoodCategory(**data.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return FoodCategoryResponse.model_validate(category)


# ==================== Foods ====================

@router.get("/", response_model=FoodList)
async def list_foods(
    workspace_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    search: Optional[str] = None,
    allergens: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List foods (system + workspace-specific)."""
    query = select(Food).where(
        or_(
            Food.is_system == True,
            Food.is_public == True,
            Food.workspace_id == workspace_id,
        )
    )
    
    if category_id:
        query = query.where(Food.category_id == category_id)
    if search:
        query = query.where(
            or_(
                Food.name.ilike(f"%{search}%"),
                Food.brand.ilike(f"%{search}%"),
            )
        )
    if allergens:
        # Exclude foods with specified allergens
        allergen_list = allergens.split(",")
        for allergen in allergen_list:
            query = query.where(~Food.allergens.contains([allergen.strip()]))
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    foods = result.scalars().all()
    
    return FoodList(
        items=[FoodResponse.model_validate(f) for f in foods],
        total=total or 0,
        page=page,
        size=size,
    )


@router.post("/", response_model=FoodResponse, status_code=status.HTTP_201_CREATED)
async def create_food(
    data: FoodCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Create a new custom food."""
    food = Food(**data.model_dump())
    db.add(food)
    await db.commit()
    await db.refresh(food)
    return FoodResponse.model_validate(food)


@router.get("/{food_id}", response_model=FoodResponse)
async def get_food(
    food_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific food."""
    result = await db.execute(select(Food).where(Food.id == food_id))
    food = result.scalar_one_or_none()
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    return FoodResponse.model_validate(food)


@router.patch("/{food_id}", response_model=FoodResponse)
async def update_food(
    food_id: UUID,
    data: FoodUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Update a food."""
    result = await db.execute(select(Food).where(Food.id == food_id))
    food = result.scalar_one_or_none()
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    if food.is_system:
        raise HTTPException(status_code=403, detail="Cannot modify system foods")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(food, field, value)
    
    await db.commit()
    await db.refresh(food)
    return FoodResponse.model_validate(food)


@router.delete("/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_food(
    food_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner"])),
):
    """Delete a food."""
    result = await db.execute(select(Food).where(Food.id == food_id))
    food = result.scalar_one_or_none()
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    if food.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system foods")
    
    await db.delete(food)
    await db.commit()


@router.get("/{food_id}/nutrition", response_model=dict)
async def get_food_nutrition(
    food_id: UUID,
    serving_size: float = Query(100, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate nutrition for a specific serving size."""
    result = await db.execute(select(Food).where(Food.id == food_id))
    food = result.scalar_one_or_none()
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    # Calculate proportional values
    multiplier = serving_size / float(food.serving_size) if food.serving_size else 1
    
    return {
        "food_id": str(food.id),
        "name": food.name,
        "serving_size": serving_size,
        "serving_unit": food.serving_unit,
        "calories": float(food.calories or 0) * multiplier,
        "protein": float(food.protein or 0) * multiplier,
        "carbs": float(food.carbs or 0) * multiplier,
        "fat": float(food.fat or 0) * multiplier,
        "fiber": float(food.fiber or 0) * multiplier,
        "sugar": float(food.sugar or 0) * multiplier,
        "sodium": float(food.sodium or 0) * multiplier,
    }


# ==================== Allergens ====================

@router.get("/meta/allergens", response_model=List[str])
async def get_allergens():
    """Get list of common allergens."""
    return [
        "gluten", "dairy", "eggs", "fish", "shellfish", "tree_nuts",
        "peanuts", "soy", "sesame", "sulfites", "mustard", "celery",
        "lupin", "mollusks",
    ]

