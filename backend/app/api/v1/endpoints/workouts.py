from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel

from app.core.database import get_db
from app.models.workout import WorkoutProgram, WorkoutLog
from app.models.exercise import Exercise
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
