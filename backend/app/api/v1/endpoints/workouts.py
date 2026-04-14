import copy
from datetime import date, datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, String, update
from pydantic import BaseModel

from app.core.database import get_db
from app.core.storage import resolve_url
from app.models.workout import WorkoutProgram, WorkoutLog
from app.models.exercise import Exercise, ExerciseAlternative
from app.models.client import Client
from app.middleware.auth import require_workspace, require_staff, CurrentUser
from app.api.v1.endpoints.tasks import create_auto_task

router = APIRouter()


# ============ SCHEMAS ============

class ExerciseCreate(BaseModel):
    name: str
    alias: Optional[str] = None
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
    alias: Optional[str] = None
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
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    review_interval_days: Optional[int] = None


class WorkoutProgramUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    duration_weeks: Optional[int] = None
    difficulty: Optional[str] = None
    template: Optional[dict] = None
    tags: Optional[List[str]] = None
    is_template: Optional[bool] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    review_interval_days: Optional[int] = None


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
    is_active: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    review_interval_days: Optional[int] = None
    next_review_date: Optional[date] = None

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
            Exercise.is_global.is_(True)
        )
    )
    
    if search:
        search_pattern = f"%{search}%"
        alias_filter = Exercise.alias.isnot(None) & Exercise.alias.ilike(search_pattern)
        query = query.where(
            or_(
                Exercise.name.ilike(search_pattern),
                alias_filter,
                Exercise.muscle_groups.cast(String).ilike(search_pattern),
            )
        )
    
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
    exercises = result.scalars().all()

    items = []
    for e in exercises:
        resp = ExerciseResponse.model_validate(e)
        resp.image_url = await resolve_url(resp.image_url)
        resp.thumbnail_url = await resolve_url(resp.thumbnail_url)
        items.append(resp)
    return items


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
        alias=data.alias,
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
        select(ExerciseAlternative).where(
            ExerciseAlternative.id == alternative_id,
            ExerciseAlternative.exercise_id == exercise_id,
            ExerciseAlternative.workspace_id == current_user.workspace_id,
        )
    )
    alt = result.scalar_one_or_none()
    if not alt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alternativa no encontrada")
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
    programs = result.scalars().all()

    today = date.today()
    dirty = False
    for p in programs:
        if p.is_active and p.end_date and p.end_date < today:
            p.is_active = False
            dirty = True
    if dirty:
        await db.commit()

    return programs


@router.post("/programs", response_model=WorkoutProgramResponse, status_code=status.HTTP_201_CREATED)
async def create_program(
    data: WorkoutProgramCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo programa de entrenamiento.
    """



    should_activate = data.client_id is not None and not data.is_template

    if should_activate:
        await db.execute(
            update(WorkoutProgram)
            .where(
                WorkoutProgram.client_id == data.client_id,
                WorkoutProgram.workspace_id == current_user.workspace_id,
            )
            .values(is_active=False)
        )

    parsed_start = None
    parsed_end = None
    if data.start_date:
        try:
            parsed_start = date.fromisoformat(data.start_date)
        except (ValueError, TypeError):
            pass
    if data.end_date:
        try:
            parsed_end = date.fromisoformat(data.end_date)
        except (ValueError, TypeError):
            pass

    review_interval = data.review_interval_days
    next_review = None
    if review_interval and review_interval > 0 and parsed_start:
        next_review = parsed_start + timedelta(days=review_interval)

    program = WorkoutProgram(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        client_id=data.client_id,
        name=data.name,
        description=data.description,
        duration_weeks=data.duration_weeks,
        difficulty=data.difficulty,
        template=data.template,
        executed_template=copy.deepcopy(data.template) if should_activate else None,
        tags=data.tags,
        is_template=data.is_template,
        is_active=should_activate,
        start_date=parsed_start,
        end_date=parsed_end,
        review_interval_days=review_interval,
        next_review_date=next_review,
    )
    db.add(program)
    await db.flush()

    if parsed_end and data.client_id:
        await create_auto_task(
            db=db,
            workspace_id=current_user.workspace_id,
            created_by=current_user.id,
            title=f"Fin de programa: {data.name}",
            due_date=datetime.combine(parsed_end, datetime.min.time()),
            source="auto",
            source_ref=f"workout_program_end:{program.id}",
            client_id=data.client_id,
            description=f"El programa de entrenamiento '{data.name}' finaliza en esta fecha.",
            notification_link="/workouts",
        )

    if next_review and data.client_id:
        await create_auto_task(
            db=db,
            workspace_id=current_user.workspace_id,
            created_by=current_user.id,
            title=f"Revisión programa: {data.name}",
            due_date=datetime.combine(next_review, datetime.min.time()),
            source="auto",
            source_ref=f"workout_program_review:{program.id}",
            client_id=data.client_id,
            description=f"Revisar progreso del programa '{data.name}'. Intervalo: cada {review_interval} días.",
            notification_link="/workouts",
        )

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
    


    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None:
            continue
        if field in ("start_date", "end_date"):
            try:
                setattr(program, field, date.fromisoformat(value) if value else None)
            except (ValueError, TypeError):
                pass
        else:
            setattr(program, field, value)

    if data.template is not None and program.client_id and not program.is_template:
        program.executed_template = copy.deepcopy(data.template)

    if data.review_interval_days is not None and program.start_date:
        if data.review_interval_days > 0:
            program.next_review_date = program.start_date + timedelta(days=data.review_interval_days)
            if program.client_id:
                await create_auto_task(
                    db=db,
                    workspace_id=current_user.workspace_id,
                    created_by=current_user.id,
                    title=f"Revisión programa: {program.name}",
                    due_date=datetime.combine(program.next_review_date, datetime.min.time()),
                    source="auto",
                    source_ref=f"workout_program_review:{program.id}",
                    client_id=program.client_id,
                    description=f"Revisar progreso del programa '{program.name}'. Intervalo: cada {data.review_interval_days} días.",
                    notification_link="/workouts",
                )
        else:
            program.next_review_date = None

    if program.end_date and program.client_id:
        await create_auto_task(
            db=db,
            workspace_id=current_user.workspace_id,
            created_by=current_user.id,
            title=f"Fin de programa: {program.name}",
            due_date=datetime.combine(program.end_date, datetime.min.time()),
            source="auto",
            source_ref=f"workout_program_end:{program.id}",
            client_id=program.client_id,
            description=f"El programa de entrenamiento '{program.name}' finaliza en esta fecha.",
            notification_link="/workouts",
        )

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


@router.post("/programs/{program_id}/activate", response_model=WorkoutProgramResponse)
async def activate_program(
    program_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Mark a program as active and deactivate all other programs for the same client."""
    result = await db.execute(
        select(WorkoutProgram).where(
            WorkoutProgram.id == program_id,
            WorkoutProgram.workspace_id == current_user.workspace_id
        )
    )
    program = result.scalar_one_or_none()
    if not program:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    if not program.client_id:
        raise HTTPException(status_code=400, detail="Solo se pueden activar programas asignados a un cliente")

    await db.execute(
        update(WorkoutProgram)
        .where(
            WorkoutProgram.client_id == program.client_id,
            WorkoutProgram.workspace_id == current_user.workspace_id,
        )
        .values(is_active=False)
    )

    program.is_active = True
    await db.commit()
    await db.refresh(program)
    return program


@router.post("/programs/{program_id}/deactivate", response_model=WorkoutProgramResponse)
async def deactivate_program(
    program_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Mark a program as inactive."""
    result = await db.execute(
        select(WorkoutProgram).where(
            WorkoutProgram.id == program_id,
            WorkoutProgram.workspace_id == current_user.workspace_id
        )
    )
    program = result.scalar_one_or_none()
    if not program:
        raise HTTPException(status_code=404, detail="Programa no encontrado")

    program.is_active = False
    await db.commit()
    await db.refresh(program)
    return program


# Schema for assign request
class AssignProgramRequest(BaseModel):
    client_id: UUID
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
    review_interval_days: Optional[int] = None


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

    client_result = await db.execute(
        select(Client).where(
            Client.id == data.client_id,
            Client.workspace_id == current_user.workspace_id,
        )
    )
    if not client_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado en este workspace"
        )


    parsed_start = None
    parsed_end = None
    if data.start_date:
        try:
            parsed_start = date.fromisoformat(data.start_date)
        except (ValueError, TypeError):
            pass
    if data.end_date:
        try:
            parsed_end = date.fromisoformat(data.end_date)
        except (ValueError, TypeError):
            pass



    await db.execute(
        update(WorkoutProgram)
        .where(
            WorkoutProgram.client_id == data.client_id,
            WorkoutProgram.workspace_id == current_user.workspace_id,
        )
        .values(is_active=False)
    )

    review_interval = data.review_interval_days
    next_review = None
    if review_interval and review_interval > 0 and parsed_start:
        next_review = parsed_start + timedelta(days=review_interval)

    assigned_program = WorkoutProgram(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        client_id=data.client_id,
        name=template.name,
        description=template.description,
        duration_weeks=template.duration_weeks,
        difficulty=template.difficulty,
        template=template.template,
        executed_template=copy.deepcopy(template.template),
        tags=template.tags,
        is_template=False,
        is_active=True,
        start_date=parsed_start,
        end_date=parsed_end,
        review_interval_days=review_interval,
        next_review_date=next_review,
    )

    db.add(assigned_program)
    await db.flush()

    if parsed_end:
        await create_auto_task(
            db=db,
            workspace_id=current_user.workspace_id,
            created_by=current_user.id,
            title=f"Fin de programa: {template.name}",
            due_date=datetime.combine(parsed_end, datetime.min.time()),
            source="auto",
            source_ref=f"workout_program_end:{assigned_program.id}",
            client_id=data.client_id,
            description=f"El programa de entrenamiento '{template.name}' finaliza en esta fecha.",
            notification_link="/workouts",
        )

    if next_review:
        await create_auto_task(
            db=db,
            workspace_id=current_user.workspace_id,
            created_by=current_user.id,
            title=f"Revisión programa: {template.name}",
            due_date=datetime.combine(next_review, datetime.min.time()),
            source="auto",
            source_ref=f"workout_program_review:{assigned_program.id}",
            client_id=data.client_id,
            description=f"Revisar progreso del programa '{template.name}'. Intervalo: cada {review_interval} días.",
            notification_link="/workouts",
        )

    client_user_result = await db.execute(
        select(Client.user_id).where(Client.id == data.client_id)
    )
    client_user_id = client_user_result.scalar_one_or_none()
    if client_user_id:
        from app.services.notification_service import notify
        await notify(
            db=db,
            event="program_assigned",
            user_id=client_user_id,
            workspace_id=current_user.workspace_id,
            title="Nuevo programa de entrenamiento asignado",
            body=f"Se te ha asignado el programa '{template.name}'.",
            notification_type="info",
            link="/my-workouts",
        )

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
    client_check = await db.execute(
        select(Client.id).where(
            Client.id == data.client_id,
            Client.workspace_id == current_user.workspace_id,
        )
    )
    if not client_check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")

    if data.program_id:
        program_check = await db.execute(
            select(WorkoutProgram.id).where(
                WorkoutProgram.id == data.program_id,
                WorkoutProgram.workspace_id == current_user.workspace_id,
            )
        )
        if not program_check.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programa no encontrado")

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
    client_check = await db.execute(
        select(Client.id).where(
            Client.id == client_id,
            Client.workspace_id == current_user.workspace_id,
        )
    )
    if not client_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    query = select(WorkoutLog).where(WorkoutLog.client_id == client_id)
    
    if program_id:
        query = query.where(WorkoutLog.program_id == program_id)
    
    result = await db.execute(query.order_by(WorkoutLog.created_at.desc()))
    return result.scalars().all()


# ============ AUTO-ACTIVATION ============

@router.post("/auto-activate")
async def auto_activate_programs(
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Auto-activate/deactivate programs based on start_date and end_date."""
    today = date.today()

    expired = await db.execute(
        update(WorkoutProgram)
        .where(
            WorkoutProgram.workspace_id == current_user.workspace_id,
            WorkoutProgram.is_active.is_(True),
            WorkoutProgram.end_date.isnot(None),
            WorkoutProgram.end_date < today,
        )
        .values(is_active=False)
    )
    deactivated_count = expired.rowcount

    pending = await db.execute(
        select(WorkoutProgram).where(
            WorkoutProgram.workspace_id == current_user.workspace_id,
            WorkoutProgram.is_active.is_(False),
            WorkoutProgram.client_id.isnot(None),
            WorkoutProgram.is_template.is_(False),
            WorkoutProgram.start_date.isnot(None),
            WorkoutProgram.start_date <= today,
            or_(WorkoutProgram.end_date.is_(None), WorkoutProgram.end_date >= today),
        )
    )
    to_activate = pending.scalars().all()

    activated_count = 0
    for program in to_activate:
        has_active = await db.scalar(
            select(func.count()).select_from(WorkoutProgram).where(
                WorkoutProgram.client_id == program.client_id,
                WorkoutProgram.is_active.is_(True),
            )
        )
        if not has_active:
            program.is_active = True
            activated_count += 1

    await db.commit()
    return {"activated": activated_count, "deactivated": deactivated_count}
