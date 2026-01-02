"""
Modelos SQLAlchemy para Integración con Wearables
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
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
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class ConnectedDevice(Base):
    """Dispositivo wearable conectado"""
    __tablename__ = "connected_devices"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    # Información del dispositivo
    device_type = Column(String, nullable=False)  # apple_watch, garmin, fitbit, etc.
    device_name = Column(String, nullable=True)
    device_model = Column(String, nullable=True)
    device_id = Column(String, nullable=True)

    # Tokens de acceso
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Estado
    is_active = Column(Boolean, default=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    sync_frequency_minutes = Column(Integer, default=60)

    # Permisos
    sync_heart_rate = Column(Boolean, default=True)
    sync_steps = Column(Boolean, default=True)
    sync_sleep = Column(Boolean, default=True)
    sync_workouts = Column(Boolean, default=True)
    sync_calories = Column(Boolean, default=True)
    sync_hrv = Column(Boolean, default=True)
    sync_stress = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('client_id', 'device_type', name='uq_client_device_type'),
    )


class HealthMetric(Base):
    """Métrica de salud individual"""
    __tablename__ = "health_metrics"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    device_id = Column(PG_UUID(as_uuid=True), ForeignKey("connected_devices.id", ondelete="SET NULL"), nullable=True)

    # Tipo de métrica
    metric_type = Column(String, nullable=False)

    # Valor
    value = Column(Numeric, nullable=False)
    unit = Column(String, nullable=False)

    # Contexto
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    source = Column(String, nullable=True)

    # Metadatos adicionales
    extra_data = Column(JSONB, default={})

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('client_id', 'metric_type', 'recorded_at', name='uq_client_metric_time'),
    )


class SyncedActivity(Base):
    """Actividad sincronizada de wearable"""
    __tablename__ = "synced_activities"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    device_id = Column(PG_UUID(as_uuid=True), ForeignKey("connected_devices.id", ondelete="SET NULL"), nullable=True)

    # Información de la actividad
    activity_type = Column(String, nullable=False)
    activity_name = Column(String, nullable=True)

    # Tiempos
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)

    # Métricas
    distance_meters = Column(Numeric, nullable=True)
    calories_burned = Column(Integer, nullable=True)
    avg_heart_rate = Column(Integer, nullable=True)
    max_heart_rate = Column(Integer, nullable=True)
    avg_pace_seconds_per_km = Column(Numeric, nullable=True)
    elevation_gain_meters = Column(Numeric, nullable=True)

    # Datos detallados
    heart_rate_zones = Column(JSONB, default={})
    laps = Column(JSONB, default=[])
    route_data = Column(JSONB, nullable=True)

    # Fuente
    external_id = Column(String, nullable=True)
    source = Column(String, nullable=False)

    # Vinculación con workout de Trackfiz
    workout_log_id = Column(PG_UUID(as_uuid=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DailyHealthSummary(Base):
    """Resumen diario de salud"""
    __tablename__ = "daily_health_summary"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    summary_date = Column(Date, nullable=False)

    # Actividad
    total_steps = Column(Integer, default=0)
    total_distance_meters = Column(Numeric, default=0)
    floors_climbed = Column(Integer, default=0)
    active_minutes = Column(Integer, default=0)

    # Calorías
    total_calories_burned = Column(Integer, default=0)
    active_calories = Column(Integer, default=0)
    basal_calories = Column(Integer, default=0)

    # Corazón
    avg_resting_heart_rate = Column(Integer, nullable=True)
    min_heart_rate = Column(Integer, nullable=True)
    max_heart_rate = Column(Integer, nullable=True)
    avg_hrv = Column(Numeric, nullable=True)

    # Sueño
    sleep_duration_minutes = Column(Integer, nullable=True)
    sleep_quality_score = Column(Integer, nullable=True)
    deep_sleep_minutes = Column(Integer, nullable=True)
    rem_sleep_minutes = Column(Integer, nullable=True)
    light_sleep_minutes = Column(Integer, nullable=True)
    awake_minutes = Column(Integer, nullable=True)

    # Recuperación
    recovery_score = Column(Integer, nullable=True)
    readiness_score = Column(Integer, nullable=True)
    stress_score = Column(Integer, nullable=True)

    # Otros
    avg_blood_oxygen = Column(Numeric, nullable=True)
    avg_respiratory_rate = Column(Numeric, nullable=True)

    # Objetivos
    steps_goal = Column(Integer, default=10000)
    calories_goal = Column(Integer, default=2500)
    active_minutes_goal = Column(Integer, default=30)
    sleep_goal_minutes = Column(Integer, default=480)

    # Cumplimiento de objetivos
    steps_goal_met = Column(Boolean, default=False)
    calories_goal_met = Column(Boolean, default=False)
    active_minutes_goal_met = Column(Boolean, default=False)
    sleep_goal_met = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('client_id', 'summary_date', name='uq_client_summary_date'),
    )


class ClientHealthGoals(Base):
    """Objetivos de salud por cliente"""
    __tablename__ = "client_health_goals"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Objetivos diarios
    daily_steps_goal = Column(Integer, default=10000)
    daily_calories_goal = Column(Integer, default=2500)
    daily_active_minutes_goal = Column(Integer, default=30)
    daily_water_goal_ml = Column(Integer, default=2000)
    daily_sleep_goal_minutes = Column(Integer, default=480)

    # Objetivos semanales
    weekly_workout_days_goal = Column(Integer, default=4)
    weekly_active_minutes_goal = Column(Integer, default=150)

    # Zonas de frecuencia cardíaca
    hr_zone_1_max = Column(Integer, nullable=True)
    hr_zone_2_max = Column(Integer, nullable=True)
    hr_zone_3_max = Column(Integer, nullable=True)
    hr_zone_4_max = Column(Integer, nullable=True)
    hr_zone_5_max = Column(Integer, nullable=True)

    # Notificaciones
    notify_goal_achieved = Column(Boolean, default=True)
    notify_inactivity = Column(Boolean, default=True)
    inactivity_threshold_minutes = Column(Integer, default=60)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class HealthAlert(Base):
    """Alerta de salud"""
    __tablename__ = "health_alerts"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)

    # Tipo de alerta
    alert_type = Column(String, nullable=False)

    # Severidad
    severity = Column(String, default="info")

    # Contenido
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)

    # Datos relacionados
    related_data = Column(JSONB, default={})

    # Estado
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)

    # Acción tomada
    action_taken = Column(Text, nullable=True)
    action_taken_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Constantes de tipos de dispositivos soportados
SUPPORTED_DEVICES = {
    "apple_watch": {
        "name": "Apple Watch",
        "oauth_url": "https://appleid.apple.com/auth/authorize",
        "metrics": ["heart_rate", "steps", "sleep", "workouts", "hrv", "calories"],
    },
    "garmin": {
        "name": "Garmin",
        "oauth_url": "https://connect.garmin.com/oauthConfirm",
        "metrics": ["heart_rate", "steps", "sleep", "workouts", "hrv", "stress", "calories"],
    },
    "fitbit": {
        "name": "Fitbit",
        "oauth_url": "https://www.fitbit.com/oauth2/authorize",
        "metrics": ["heart_rate", "steps", "sleep", "workouts", "calories"],
    },
    "whoop": {
        "name": "WHOOP",
        "oauth_url": "https://api.prod.whoop.com/oauth/oauth2/auth",
        "metrics": ["heart_rate", "sleep", "workouts", "hrv", "recovery", "strain"],
    },
    "oura": {
        "name": "Oura Ring",
        "oauth_url": "https://cloud.ouraring.com/oauth/authorize",
        "metrics": ["heart_rate", "sleep", "hrv", "readiness", "activity"],
    },
    "polar": {
        "name": "Polar",
        "oauth_url": "https://flow.polar.com/oauth2/authorization",
        "metrics": ["heart_rate", "workouts", "sleep", "recovery"],
    },
}

# Tipos de métricas soportadas
METRIC_TYPES = [
    "heart_rate",
    "resting_heart_rate",
    "heart_rate_variability",
    "steps",
    "distance",
    "floors_climbed",
    "calories_burned",
    "active_calories",
    "basal_calories",
    "sleep_duration",
    "sleep_quality",
    "deep_sleep",
    "rem_sleep",
    "light_sleep",
    "stress_level",
    "recovery_score",
    "readiness_score",
    "blood_oxygen",
    "respiratory_rate",
    "body_temperature",
    "weight",
    "body_fat",
    "muscle_mass",
    "hydration",
]
