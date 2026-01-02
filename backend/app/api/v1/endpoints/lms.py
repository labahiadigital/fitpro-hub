"""
Endpoints de la API para el módulo LMS (Learning Management System)
"""

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, require_workspace
from app.models.lms import (
    Certificate,
    Challenge,
    ChallengeDailyProgress,
    ChallengeParticipant,
    Course,
    CourseEnrollment,
    CourseModule,
    CourseReview,
    Instructor,
    Lesson,
    LessonProgress,
)

router = APIRouter()


# =====================================================
# SCHEMAS
# =====================================================

class CourseBase(BaseModel):
    title: str
    slug: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    preview_video_url: Optional[str] = None
    category: str = "general"
    tags: List[str] = []
    difficulty: str = "beginner"
    is_free: bool = False
    price: float = 0
    currency: str = "EUR"
    has_certificate: bool = True
    prerequisites: List[str] = []
    learning_outcomes: List[str] = []


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    preview_video_url: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    difficulty: Optional[str] = None
    is_free: Optional[bool] = None
    price: Optional[float] = None
    is_published: Optional[bool] = None
    is_featured: Optional[bool] = None
    has_certificate: Optional[bool] = None
    prerequisites: Optional[List[str]] = None
    learning_outcomes: Optional[List[str]] = None


class CourseResponse(CourseBase):
    id: UUID
    workspace_id: UUID
    created_by: Optional[UUID] = None
    is_published: bool
    is_featured: bool
    estimated_duration_hours: float
    total_lessons: int
    total_modules: int
    enrolled_count: int
    completed_count: int
    average_rating: float
    reviews_count: int
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    position: int = 0
    unlock_after_days: int = 0


class ModuleCreate(ModuleBase):
    course_id: UUID


class ModuleResponse(ModuleBase):
    id: UUID
    course_id: UUID
    is_published: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LessonBase(BaseModel):
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    lesson_type: str = "video"
    video_url: Optional[str] = None
    video_duration_seconds: int = 0
    thumbnail_url: Optional[str] = None
    position: int = 0
    is_free_preview: bool = False
    is_mandatory: bool = True
    quiz_data: Optional[dict] = None
    passing_score: int = 70


class LessonCreate(LessonBase):
    course_id: UUID
    module_id: Optional[UUID] = None


class LessonResponse(LessonBase):
    id: UUID
    course_id: UUID
    module_id: Optional[UUID] = None
    is_published: bool
    attachments: List[dict] = []
    created_at: datetime

    class Config:
        from_attributes = True


class EnrollmentCreate(BaseModel):
    course_id: UUID
    client_id: Optional[UUID] = None


class EnrollmentResponse(BaseModel):
    id: UUID
    course_id: UUID
    user_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    status: str
    progress_percentage: float
    enrolled_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    certificate_issued: bool

    class Config:
        from_attributes = True


class ChallengeBase(BaseModel):
    title: str
    slug: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    banner_url: Optional[str] = None
    challenge_type: str = "fitness"
    duration_days: int = 30
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_free: bool = False
    price: float = 0
    currency: str = "EUR"
    max_participants: Optional[int] = None
    has_leaderboard: bool = True
    prizes: List[dict] = []
    challenge_content: dict = {}


class ChallengeCreate(ChallengeBase):
    pass


class ChallengeResponse(ChallengeBase):
    id: UUID
    workspace_id: UUID
    created_by: Optional[UUID] = None
    is_published: bool
    requires_approval: bool
    participants_count: int
    completed_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class InstructorBase(BaseModel):
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    specialties: List[str] = []
    credentials: List[str] = []
    social_links: dict = {}


class InstructorCreate(InstructorBase):
    user_id: Optional[UUID] = None


class InstructorResponse(InstructorBase):
    id: UUID
    workspace_id: UUID
    user_id: Optional[UUID] = None
    total_courses: int
    total_students: int
    average_rating: float
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CertificateResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    course_id: Optional[UUID] = None
    challenge_id: Optional[UUID] = None
    recipient_name: str
    recipient_email: Optional[str] = None
    certificate_number: str
    title: str
    description: Optional[str] = None
    issue_date: str
    expiry_date: Optional[str] = None
    pdf_url: Optional[str] = None
    verification_url: Optional[str] = None
    is_valid: bool
    created_at: datetime

    class Config:
        from_attributes = True


# =====================================================
# CURSOS
# =====================================================

@router.get("/courses", response_model=List[CourseResponse])
async def list_courses(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    published_only: bool = Query(False, description="Solo cursos publicados"),
    category: Optional[str] = Query(None, description="Filtrar por categoría"),
    difficulty: Optional[str] = Query(None, description="Filtrar por dificultad"),
):
    """Listar todos los cursos del workspace"""
    query = select(Course).where(Course.workspace_id == current_user.workspace_id)
    
    if published_only:
        query = query.where(Course.is_published == True)
    if category:
        query = query.where(Course.category == category)
    if difficulty:
        query = query.where(Course.difficulty == difficulty)
    
    query = query.order_by(Course.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    course_data: CourseCreate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Crear un nuevo curso"""
    course = Course(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        **course_data.model_dump()
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Obtener un curso por ID"""
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id)
        .where(Course.workspace_id == current_user.workspace_id)
    )
    course = result.scalar_one_or_none()
    
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    return course


@router.put("/courses/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: UUID,
    course_data: CourseUpdate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Actualizar un curso"""
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id)
        .where(Course.workspace_id == current_user.workspace_id)
    )
    course = result.scalar_one_or_none()
    
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    update_data = course_data.model_dump(exclude_unset=True)
    
    # Si se está publicando por primera vez
    if update_data.get("is_published") and not course.is_published:
        update_data["published_at"] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(course, field, value)
    
    await db.commit()
    await db.refresh(course)
    return course


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Eliminar un curso"""
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id)
        .where(Course.workspace_id == current_user.workspace_id)
    )
    course = result.scalar_one_or_none()
    
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    await db.delete(course)
    await db.commit()


# =====================================================
# MÓDULOS
# =====================================================

@router.get("/courses/{course_id}/modules", response_model=List[ModuleResponse])
async def list_modules(
    course_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Listar módulos de un curso"""
    result = await db.execute(
        select(CourseModule)
        .where(CourseModule.course_id == course_id)
        .order_by(CourseModule.position)
    )
    return result.scalars().all()


@router.post("/modules", response_model=ModuleResponse, status_code=status.HTTP_201_CREATED)
async def create_module(
    module_data: ModuleCreate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Crear un nuevo módulo"""
    module = CourseModule(**module_data.model_dump())
    db.add(module)
    await db.commit()
    await db.refresh(module)
    
    # Actualizar contador de módulos del curso
    await db.execute(
        select(Course).where(Course.id == module_data.course_id)
    )
    
    return module


# =====================================================
# LECCIONES
# =====================================================

@router.get("/courses/{course_id}/lessons", response_model=List[LessonResponse])
async def list_lessons(
    course_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Listar lecciones de un curso"""
    result = await db.execute(
        select(Lesson)
        .where(Lesson.course_id == course_id)
        .order_by(Lesson.position)
    )
    return result.scalars().all()


@router.post("/lessons", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    lesson_data: LessonCreate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Crear una nueva lección"""
    lesson = Lesson(**lesson_data.model_dump())
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.get("/lessons/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Obtener una lección por ID"""
    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lección no encontrada")
    
    return lesson


# =====================================================
# INSCRIPCIONES
# =====================================================

@router.post("/enrollments", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll_in_course(
    enrollment_data: EnrollmentCreate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Inscribirse en un curso"""
    # Verificar que el curso existe
    course_result = await db.execute(
        select(Course).where(Course.id == enrollment_data.course_id)
    )
    course = course_result.scalar_one_or_none()
    
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    # Verificar si ya está inscrito
    existing_result = await db.execute(
        select(CourseEnrollment)
        .where(CourseEnrollment.course_id == enrollment_data.course_id)
        .where(
            (CourseEnrollment.user_id == current_user.id) |
            (CourseEnrollment.client_id == enrollment_data.client_id)
        )
    )
    
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya estás inscrito en este curso")
    
    enrollment = CourseEnrollment(
        course_id=enrollment_data.course_id,
        user_id=current_user.id if not enrollment_data.client_id else None,
        client_id=enrollment_data.client_id,
    )
    db.add(enrollment)
    
    # Actualizar contador de inscritos
    course.enrolled_count = (course.enrolled_count or 0) + 1
    
    await db.commit()
    await db.refresh(enrollment)
    return enrollment


@router.get("/enrollments", response_model=List[EnrollmentResponse])
async def list_enrollments(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    course_id: Optional[UUID] = Query(None),
):
    """Listar inscripciones"""
    query = select(CourseEnrollment)
    
    if course_id:
        query = query.where(CourseEnrollment.course_id == course_id)
    
    result = await db.execute(query.order_by(CourseEnrollment.enrolled_at.desc()))
    return result.scalars().all()


@router.get("/my-enrollments", response_model=List[EnrollmentResponse])
async def list_my_enrollments(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Listar mis inscripciones"""
    result = await db.execute(
        select(CourseEnrollment)
        .where(CourseEnrollment.user_id == current_user.id)
        .order_by(CourseEnrollment.enrolled_at.desc())
    )
    return result.scalars().all()


# =====================================================
# RETOS
# =====================================================

@router.get("/challenges", response_model=List[ChallengeResponse])
async def list_challenges(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    published_only: bool = Query(False),
    challenge_type: Optional[str] = Query(None),
):
    """Listar retos del workspace"""
    query = select(Challenge).where(Challenge.workspace_id == current_user.workspace_id)
    
    if published_only:
        query = query.where(Challenge.is_published == True)
    if challenge_type:
        query = query.where(Challenge.challenge_type == challenge_type)
    
    result = await db.execute(query.order_by(Challenge.created_at.desc()))
    return result.scalars().all()


@router.post("/challenges", response_model=ChallengeResponse, status_code=status.HTTP_201_CREATED)
async def create_challenge(
    challenge_data: ChallengeCreate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Crear un nuevo reto"""
    challenge = Challenge(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        **challenge_data.model_dump()
    )
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)
    return challenge


@router.get("/challenges/{challenge_id}", response_model=ChallengeResponse)
async def get_challenge(
    challenge_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Obtener un reto por ID"""
    result = await db.execute(
        select(Challenge)
        .where(Challenge.id == challenge_id)
        .where(Challenge.workspace_id == current_user.workspace_id)
    )
    challenge = result.scalar_one_or_none()
    
    if not challenge:
        raise HTTPException(status_code=404, detail="Reto no encontrado")
    
    return challenge


# =====================================================
# INSTRUCTORES
# =====================================================

@router.get("/instructors", response_model=List[InstructorResponse])
async def list_instructors(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Listar instructores del workspace"""
    result = await db.execute(
        select(Instructor)
        .where(Instructor.workspace_id == current_user.workspace_id)
        .where(Instructor.is_active == True)
        .order_by(Instructor.display_name)
    )
    return result.scalars().all()


@router.post("/instructors", response_model=InstructorResponse, status_code=status.HTTP_201_CREATED)
async def create_instructor(
    instructor_data: InstructorCreate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Crear un nuevo instructor"""
    instructor = Instructor(
        workspace_id=current_user.workspace_id,
        **instructor_data.model_dump()
    )
    db.add(instructor)
    await db.commit()
    await db.refresh(instructor)
    return instructor


# =====================================================
# CERTIFICADOS
# =====================================================

@router.get("/certificates", response_model=List[CertificateResponse])
async def list_certificates(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Listar certificados del workspace"""
    result = await db.execute(
        select(Certificate)
        .where(Certificate.workspace_id == current_user.workspace_id)
        .order_by(Certificate.issue_date.desc())
    )
    return result.scalars().all()


@router.get("/certificates/{certificate_number}")
async def verify_certificate(
    certificate_number: str,
    db: AsyncSession = Depends(get_db),
):
    """Verificar un certificado por su número (público)"""
    result = await db.execute(
        select(Certificate).where(Certificate.certificate_number == certificate_number)
    )
    certificate = result.scalar_one_or_none()
    
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")
    
    return {
        "is_valid": certificate.is_valid,
        "certificate_number": certificate.certificate_number,
        "recipient_name": certificate.recipient_name,
        "title": certificate.title,
        "issue_date": certificate.issue_date,
        "expiry_date": certificate.expiry_date,
    }
