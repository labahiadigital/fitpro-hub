"""Exercise library endpoints."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.database import get_db
from app.middleware.auth import get_current_user, require_roles
from app.models.exercise import Exercise, ExerciseCategory
from app.models.user import User
from app.schemas.exercise import (
    ExerciseCreate, ExerciseUpdate, ExerciseResponse, ExerciseList,
    ExerciseCategoryCreate, ExerciseCategoryUpdate, ExerciseCategoryResponse, ExerciseCategoryList,
)

router = APIRouter()


# ==================== Exercise Categories ====================

@router.get("/categories/", response_model=ExerciseCategoryList)
async def list_exercise_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all exercise categories."""
    result = await db.execute(select(ExerciseCategory))
    categories = result.scalars().all()
    
    return ExerciseCategoryList(
        items=[ExerciseCategoryResponse.model_validate(c) for c in categories],
        total=len(categories),
    )


@router.post("/categories/", response_model=ExerciseCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise_category(
    data: ExerciseCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Create a new exercise category."""
    category = ExerciseCategory(**data.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return ExerciseCategoryResponse.model_validate(category)


# ==================== Exercises ====================

@router.get("/", response_model=ExerciseList)
async def list_exercises(
    workspace_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    muscle_group: Optional[str] = None,
    equipment: Optional[str] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List exercises (system + workspace-specific)."""
    # Include system exercises and workspace-specific ones
    query = select(Exercise).where(
        or_(
            Exercise.is_system == True,
            Exercise.is_public == True,
            Exercise.workspace_id == workspace_id,
        )
    )
    
    if category_id:
        query = query.where(Exercise.category_id == category_id)
    if muscle_group:
        query = query.where(Exercise.muscle_groups.contains([muscle_group]))
    if equipment:
        query = query.where(Exercise.equipment.contains([equipment]))
    if difficulty:
        query = query.where(Exercise.difficulty == difficulty)
    if search:
        query = query.where(
            or_(
                Exercise.name.ilike(f"%{search}%"),
                Exercise.description.ilike(f"%{search}%"),
            )
        )
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    exercises = result.scalars().all()
    
    return ExerciseList(
        items=[ExerciseResponse.model_validate(e) for e in exercises],
        total=total or 0,
        page=page,
        size=size,
    )


@router.post("/", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    data: ExerciseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Create a new custom exercise."""
    exercise = Exercise(**data.model_dump())
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return ExerciseResponse.model_validate(exercise)


@router.get("/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise(
    exercise_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific exercise."""
    result = await db.execute(select(Exercise).where(Exercise.id == exercise_id))
    exercise = result.scalar_one_or_none()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    return ExerciseResponse.model_validate(exercise)


@router.patch("/{exercise_id}", response_model=ExerciseResponse)
async def update_exercise(
    exercise_id: UUID,
    data: ExerciseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner", "collaborator"])),
):
    """Update an exercise."""
    result = await db.execute(select(Exercise).where(Exercise.id == exercise_id))
    exercise = result.scalar_one_or_none()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    if exercise.is_system:
        raise HTTPException(status_code=403, detail="Cannot modify system exercises")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(exercise, field, value)
    
    await db.commit()
    await db.refresh(exercise)
    return ExerciseResponse.model_validate(exercise)


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(
    exercise_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["owner"])),
):
    """Delete an exercise."""
    result = await db.execute(select(Exercise).where(Exercise.id == exercise_id))
    exercise = result.scalar_one_or_none()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    if exercise.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system exercises")
    
    await db.delete(exercise)
    await db.commit()


# ==================== Muscle Groups & Equipment ====================

@router.get("/meta/muscle-groups", response_model=List[str])
async def get_muscle_groups():
    """Get list of available muscle groups."""
    return [
        "chest", "back", "shoulders", "biceps", "triceps", "forearms",
        "abs", "obliques", "lower_back", "glutes", "quadriceps",
        "hamstrings", "calves", "hip_flexors", "full_body",
    ]


@router.get("/meta/equipment", response_model=List[str])
async def get_equipment():
    """Get list of available equipment types."""
    return [
        "bodyweight", "barbell", "dumbbell", "kettlebell", "cable",
        "machine", "resistance_band", "medicine_ball", "pull_up_bar",
        "bench", "box", "trx", "foam_roller", "yoga_mat", "none",
    ]

