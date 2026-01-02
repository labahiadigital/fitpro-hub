"""
Endpoints de la API para Clases Online en Vivo
"""

from datetime import datetime, timedelta
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.middleware.auth import require_workspace
from app.models.live_classes import (
    ClientClassPackage,
    LiveClass,
    LiveClassPackage,
    LiveClassRegistration,
    LiveClassTemplate,
    MeetingLog,
    VideoIntegration,
)

router = APIRouter()


# =====================================================
# SCHEMAS
# =====================================================

class VideoIntegrationBase(BaseModel):
    provider: str = "zoom"
    zoom_account_id: Optional[str] = None
    zoom_client_id: Optional[str] = None
    zoom_client_secret: Optional[str] = None
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    teams_tenant_id: Optional[str] = None
    teams_client_id: Optional[str] = None
    custom_meeting_url_template: Optional[str] = None


class VideoIntegrationResponse(VideoIntegrationBase):
    id: UUID
    workspace_id: UUID
    is_active: bool
    last_sync_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LiveClassBase(BaseModel):
    title: str
    description: Optional[str] = None
    class_type: str = "group"
    category: str = "fitness"
    scheduled_start: datetime
    scheduled_end: datetime
    duration_minutes: int = 60
    timezone: str = "Europe/Madrid"
    max_participants: int = 20
    is_free: bool = False
    price: float = 0
    currency: str = "EUR"
    required_equipment: List[str] = []
    difficulty_level: str = "all"
    is_recorded: bool = True
    is_recurring: bool = False
    recurrence_rule: Optional[dict] = None
    thumbnail_url: Optional[str] = None
    notes: Optional[str] = None


class LiveClassCreate(LiveClassBase):
    instructor_id: Optional[UUID] = None
    template_id: Optional[UUID] = None


class LiveClassUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    max_participants: Optional[int] = None
    is_free: Optional[bool] = None
    price: Optional[float] = None
    status: Optional[str] = None
    meeting_url: Optional[str] = None
    meeting_id: Optional[str] = None
    meeting_password: Optional[str] = None
    recording_url: Optional[str] = None
    notes: Optional[str] = None


class LiveClassResponse(LiveClassBase):
    id: UUID
    workspace_id: UUID
    instructor_id: Optional[UUID] = None
    current_participants: int
    meeting_provider: str
    meeting_id: Optional[str] = None
    meeting_url: Optional[str] = None
    host_url: Optional[str] = None
    recording_url: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class RegistrationCreate(BaseModel):
    class_id: UUID
    client_id: Optional[UUID] = None


class RegistrationResponse(BaseModel):
    id: UUID
    class_id: UUID
    user_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    status: str
    joined_at: Optional[datetime] = None
    left_at: Optional[datetime] = None
    attendance_duration_minutes: int
    rating: Optional[int] = None
    feedback: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    class_type: str = "group"
    category: str = "fitness"
    duration_minutes: int = 60
    max_participants: int = 20
    is_free: bool = False
    default_price: float = 0
    required_equipment: List[str] = []
    difficulty_level: str = "all"
    thumbnail_url: Optional[str] = None


class TemplateResponse(TemplateBase):
    id: UUID
    workspace_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PackageBase(BaseModel):
    name: str
    description: Optional[str] = None
    total_classes: int
    price: float
    currency: str = "EUR"
    validity_days: int = 30
    applicable_categories: List[str] = []
    applicable_class_types: List[str] = []


class PackageResponse(PackageBase):
    id: UUID
    workspace_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ClassSchedule(BaseModel):
    date: str
    classes: List[LiveClassResponse]


class ClassStats(BaseModel):
    total_classes: int
    upcoming_classes: int
    completed_classes: int
    total_participants: int
    average_attendance: float
    total_revenue: float


# =====================================================
# INTEGRACIÓN DE VIDEO
# =====================================================

@router.get("/integration", response_model=Optional[VideoIntegrationResponse])
async def get_video_integration(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Obtener configuración de integración de video"""
    result = await db.execute(
        select(VideoIntegration).where(VideoIntegration.workspace_id == current_user.workspace_id)
    )
    return result.scalar_one_or_none()


@router.post("/integration", response_model=VideoIntegrationResponse, status_code=status.HTTP_201_CREATED)
async def configure_video_integration(
    integration_data: VideoIntegrationBase,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Configurar integración de video"""
    result = await db.execute(
        select(VideoIntegration).where(VideoIntegration.workspace_id == current_user.workspace_id)
    )
    integration = result.scalar_one_or_none()

    if integration:
        for field, value in integration_data.model_dump().items():
            if value is not None:
                setattr(integration, field, value)
    else:
        integration = VideoIntegration(
            workspace_id=current_user.workspace_id,
            **integration_data.model_dump()
        )
        db.add(integration)

    await db.commit()
    await db.refresh(integration)
    return integration


# =====================================================
# CLASES EN VIVO
# =====================================================

@router.get("/classes", response_model=List[LiveClassResponse])
async def list_classes(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    upcoming_only: bool = Query(False),
):
    """Listar clases en vivo"""
    query = select(LiveClass).where(LiveClass.workspace_id == current_user.workspace_id)

    if status:
        query = query.where(LiveClass.status == status)
    if category:
        query = query.where(LiveClass.category == category)
    if from_date:
        query = query.where(LiveClass.scheduled_start >= from_date)
    if to_date:
        query = query.where(LiveClass.scheduled_start <= to_date)
    if upcoming_only:
        query = query.where(LiveClass.scheduled_start >= datetime.utcnow())
        query = query.where(LiveClass.status.in_(["scheduled", "live"]))

    query = query.order_by(LiveClass.scheduled_start)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/classes", response_model=LiveClassResponse, status_code=status.HTTP_201_CREATED)
async def create_class(
    class_data: LiveClassCreate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Crear una nueva clase en vivo"""
    # Si se proporciona una plantilla, usar sus valores
    if class_data.template_id:
        template_result = await db.execute(
            select(LiveClassTemplate).where(LiveClassTemplate.id == class_data.template_id)
        )
        template = template_result.scalar_one_or_none()
        if template:
            class_data.class_type = template.class_type
            class_data.category = template.category
            class_data.duration_minutes = template.duration_minutes
            class_data.max_participants = template.max_participants
            class_data.is_free = template.is_free
            class_data.price = float(template.default_price)
            class_data.required_equipment = template.required_equipment
            class_data.difficulty_level = template.difficulty_level
            class_data.thumbnail_url = template.thumbnail_url

    live_class = LiveClass(
        workspace_id=current_user.workspace_id,
        instructor_id=class_data.instructor_id or current_user.id,
        title=class_data.title,
        description=class_data.description,
        class_type=class_data.class_type,
        category=class_data.category,
        scheduled_start=class_data.scheduled_start,
        scheduled_end=class_data.scheduled_end,
        duration_minutes=class_data.duration_minutes,
        timezone=class_data.timezone,
        max_participants=class_data.max_participants,
        is_free=class_data.is_free,
        price=class_data.price,
        currency=class_data.currency,
        required_equipment=class_data.required_equipment,
        difficulty_level=class_data.difficulty_level,
        is_recorded=class_data.is_recorded,
        is_recurring=class_data.is_recurring,
        recurrence_rule=class_data.recurrence_rule,
        thumbnail_url=class_data.thumbnail_url,
        notes=class_data.notes,
    )
    db.add(live_class)
    await db.commit()
    await db.refresh(live_class)
    return live_class


@router.get("/classes/{class_id}", response_model=LiveClassResponse)
async def get_class(
    class_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Obtener una clase por ID"""
    result = await db.execute(
        select(LiveClass)
        .where(LiveClass.id == class_id)
        .where(LiveClass.workspace_id == current_user.workspace_id)
    )
    live_class = result.scalar_one_or_none()

    if not live_class:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    return live_class


@router.put("/classes/{class_id}", response_model=LiveClassResponse)
async def update_class(
    class_id: UUID,
    class_data: LiveClassUpdate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Actualizar una clase"""
    result = await db.execute(
        select(LiveClass)
        .where(LiveClass.id == class_id)
        .where(LiveClass.workspace_id == current_user.workspace_id)
    )
    live_class = result.scalar_one_or_none()

    if not live_class:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    update_data = class_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(live_class, field, value)

    await db.commit()
    await db.refresh(live_class)
    return live_class


@router.delete("/classes/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(
    class_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Eliminar una clase"""
    result = await db.execute(
        select(LiveClass)
        .where(LiveClass.id == class_id)
        .where(LiveClass.workspace_id == current_user.workspace_id)
    )
    live_class = result.scalar_one_or_none()

    if not live_class:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    if live_class.status == "live":
        raise HTTPException(status_code=400, detail="No se puede eliminar una clase en curso")

    await db.delete(live_class)
    await db.commit()


@router.post("/classes/{class_id}/start")
async def start_class(
    class_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Iniciar una clase (cambiar estado a live)"""
    result = await db.execute(
        select(LiveClass)
        .where(LiveClass.id == class_id)
        .where(LiveClass.workspace_id == current_user.workspace_id)
    )
    live_class = result.scalar_one_or_none()

    if not live_class:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    live_class.status = "live"

    # Registrar evento
    log = MeetingLog(
        class_id=class_id,
        event_type="meeting.started",
        event_data={"started_by": str(current_user.id)},
    )
    db.add(log)

    await db.commit()
    return {"message": "Clase iniciada", "meeting_url": live_class.meeting_url}


@router.post("/classes/{class_id}/end")
async def end_class(
    class_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Finalizar una clase"""
    result = await db.execute(
        select(LiveClass)
        .where(LiveClass.id == class_id)
        .where(LiveClass.workspace_id == current_user.workspace_id)
    )
    live_class = result.scalar_one_or_none()

    if not live_class:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    live_class.status = "completed"

    # Registrar evento
    log = MeetingLog(
        class_id=class_id,
        event_type="meeting.ended",
        event_data={"ended_by": str(current_user.id)},
    )
    db.add(log)

    # Marcar no-shows
    registrations_result = await db.execute(
        select(LiveClassRegistration)
        .where(LiveClassRegistration.class_id == class_id)
        .where(LiveClassRegistration.status == "registered")
    )
    for reg in registrations_result.scalars():
        if not reg.joined_at:
            reg.status = "no_show"

    await db.commit()
    return {"message": "Clase finalizada"}


# =====================================================
# INSCRIPCIONES
# =====================================================

@router.get("/classes/{class_id}/registrations", response_model=List[RegistrationResponse])
async def list_registrations(
    class_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Listar inscripciones de una clase"""
    result = await db.execute(
        select(LiveClassRegistration).where(LiveClassRegistration.class_id == class_id)
    )
    return result.scalars().all()


@router.post("/registrations", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_for_class(
    registration_data: RegistrationCreate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Inscribirse en una clase"""
    # Verificar que la clase existe y tiene espacio
    class_result = await db.execute(
        select(LiveClass).where(LiveClass.id == registration_data.class_id)
    )
    live_class = class_result.scalar_one_or_none()

    if not live_class:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    if live_class.current_participants >= live_class.max_participants:
        raise HTTPException(status_code=400, detail="La clase está llena")

    if live_class.status not in ["scheduled", "live"]:
        raise HTTPException(status_code=400, detail="No se puede inscribir en esta clase")

    # Verificar si ya está inscrito
    existing_result = await db.execute(
        select(LiveClassRegistration)
        .where(LiveClassRegistration.class_id == registration_data.class_id)
        .where(
            or_(
                LiveClassRegistration.user_id == current_user.id,
                LiveClassRegistration.client_id == registration_data.client_id
            )
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya estás inscrito en esta clase")

    registration = LiveClassRegistration(
        class_id=registration_data.class_id,
        user_id=current_user.id if not registration_data.client_id else None,
        client_id=registration_data.client_id,
    )
    db.add(registration)

    # Actualizar contador
    live_class.current_participants = (live_class.current_participants or 0) + 1

    await db.commit()
    await db.refresh(registration)
    return registration


@router.post("/registrations/{registration_id}/cancel")
async def cancel_registration(
    registration_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Cancelar inscripción"""
    result = await db.execute(
        select(LiveClassRegistration).where(LiveClassRegistration.id == registration_id)
    )
    registration = result.scalar_one_or_none()

    if not registration:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    registration.status = "cancelled"

    # Actualizar contador de la clase
    class_result = await db.execute(
        select(LiveClass).where(LiveClass.id == registration.class_id)
    )
    live_class = class_result.scalar_one_or_none()
    if live_class:
        live_class.current_participants = max(0, (live_class.current_participants or 1) - 1)

    await db.commit()
    return {"message": "Inscripción cancelada"}


@router.post("/registrations/{registration_id}/join")
async def join_class(
    registration_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Registrar entrada a la clase"""
    result = await db.execute(
        select(LiveClassRegistration).where(LiveClassRegistration.id == registration_id)
    )
    registration = result.scalar_one_or_none()

    if not registration:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    registration.joined_at = datetime.utcnow()
    registration.status = "attended"

    await db.commit()
    return {"message": "Entrada registrada"}


@router.post("/registrations/{registration_id}/feedback")
async def submit_feedback(
    registration_id: UUID,
    rating: int,
    feedback: Optional[str] = None,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Enviar feedback de la clase"""
    result = await db.execute(
        select(LiveClassRegistration).where(LiveClassRegistration.id == registration_id)
    )
    registration = result.scalar_one_or_none()

    if not registration:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="El rating debe estar entre 1 y 5")

    registration.rating = rating
    registration.feedback = feedback

    await db.commit()
    return {"message": "Feedback enviado"}


# =====================================================
# PLANTILLAS
# =====================================================

@router.get("/templates", response_model=List[TemplateResponse])
async def list_templates(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Listar plantillas de clases"""
    result = await db.execute(
        select(LiveClassTemplate)
        .where(LiveClassTemplate.workspace_id == current_user.workspace_id)
        .where(LiveClassTemplate.is_active == True)
        .order_by(LiveClassTemplate.name)
    )
    return result.scalars().all()


@router.post("/templates", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: TemplateBase,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Crear plantilla de clase"""
    template = LiveClassTemplate(
        workspace_id=current_user.workspace_id,
        **template_data.model_dump()
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


# =====================================================
# PAQUETES DE CLASES
# =====================================================

@router.get("/packages", response_model=List[PackageResponse])
async def list_packages(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Listar paquetes de clases"""
    result = await db.execute(
        select(LiveClassPackage)
        .where(LiveClassPackage.workspace_id == current_user.workspace_id)
        .where(LiveClassPackage.is_active == True)
        .order_by(LiveClassPackage.name)
    )
    return result.scalars().all()


@router.post("/packages", response_model=PackageResponse, status_code=status.HTTP_201_CREATED)
async def create_package(
    package_data: PackageBase,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Crear paquete de clases"""
    package = LiveClassPackage(
        workspace_id=current_user.workspace_id,
        **package_data.model_dump()
    )
    db.add(package)
    await db.commit()
    await db.refresh(package)
    return package


# =====================================================
# ESTADÍSTICAS
# =====================================================

@router.get("/stats", response_model=ClassStats)
async def get_class_stats(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
):
    """Obtener estadísticas de clases"""
    # Total de clases
    total_query = select(func.count(LiveClass.id)).where(
        LiveClass.workspace_id == current_user.workspace_id
    )
    if from_date:
        total_query = total_query.where(LiveClass.scheduled_start >= from_date)
    if to_date:
        total_query = total_query.where(LiveClass.scheduled_start <= to_date)

    total_result = await db.execute(total_query)
    total_classes = total_result.scalar() or 0

    # Clases próximas
    upcoming_result = await db.execute(
        select(func.count(LiveClass.id))
        .where(LiveClass.workspace_id == current_user.workspace_id)
        .where(LiveClass.scheduled_start >= datetime.utcnow())
        .where(LiveClass.status.in_(["scheduled", "live"]))
    )
    upcoming_classes = upcoming_result.scalar() or 0

    # Clases completadas
    completed_result = await db.execute(
        select(func.count(LiveClass.id))
        .where(LiveClass.workspace_id == current_user.workspace_id)
        .where(LiveClass.status == "completed")
    )
    completed_classes = completed_result.scalar() or 0

    # Total de participantes
    participants_result = await db.execute(
        select(func.sum(LiveClass.current_participants))
        .where(LiveClass.workspace_id == current_user.workspace_id)
    )
    total_participants = participants_result.scalar() or 0

    # Promedio de asistencia
    avg_attendance = total_participants / total_classes if total_classes > 0 else 0

    # Ingresos totales
    revenue_result = await db.execute(
        select(func.sum(LiveClassRegistration.amount_paid))
        .join(LiveClass)
        .where(LiveClass.workspace_id == current_user.workspace_id)
    )
    total_revenue = float(revenue_result.scalar() or 0)

    return ClassStats(
        total_classes=total_classes,
        upcoming_classes=upcoming_classes,
        completed_classes=completed_classes,
        total_participants=total_participants,
        average_attendance=round(avg_attendance, 1),
        total_revenue=total_revenue,
    )


# =====================================================
# CALENDARIO
# =====================================================

@router.get("/calendar")
async def get_calendar(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
):
    """Obtener calendario de clases"""
    result = await db.execute(
        select(LiveClass)
        .where(LiveClass.workspace_id == current_user.workspace_id)
        .where(LiveClass.scheduled_start >= start_date)
        .where(LiveClass.scheduled_start <= end_date)
        .where(LiveClass.status != "cancelled")
        .order_by(LiveClass.scheduled_start)
    )
    classes = result.scalars().all()

    # Agrupar por fecha
    calendar = {}
    for live_class in classes:
        date_key = live_class.scheduled_start.strftime("%Y-%m-%d")
        if date_key not in calendar:
            calendar[date_key] = []
        calendar[date_key].append(live_class)

    return calendar
