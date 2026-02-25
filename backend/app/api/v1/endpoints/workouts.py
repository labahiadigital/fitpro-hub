from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel

from sqlalchemy import func

from app.core.database import get_db
from app.models.workout import WorkoutProgram, WorkoutLog
from app.models.exercise import Exercise, ExerciseAlternative
from app.middleware.auth import require_workspace, require_staff, CurrentUser

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
    thumbnail_url: Optional[str] = None
    image_url: Optional[str] = None


class ExerciseResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    muscle_groups: Optional[List[str]] = []
    equipment: Optional[List[str]] = []
    difficulty: Optional[str] = "intermediate"
    category: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    image_url: Optional[str] = None
    is_global: bool = False
    workspace_id: Optional[UUID] = None
    
    class Config:
        from_attributes = True


class WorkoutProgramCreate(BaseModel):
    name: str
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    duration_weeks: int = 4
    difficulty: str = "intermediate"
    template: dict = {"weeks": []}
    tags: List[str] = []
    is_template: bool = True


class WorkoutProgramUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    duration_weeks: Optional[int] = None
    difficulty: Optional[str] = None
    template: Optional[dict] = None
    tags: Optional[List[str]] = None
    is_template: Optional[bool] = None


class WorkoutProgramResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    client_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    duration_weeks: Optional[int] = 4
    difficulty: Optional[str] = "intermediate"
    template: Optional[dict] = None
    tags: Optional[List[str]] = []
    is_template: bool = True
    
    class Config:
        from_attributes = True


class WorkoutLogCreate(BaseModel):
    program_id: UUID
    client_id: UUID
    log: dict


class WorkoutLogResponse(BaseModel):
    id: UUID
    program_id: UUID
    client_id: UUID
    log: dict
    
    class Config:
        from_attributes = True


# ============ EXERCISES ============

@router.get("/exercises", response_model=List[ExerciseResponse])
async def list_exercises(
    search: Optional[str] = None,
    muscle_group: Optional[str] = None,
    muscle_groups: Optional[str] = None,
    equipment: Optional[str] = None,
    category: Optional[str] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar ejercicios (globales y del workspace).
    """
    query = select(Exercise).where(
        or_(
            Exercise.workspace_id == current_user.workspace_id,
            Exercise.is_global == True
        )
    )
    
    if search:
        query = query.where(Exercise.name.ilike(f"%{search}%"))
    
    if muscle_group:
        query = query.where(Exercise.muscle_groups.contains([muscle_group]))

    if muscle_groups:
        groups = [g.strip() for g in muscle_groups.split(",") if g.strip()]
        for group in groups:
            query = query.where(Exercise.muscle_groups.contains([group]))

    if equipment:
        query = query.where(Exercise.equipment.contains([equipment]))
    
    if category:
        query = query.where(Exercise.category == category)
    
    result = await db.execute(query.order_by(Exercise.name))
    return result.scalars().all()


@router.post("/exercises", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    data: ExerciseCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo ejercicio personalizado.
    """
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
        thumbnail_url=data.thumbnail_url,
        image_url=data.image_url,
        is_global=False
    )
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return exercise


@router.put("/exercises/{exercise_id}", response_model=ExerciseResponse)
async def update_exercise(
    exercise_id: UUID,
    data: ExerciseCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Update an exercise."""
    result = await db.execute(select(Exercise).where(Exercise.id == exercise_id))
    exercise = result.scalar_one_or_none()
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    if exercise.is_global:
        raise HTTPException(status_code=403, detail="No se pueden modificar datos del sistema")
    if exercise.workspace_id != current_user.workspace_id:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(exercise, field, value)

    await db.commit()
    await db.refresh(exercise)
    return exercise


@router.delete("/exercises/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(
    exercise_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Delete an exercise."""
    result = await db.execute(select(Exercise).where(Exercise.id == exercise_id))
    exercise = result.scalar_one_or_none()
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    if exercise.is_global:
        raise HTTPException(status_code=403, detail="No se pueden modificar datos del sistema")
    if exercise.workspace_id != current_user.workspace_id:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")

    await db.delete(exercise)
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


@router.get("/exercises/alternatives/counts")
async def get_alternatives_counts(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Get count of alternatives for each exercise."""
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


@router.get("/exercises/{exercise_id}/alternatives", response_model=List[AlternativeResponse])
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
                id=str(alt.id), exercise_id=str(alt.exercise_id),
                alternative_exercise_id=str(ex.id), alternative_name=ex.name,
                alternative_muscle_groups=ex.muscle_groups or [],
                alternative_equipment=ex.equipment or [],
                alternative_category=ex.category,
                notes=alt.notes, priority=alt.priority or 0,
            ))
    for alt, ex in rows_reverse:
        if str(ex.id) not in seen_ids:
            seen_ids.add(str(ex.id))
            alternatives.append(AlternativeResponse(
                id=str(alt.id), exercise_id=str(alt.exercise_id),
                alternative_exercise_id=str(ex.id), alternative_name=ex.name,
                alternative_muscle_groups=ex.muscle_groups or [],
                alternative_equipment=ex.equipment or [],
                alternative_category=ex.category,
                notes=alt.notes, priority=alt.priority or 0,
            ))
    return alternatives


@router.post("/exercises/{exercise_id}/alternatives", status_code=status.HTTP_201_CREATED)
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


@router.delete("/exercises/{exercise_id}/alternatives/{alternative_id}", status_code=status.HTTP_204_NO_CONTENT)
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


# ============ PROGRAMS ============

@router.get("/programs", response_model=List[WorkoutProgramResponse])
async def list_programs(
    is_template: Optional[bool] = None,
    client_id: Optional[UUID] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar programas de entrenamiento.
    """
    query = select(WorkoutProgram).where(
        WorkoutProgram.workspace_id == current_user.workspace_id
    )
    
    if is_template is not None:
        query = query.where(WorkoutProgram.is_template == is_template)
    
    if client_id:
        query = query.where(WorkoutProgram.client_id == client_id)
    
    result = await db.execute(query.order_by(WorkoutProgram.created_at.desc()))
    return result.scalars().all()


@router.post("/programs", response_model=WorkoutProgramResponse, status_code=status.HTTP_201_CREATED)
async def create_program(
    data: WorkoutProgramCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo programa de entrenamiento.
    """
    program = WorkoutProgram(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        client_id=data.client_id,
        name=data.name,
        description=data.description,
        duration_weeks=data.duration_weeks,
        difficulty=data.difficulty,
        template=data.template,
        tags=data.tags,
        is_template=data.is_template
    )
    db.add(program)
    await db.commit()
    await db.refresh(program)
    return program


@router.get("/programs/{program_id}", response_model=WorkoutProgramResponse)
async def get_program(
    program_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de un programa.
    """
    result = await db.execute(
        select(WorkoutProgram).where(
            WorkoutProgram.id == program_id,
            WorkoutProgram.workspace_id == current_user.workspace_id
        )
    )
    program = result.scalar_one_or_none()
    
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Programa no encontrado"
        )
    
    return program


@router.put("/programs/{program_id}", response_model=WorkoutProgramResponse)
async def update_program(
    program_id: UUID,
    data: WorkoutProgramUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar un programa (parcialmente).
    """
    result = await db.execute(
        select(WorkoutProgram).where(
            WorkoutProgram.id == program_id,
            WorkoutProgram.workspace_id == current_user.workspace_id
        )
    )
    program = result.scalar_one_or_none()
    
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Programa no encontrado"
        )
    
    # Only update fields that are provided (not None)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(program, field, value)
    
    await db.commit()
    await db.refresh(program)
    return program


@router.delete("/programs/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program(
    program_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un programa.
    """
    result = await db.execute(
        select(WorkoutProgram).where(
            WorkoutProgram.id == program_id,
            WorkoutProgram.workspace_id == current_user.workspace_id
        )
    )
    program = result.scalar_one_or_none()
    
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Programa no encontrado"
        )
    
    await db.delete(program)
    await db.commit()


# Schema for assign request
class AssignProgramRequest(BaseModel):
    client_id: UUID
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None


@router.post("/programs/{program_id}/assign", response_model=WorkoutProgramResponse, status_code=status.HTTP_201_CREATED)
async def assign_program_to_client(
    program_id: UUID,
    data: AssignProgramRequest,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Asignar un programa (template) a un cliente.
    Crea una copia del programa con el client_id asignado.
    """
    # Get the template program
    result = await db.execute(
        select(WorkoutProgram).where(
            WorkoutProgram.id == program_id,
            WorkoutProgram.workspace_id == current_user.workspace_id
        )
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Programa no encontrado"
        )
    
    # Create a copy assigned to the client
    assigned_program = WorkoutProgram(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        client_id=data.client_id,
        name=template.name,
        description=template.description,
        duration_weeks=template.duration_weeks,
        difficulty=template.difficulty,
        template=template.template,
        tags=template.tags,
        is_template=False  # This is an assigned instance, not a template
    )
    
    db.add(assigned_program)
    await db.commit()
    await db.refresh(assigned_program)
    return assigned_program


# ============ LOGS ============

@router.post("/logs", response_model=WorkoutLogResponse, status_code=status.HTTP_201_CREATED)
async def create_workout_log(
    data: WorkoutLogCreate,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Registrar un entrenamiento completado.
    """
    log = WorkoutLog(
        program_id=data.program_id,
        client_id=data.client_id,
        log=data.log
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


@router.get("/logs/{client_id}", response_model=List[WorkoutLogResponse])
async def get_client_logs(
    client_id: UUID,
    program_id: Optional[UUID] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener historial de entrenamientos de un cliente.
    """
    query = select(WorkoutLog).where(WorkoutLog.client_id == client_id)
    
    if program_id:
        query = query.where(WorkoutLog.program_id == program_id)
    
    result = await db.execute(query.order_by(WorkoutLog.created_at.desc()))
    return result.scalars().all()
