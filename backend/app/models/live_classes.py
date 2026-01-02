"""
Modelos SQLAlchemy para Clases Online en Vivo
"""

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Column,
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


class VideoIntegration(Base):
    """Configuración de integración de video por workspace"""
    __tablename__ = "video_integrations"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Proveedor
    provider = Column(String, default="zoom")

    # Credenciales Zoom
    zoom_account_id = Column(String, nullable=True)
    zoom_client_id = Column(String, nullable=True)
    zoom_client_secret = Column(String, nullable=True)
    zoom_webhook_secret = Column(String, nullable=True)

    # Credenciales Google Meet
    google_client_id = Column(String, nullable=True)
    google_client_secret = Column(String, nullable=True)
    google_refresh_token = Column(String, nullable=True)

    # Credenciales Microsoft Teams
    teams_tenant_id = Column(String, nullable=True)
    teams_client_id = Column(String, nullable=True)
    teams_client_secret = Column(String, nullable=True)

    # Configuración personalizada
    custom_meeting_url_template = Column(String, nullable=True)

    # Estado
    is_active = Column(Boolean, default=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class LiveClass(Base):
    """Clase en vivo"""
    __tablename__ = "live_classes"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    instructor_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Información básica
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Tipo de clase
    class_type = Column(String, default="group")  # individual, group, workshop, webinar
    category = Column(String, default="fitness")

    # Fecha y hora
    scheduled_start = Column(DateTime(timezone=True), nullable=False)
    scheduled_end = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=60)
    timezone = Column(String, default="Europe/Madrid")

    # Capacidad
    max_participants = Column(Integer, default=20)
    current_participants = Column(Integer, default=0)

    # Precios
    is_free = Column(Boolean, default=False)
    price = Column(Numeric, default=0)
    currency = Column(String, default="EUR")

    # Requisitos
    required_equipment = Column(ARRAY(String), default=[])
    difficulty_level = Column(String, default="all")

    # Enlace de la reunión
    meeting_provider = Column(String, default="zoom")
    meeting_id = Column(String, nullable=True)
    meeting_password = Column(String, nullable=True)
    meeting_url = Column(String, nullable=True)
    host_url = Column(String, nullable=True)

    # Grabación
    is_recorded = Column(Boolean, default=True)
    recording_url = Column(String, nullable=True)
    recording_available_until = Column(DateTime(timezone=True), nullable=True)

    # Estado
    status = Column(String, default="scheduled")  # draft, scheduled, live, completed, cancelled

    # Recurrencia
    is_recurring = Column(Boolean, default=False)
    recurrence_rule = Column(JSONB, nullable=True)
    parent_class_id = Column(PG_UUID(as_uuid=True), ForeignKey("live_classes.id"), nullable=True)

    # Imagen
    thumbnail_url = Column(String, nullable=True)

    # Notas
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    registrations = relationship("LiveClassRegistration", back_populates="live_class", cascade="all, delete-orphan")
    logs = relationship("MeetingLog", back_populates="live_class", cascade="all, delete-orphan")


class LiveClassRegistration(Base):
    """Inscripción a clase en vivo"""
    __tablename__ = "live_class_registrations"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    class_id = Column(PG_UUID(as_uuid=True), ForeignKey("live_classes.id", ondelete="CASCADE"), nullable=False)

    # Participante
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)

    # Estado
    status = Column(String, default="registered")  # registered, attended, no_show, cancelled

    # Asistencia
    joined_at = Column(DateTime(timezone=True), nullable=True)
    left_at = Column(DateTime(timezone=True), nullable=True)
    attendance_duration_minutes = Column(Integer, default=0)

    # Pago
    payment_id = Column(PG_UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True)
    amount_paid = Column(Numeric, default=0)

    # Recordatorios
    reminder_sent = Column(Boolean, default=False)
    reminder_sent_at = Column(DateTime(timezone=True), nullable=True)

    # Feedback
    rating = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    live_class = relationship("LiveClass", back_populates="registrations")


class LiveClassTemplate(Base):
    """Plantilla de clase reutilizable"""
    __tablename__ = "live_class_templates"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)

    # Información básica
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Configuración
    class_type = Column(String, default="group")
    category = Column(String, default="fitness")
    duration_minutes = Column(Integer, default=60)
    max_participants = Column(Integer, default=20)

    # Precios
    is_free = Column(Boolean, default=False)
    default_price = Column(Numeric, default=0)

    # Requisitos
    required_equipment = Column(ARRAY(String), default=[])
    difficulty_level = Column(String, default="all")

    # Imagen
    thumbnail_url = Column(String, nullable=True)

    # Estado
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class LiveClassPackage(Base):
    """Paquete de clases para venta"""
    __tablename__ = "live_class_packages"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)

    # Información
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Configuración
    total_classes = Column(Integer, nullable=False)
    price = Column(Numeric, nullable=False)
    currency = Column(String, default="EUR")
    validity_days = Column(Integer, default=30)

    # Clases aplicables
    applicable_categories = Column(ARRAY(String), default=[])
    applicable_class_types = Column(ARRAY(String), default=[])

    # Estado
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ClientClassPackage(Base):
    """Paquete de clases comprado por cliente"""
    __tablename__ = "client_class_packages"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    package_id = Column(PG_UUID(as_uuid=True), ForeignKey("live_class_packages.id"), nullable=False)

    # Uso
    total_classes = Column(Integer, nullable=False)
    used_classes = Column(Integer, default=0)

    # Fechas
    purchased_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Pago
    payment_id = Column(PG_UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True)

    # Estado
    status = Column(String, default="active")  # active, expired, exhausted, cancelled

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MeetingLog(Base):
    """Log de eventos de reuniones"""
    __tablename__ = "meeting_logs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    class_id = Column(PG_UUID(as_uuid=True), ForeignKey("live_classes.id", ondelete="CASCADE"), nullable=False)

    # Evento
    event_type = Column(String, nullable=False)
    event_data = Column(JSONB, default={})

    # Participante
    participant_id = Column(String, nullable=True)
    participant_name = Column(String, nullable=True)
    participant_email = Column(String, nullable=True)

    # Timestamps
    event_timestamp = Column(DateTime(timezone=True), server_default=func.now())

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    live_class = relationship("LiveClass", back_populates="logs")
