"""Exercise library endpoints - simplified to match actual DB schema."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel

from app.core.database import get_db
from app.middleware.auth import get_current_user, require_workspace, require_staff, CurrentUser
from app.models.exercise import Exercise, ExerciseFavorite
from app.models.user import User

router = APIRouter()


# ============ SCHEMAS ============

class ExerciseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    muscle_groups: List[str] = []
    equipment: List[str] = []
    difficulty: str = "intermediate"
    category: Optional[str] = None
    video_url: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


class ExerciseResponse(BaseModel):
    id: UUID
    workspace_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    muscle_groups: List[str] = []
    equipment: List[str] = []
    difficulty: Optional[str] = None
    category: Optional[str] = None
    video_url: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_global: bool = False
    
    class Config:
        from_attributes = True


class ExerciseListResponse(BaseModel):
    items: List[ExerciseResponse]
    total: int
    page: int
    page_size: int


# ============ EXERCISES ============

@router.get("/", response_model=ExerciseListResponse)
async def list_exercises(
    search: Optional[str] = None,
    category: Optional[str] = None,
    muscle_group: Optional[str] = None,
    difficulty: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """List exercises (global and workspace-specific)."""
    query = select(Exercise).where(
        or_(
            Exercise.workspace_id == current_user.workspace_id,
            Exercise.is_global == True
        )
    )
    
    if search:
        query = query.where(Exercise.name.ilike(f"%{search}%"))
    
    if category:
        query = query.where(Exercise.category == category)
    
    if muscle_group:
        query = query.where(Exercise.muscle_groups.any(muscle_group))
    
    if difficulty:
        query = query.where(Exercise.difficulty == difficulty)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(Exercise.name).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    exercises = result.scalars().all()
    
    return ExerciseListResponse(
        items=[ExerciseResponse.model_validate(e) for e in exercises],
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    data: ExerciseCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Create a new exercise."""
    exercise = Exercise(
        workspace_id=current_user.workspace_id,
        name=data.name,
        description=data.description,
        instructions=data.instructions,
        muscle_groups=data.muscle_groups,
        equipment=data.equipment,
        difficulty=data.difficulty,
        category=data.category,
        video_url=data.video_url,
        image_url=data.image_url,
        thumbnail_url=data.thumbnail_url,
        is_global=False
    )
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return exercise


@router.get("/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise(
    exercise_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get exercise by ID."""
    result = await db.execute(
        select(Exercise).where(
            Exercise.id == exercise_id,
            or_(
                Exercise.workspace_id == current_user.workspace_id,
                Exercise.is_global == True
            )
        )
    )
    exercise = result.scalar_one_or_none()
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    
    return exercise


@router.put("/{exercise_id}", response_model=ExerciseResponse)
async def update_exercise(
    exercise_id: UUID,
    data: ExerciseCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Update an exercise."""
    result = await db.execute(
        select(Exercise).where(
            Exercise.id == exercise_id,
            Exercise.workspace_id == current_user.workspace_id
        )
    )
    exercise = result.scalar_one_or_none()
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(exercise, field, value)
    
    await db.commit()
    await db.refresh(exercise)
    return exercise


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(
    exercise_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Delete an exercise."""
    result = await db.execute(
        select(Exercise).where(
            Exercise.id == exercise_id,
            Exercise.workspace_id == current_user.workspace_id
        )
    )
    exercise = result.scalar_one_or_none()
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    
    await db.delete(exercise)
    await db.commit()


# ============ EXERCISE FAVORITES ============

class ExerciseFavoriteResponse(BaseModel):
    exercise_id: UUID
    
    class Config:
        from_attributes = True


@router.get("/favorites/list", response_model=List[ExerciseFavoriteResponse])
async def list_exercise_favorites(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """List user's favorite exercises."""
    result = await db.execute(
        select(ExerciseFavorite).where(ExerciseFavorite.user_id == current_user.id)
    )
    favorites = result.scalars().all()
    return favorites


@router.post("/favorites/{exercise_id}", status_code=status.HTTP_201_CREATED)
async def add_exercise_favorite(
    exercise_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Add exercise to favorites."""
    # Check if already favorited
    result = await db.execute(
        select(ExerciseFavorite).where(
            ExerciseFavorite.user_id == current_user.id,
            ExerciseFavorite.exercise_id == exercise_id
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        return {"message": "Already in favorites"}
    
    favorite = ExerciseFavorite(
        user_id=current_user.id,
        exercise_id=exercise_id
    )
    db.add(favorite)
    await db.commit()
    return {"message": "Added to favorites"}


@router.delete("/favorites/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_exercise_favorite(
    exercise_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Remove exercise from favorites."""
    result = await db.execute(
        select(ExerciseFavorite).where(
            ExerciseFavorite.user_id == current_user.id,
            ExerciseFavorite.exercise_id == exercise_id
        )
    )
    favorite = result.scalar_one_or_none()
    
    if favorite:
        await db.delete(favorite)
        await db.commit()
