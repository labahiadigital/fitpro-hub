"""Exercise library endpoints - simplified to match actual DB schema."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel

from app.core.database import get_db
from app.middleware.auth import get_current_user, require_workspace, require_staff, CurrentUser
from app.models.exercise import Exercise, ExerciseAlternative, ExerciseFavorite
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
    muscle_groups: Optional[str] = None,
    equipment: Optional[str] = None,
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
        query = query.where(
            func.unaccent(Exercise.name).ilike(func.unaccent(f"%{search}%"))
        )
    
    if category:
        query = query.where(Exercise.category == category)
    
    if muscle_group:
        query = query.where(Exercise.muscle_groups.any(muscle_group))

    if muscle_groups:
        groups = [g.strip() for g in muscle_groups.split(",") if g.strip()]
        for group in groups:
            query = query.where(Exercise.muscle_groups.any(group))

    if equipment:
        query = query.where(Exercise.equipment.any(equipment))
    
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


@router.post("/seed", status_code=status.HTTP_201_CREATED)
async def seed_exercises(
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Seed the exercise database with common exercises (only if empty)."""
    from app.seeds.exercises import SEED_EXERCISES

    # Check if exercises already exist for this workspace
    result = await db.execute(
        select(func.count()).select_from(Exercise).where(
            or_(
                Exercise.workspace_id == current_user.workspace_id,
                Exercise.is_global == True
            )
        )
    )
    existing_count = result.scalar() or 0

    if existing_count > 10:
        return {"message": f"Already have {existing_count} exercises, skipping seed", "created": 0}

    created = 0
    for ex_data in SEED_EXERCISES:
        exercise = Exercise(
            workspace_id=current_user.workspace_id,
            name=ex_data["name"],
            muscle_groups=ex_data["muscle_groups"],
            equipment=ex_data["equipment"],
            category=ex_data.get("category", "fuerza"),
            difficulty=ex_data.get("difficulty", "intermediate"),
            is_global=False
        )
        db.add(exercise)
        created += 1

    await db.commit()
    return {"message": f"Seeded {created} exercises", "created": created}


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
        workspace_id=current_user.workspace_id,
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


# ============ EXERCISE ALTERNATIVES ============

class AlternativeCreate(BaseModel):
    alternative_exercise_id: str
    notes: Optional[str] = None
    priority: int = 0


class AlternativeResponse(BaseModel):
    id: str
    exercise_id: str
    alternative_exercise_id: str
    alternative_name: str
    alternative_muscle_groups: List[str] = []
    alternative_equipment: List[str] = []
    alternative_category: Optional[str] = None
    notes: Optional[str] = None
    priority: int = 0

    class Config:
        from_attributes = True


@router.get("/alternatives/counts")
async def get_alternatives_counts(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get count of alternatives for each exercise that has any (for UI indicators)."""
    # Forward
    fwd = await db.execute(
        select(
            ExerciseAlternative.exercise_id,
            func.count(ExerciseAlternative.id).label("cnt")
        ).group_by(ExerciseAlternative.exercise_id)
    )
    counts: dict = {}
    for row in fwd:
        eid = str(row.exercise_id)
        counts[eid] = counts.get(eid, 0) + row.cnt
    # Reverse
    rev = await db.execute(
        select(
            ExerciseAlternative.alternative_exercise_id,
            func.count(ExerciseAlternative.id).label("cnt")
        ).group_by(ExerciseAlternative.alternative_exercise_id)
    )
    for row in rev:
        eid = str(row.alternative_exercise_id)
        counts[eid] = counts.get(eid, 0) + row.cnt
    return counts


@router.get("/{exercise_id}/alternatives", response_model=List[AlternativeResponse])
async def list_exercise_alternatives(
    exercise_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """List predefined alternatives for an exercise (bidirectional)."""
    result = await db.execute(
        select(ExerciseAlternative, Exercise)
        .join(Exercise, Exercise.id == ExerciseAlternative.alternative_exercise_id)
        .where(ExerciseAlternative.exercise_id == exercise_id)
        .order_by(ExerciseAlternative.priority)
    )
    rows = result.all()

    # Also get reverse direction
    result_reverse = await db.execute(
        select(ExerciseAlternative, Exercise)
        .join(Exercise, Exercise.id == ExerciseAlternative.exercise_id)
        .where(ExerciseAlternative.alternative_exercise_id == exercise_id)
        .order_by(ExerciseAlternative.priority)
    )
    rows_reverse = result_reverse.all()

    alternatives = []
    seen_ids = set()
    for alt, ex in rows:
        if str(ex.id) not in seen_ids:
            seen_ids.add(str(ex.id))
            alternatives.append(AlternativeResponse(
                id=str(alt.id),
                exercise_id=str(alt.exercise_id),
                alternative_exercise_id=str(ex.id),
                alternative_name=ex.name,
                alternative_muscle_groups=ex.muscle_groups or [],
                alternative_equipment=ex.equipment or [],
                alternative_category=ex.category,
                notes=alt.notes,
                priority=alt.priority or 0,
            ))
    for alt, ex in rows_reverse:
        if str(ex.id) not in seen_ids:
            seen_ids.add(str(ex.id))
            alternatives.append(AlternativeResponse(
                id=str(alt.id),
                exercise_id=str(alt.exercise_id),
                alternative_exercise_id=str(ex.id),
                alternative_name=ex.name,
                alternative_muscle_groups=ex.muscle_groups or [],
                alternative_equipment=ex.equipment or [],
                alternative_category=ex.category,
                notes=alt.notes,
                priority=alt.priority or 0,
            ))
    return alternatives


@router.post("/{exercise_id}/alternatives", status_code=status.HTTP_201_CREATED)
async def add_exercise_alternative(
    exercise_id: UUID,
    data: AlternativeCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Add a predefined alternative for an exercise."""
    alt_id = UUID(data.alternative_exercise_id)
    if exercise_id == alt_id:
        raise HTTPException(400, "An exercise cannot be its own alternative")

    # Check if already exists (either direction)
    result = await db.execute(
        select(ExerciseAlternative).where(
            or_(
                (ExerciseAlternative.exercise_id == exercise_id) & (ExerciseAlternative.alternative_exercise_id == alt_id),
                (ExerciseAlternative.exercise_id == alt_id) & (ExerciseAlternative.alternative_exercise_id == exercise_id),
            )
        )
    )
    if result.scalar_one_or_none():
        return {"message": "Alternative already exists"}

    alternative = ExerciseAlternative(
        exercise_id=exercise_id,
        alternative_exercise_id=alt_id,
        workspace_id=current_user.workspace_id,
        notes=data.notes,
        priority=data.priority,
    )
    db.add(alternative)
    await db.commit()
    return {"message": "Alternative added"}


@router.delete("/{exercise_id}/alternatives/{alternative_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_exercise_alternative(
    exercise_id: UUID,
    alternative_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Remove an exercise alternative."""
    result = await db.execute(
        select(ExerciseAlternative).where(ExerciseAlternative.id == alternative_id)
    )
    alt = result.scalar_one_or_none()
    if alt:
        await db.delete(alt)
        await db.commit()
