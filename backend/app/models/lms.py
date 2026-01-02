"""
Modelos SQLAlchemy para el módulo LMS (Learning Management System)
"""

from datetime import date, datetime
from typing import Any, List, Optional
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Course(Base):
    """Modelo de Curso"""
    __tablename__ = "courses"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Información básica
    title = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    short_description = Column(Text, nullable=True)

    # Multimedia
    thumbnail_url = Column(String, nullable=True)
    preview_video_url = Column(String, nullable=True)

    # Categorización
    category = Column(String, default="general")
    tags = Column(ARRAY(String), default=[])
    difficulty = Column(String, default="beginner")

    # Duración y contenido
    estimated_duration_hours = Column(Numeric, default=0)
    total_lessons = Column(Integer, default=0)
    total_modules = Column(Integer, default=0)

    # Precios y monetización
    is_free = Column(Boolean, default=False)
    price = Column(Numeric, default=0)
    currency = Column(String, default="EUR")
    stripe_product_id = Column(String, nullable=True)
    stripe_price_id = Column(String, nullable=True)

    # Configuración
    is_published = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    requires_approval = Column(Boolean, default=False)
    has_certificate = Column(Boolean, default=True)

    # Requisitos previos
    prerequisites = Column(ARRAY(String), default=[])
    learning_outcomes = Column(ARRAY(String), default=[])

    # Estadísticas
    enrolled_count = Column(Integer, default=0)
    completed_count = Column(Integer, default=0)
    average_rating = Column(Numeric, default=0)
    reviews_count = Column(Integer, default=0)

    # Metadatos
    course_metadata = Column(JSONB, default={})

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    published_at = Column(DateTime(timezone=True), nullable=True)

    # Relaciones
    modules = relationship("CourseModule", back_populates="course", cascade="all, delete-orphan")
    lessons = relationship("Lesson", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("CourseEnrollment", back_populates="course", cascade="all, delete-orphan")
    reviews = relationship("CourseReview", back_populates="course", cascade="all, delete-orphan")


class CourseModule(Base):
    """Modelo de Módulo de Curso"""
    __tablename__ = "course_modules"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    course_id = Column(PG_UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    position = Column(Integer, default=0)

    is_published = Column(Boolean, default=True)
    unlock_after_days = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    course = relationship("Course", back_populates="modules")
    lessons = relationship("Lesson", back_populates="module")


class Lesson(Base):
    """Modelo de Lección"""
    __tablename__ = "lessons"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    course_id = Column(PG_UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    module_id = Column(PG_UUID(as_uuid=True), ForeignKey("course_modules.id", ondelete="SET NULL"), nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)

    # Tipo de contenido
    lesson_type = Column(String, default="video")

    # Multimedia
    video_url = Column(String, nullable=True)
    video_duration_seconds = Column(Integer, default=0)
    thumbnail_url = Column(String, nullable=True)

    # Archivos adjuntos
    attachments = Column(JSONB, default=[])

    # Configuración
    position = Column(Integer, default=0)
    is_published = Column(Boolean, default=True)
    is_free_preview = Column(Boolean, default=False)
    is_mandatory = Column(Boolean, default=True)

    # Quiz/Evaluación
    quiz_data = Column(JSONB, nullable=True)
    passing_score = Column(Integer, default=70)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    course = relationship("Course", back_populates="lessons")
    module = relationship("CourseModule", back_populates="lessons")
    progress = relationship("LessonProgress", back_populates="lesson", cascade="all, delete-orphan")


class CourseEnrollment(Base):
    """Modelo de Inscripción en Curso"""
    __tablename__ = "course_enrollments"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    course_id = Column(PG_UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)

    # Estado
    status = Column(String, default="active")

    # Progreso
    progress_percentage = Column(Numeric, default=0)
    completed_lessons = Column(ARRAY(PG_UUID(as_uuid=True)), default=[])
    current_lesson_id = Column(PG_UUID(as_uuid=True), ForeignKey("lessons.id"), nullable=True)

    # Fechas
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Certificado
    certificate_issued = Column(Boolean, default=False)
    certificate_url = Column(String, nullable=True)
    certificate_issued_at = Column(DateTime(timezone=True), nullable=True)

    # Pago
    payment_id = Column(PG_UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True)
    amount_paid = Column(Numeric, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    course = relationship("Course", back_populates="enrollments")
    lesson_progress = relationship("LessonProgress", back_populates="enrollment", cascade="all, delete-orphan")
    review = relationship("CourseReview", back_populates="enrollment", uselist=False)


class LessonProgress(Base):
    """Modelo de Progreso de Lección"""
    __tablename__ = "lesson_progress"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    enrollment_id = Column(PG_UUID(as_uuid=True), ForeignKey("course_enrollments.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(PG_UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)

    # Estado
    status = Column(String, default="not_started")

    # Progreso del video
    video_progress_seconds = Column(Integer, default=0)
    video_completed = Column(Boolean, default=False)

    # Quiz
    quiz_attempts = Column(Integer, default=0)
    quiz_score = Column(Numeric, nullable=True)
    quiz_passed = Column(Boolean, default=False)
    quiz_answers = Column(JSONB, default=[])

    # Fechas
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    enrollment = relationship("CourseEnrollment", back_populates="lesson_progress")
    lesson = relationship("Lesson", back_populates="progress")


class Challenge(Base):
    """Modelo de Reto/Challenge"""
    __tablename__ = "challenges"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Información básica
    title = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    short_description = Column(Text, nullable=True)

    # Multimedia
    thumbnail_url = Column(String, nullable=True)
    banner_url = Column(String, nullable=True)

    # Tipo de reto
    challenge_type = Column(String, default="fitness")

    # Duración
    duration_days = Column(Integer, default=30)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    # Precios
    is_free = Column(Boolean, default=False)
    price = Column(Numeric, default=0)
    currency = Column(String, default="EUR")

    # Configuración
    is_published = Column(Boolean, default=False)
    max_participants = Column(Integer, nullable=True)
    requires_approval = Column(Boolean, default=False)
    has_leaderboard = Column(Boolean, default=True)

    # Premios
    prizes = Column(JSONB, default=[])

    # Contenido del reto
    challenge_content = Column(JSONB, default={})

    # Estadísticas
    participants_count = Column(Integer, default=0)
    completed_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    participants = relationship("ChallengeParticipant", back_populates="challenge", cascade="all, delete-orphan")


class ChallengeParticipant(Base):
    """Modelo de Participante en Reto"""
    __tablename__ = "challenge_participants"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    challenge_id = Column(PG_UUID(as_uuid=True), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)

    # Estado
    status = Column(String, default="active")

    # Progreso
    current_day = Column(Integer, default=1)
    completed_days = Column(Integer, default=0)
    total_points = Column(Integer, default=0)

    # Métricas
    initial_metrics = Column(JSONB, default={})
    current_metrics = Column(JSONB, default={})
    final_metrics = Column(JSONB, default={})

    # Fotos de progreso
    progress_photos = Column(JSONB, default=[])

    # Fechas
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Pago
    payment_id = Column(PG_UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    challenge = relationship("Challenge", back_populates="participants")
    daily_progress = relationship("ChallengeDailyProgress", back_populates="participant", cascade="all, delete-orphan")


class ChallengeDailyProgress(Base):
    """Modelo de Progreso Diario en Reto"""
    __tablename__ = "challenge_daily_progress"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    participant_id = Column(PG_UUID(as_uuid=True), ForeignKey("challenge_participants.id", ondelete="CASCADE"), nullable=False)

    day_number = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)

    # Tareas completadas
    tasks_completed = Column(JSONB, default=[])

    # Métricas del día
    metrics = Column(JSONB, default={})

    # Notas y fotos
    notes = Column(Text, nullable=True)
    photos = Column(JSONB, default=[])

    # Puntos
    points_earned = Column(Integer, default=0)

    # Estado
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    participant = relationship("ChallengeParticipant", back_populates="daily_progress")


class Certificate(Base):
    """Modelo de Certificado"""
    __tablename__ = "certificates"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)

    # Referencia al curso/reto
    course_id = Column(PG_UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    challenge_id = Column(PG_UUID(as_uuid=True), ForeignKey("challenges.id", ondelete="SET NULL"), nullable=True)

    # Destinatario
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    recipient_name = Column(String, nullable=False)
    recipient_email = Column(String, nullable=True)

    # Información del certificado
    certificate_number = Column(String, nullable=False, unique=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Fechas
    issue_date = Column(Date, nullable=False, default=date.today)
    expiry_date = Column(Date, nullable=True)

    # Archivo
    pdf_url = Column(String, nullable=True)
    verification_url = Column(String, nullable=True)

    # Diseño personalizado
    template_id = Column(String, default="default")
    custom_data = Column(JSONB, default={})

    # Estado
    is_valid = Column(Boolean, default=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CourseReview(Base):
    """Modelo de Reseña de Curso"""
    __tablename__ = "course_reviews"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    course_id = Column(PG_UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    enrollment_id = Column(PG_UUID(as_uuid=True), ForeignKey("course_enrollments.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)

    rating = Column(Integer, nullable=False)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=True)

    is_published = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)

    helpful_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    course = relationship("Course", back_populates="reviews")
    enrollment = relationship("CourseEnrollment", back_populates="review")


class Instructor(Base):
    """Modelo de Instructor"""
    __tablename__ = "instructors"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Información del instructor
    display_name = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)

    # Especialidades
    specialties = Column(ARRAY(String), default=[])
    credentials = Column(ARRAY(String), default=[])

    # Redes sociales
    social_links = Column(JSONB, default={})

    # Estadísticas
    total_courses = Column(Integer, default=0)
    total_students = Column(Integer, default=0)
    average_rating = Column(Numeric, default=0)

    # Estado
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
