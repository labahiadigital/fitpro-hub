"""
Endpoints de la API para Integración con Wearables
"""

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_workspace
from app.models.wearables import (
    ConnectedDevice,
    DailyHealthSummary,
    HealthAlert,
    HealthMetric,
    SyncedActivity,
    ClientHealthGoals,
    SUPPORTED_DEVICES,
    METRIC_TYPES,
)

router = APIRouter()


# =====================================================
# SCHEMAS
# =====================================================

class DeviceConnectRequest(BaseModel):
    client_id: UUID
    device_type: str
    authorization_code: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


class DeviceResponse(BaseModel):
    id: UUID
    client_id: UUID
    device_type: str
    device_name: Optional[str] = None
    device_model: Optional[str] = None
    is_active: bool
    last_sync_at: Optional[datetime] = None
    sync_heart_rate: bool
    sync_steps: bool
    sync_sleep: bool
    sync_workouts: bool
    sync_calories: bool
    sync_hrv: bool
    created_at: datetime

    class Config:
        from_attributes = True


class HealthMetricCreate(BaseModel):
    client_id: UUID
    metric_type: str
    value: float
    unit: str
    recorded_at: datetime
    source: Optional[str] = "manual"
    metadata: Optional[Dict[str, Any]] = None


class HealthMetricResponse(BaseModel):
    id: UUID
    client_id: UUID
    metric_type: str
    value: float
    unit: str
    recorded_at: datetime
    source: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityResponse(BaseModel):
    id: UUID
    client_id: UUID
    activity_type: str
    activity_name: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    distance_meters: Optional[float] = None
    calories_burned: Optional[int] = None
    avg_heart_rate: Optional[int] = None
    max_heart_rate: Optional[int] = None
    source: str
    created_at: datetime

    class Config:
        from_attributes = True


class DailySummaryResponse(BaseModel):
    id: UUID
    client_id: UUID
    summary_date: date
    total_steps: int
    total_distance_meters: float
    active_minutes: int
    total_calories_burned: int
    avg_resting_heart_rate: Optional[int] = None
    avg_hrv: Optional[float] = None
    sleep_duration_minutes: Optional[int] = None
    sleep_quality_score: Optional[int] = None
    recovery_score: Optional[int] = None
    steps_goal_met: bool
    calories_goal_met: bool
    active_minutes_goal_met: bool
    sleep_goal_met: bool

    class Config:
        from_attributes = True


class HealthGoalsUpdate(BaseModel):
    daily_steps_goal: Optional[int] = None
    daily_calories_goal: Optional[int] = None
    daily_active_minutes_goal: Optional[int] = None
    daily_water_goal_ml: Optional[int] = None
    daily_sleep_goal_minutes: Optional[int] = None
    weekly_workout_days_goal: Optional[int] = None
    weekly_active_minutes_goal: Optional[int] = None
    notify_goal_achieved: Optional[bool] = None
    notify_inactivity: Optional[bool] = None


class AlertResponse(BaseModel):
    id: UUID
    client_id: UUID
    alert_type: str
    severity: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SupportedDeviceInfo(BaseModel):
    device_type: str
    name: str
    metrics: List[str]


class ClientHealthDashboard(BaseModel):
    today_summary: Optional[DailySummaryResponse] = None
    weekly_averages: Dict[str, float]
    recent_activities: List[ActivityResponse]
    unread_alerts: int
    connected_devices: List[DeviceResponse]
    goals_progress: Dict[str, float]


# =====================================================
# DISPOSITIVOS SOPORTADOS
# =====================================================

@router.get("/supported-devices", response_model=List[SupportedDeviceInfo])
async def list_supported_devices():
    """Listar dispositivos wearables soportados"""
    return [
        SupportedDeviceInfo(
            device_type=device_type,
            name=info["name"],
            metrics=info["metrics"],
        )
        for device_type, info in SUPPORTED_DEVICES.items()
    ]


# =====================================================
# CONEXIÓN DE DISPOSITIVOS
# =====================================================

@router.get("/devices", response_model=List[DeviceResponse])
async def list_connected_devices(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    client_id: Optional[UUID] = Query(None),
):
    """Listar dispositivos conectados"""
    query = select(ConnectedDevice).where(
        ConnectedDevice.workspace_id == current_user.workspace_id
    )

    if client_id:
        query = query.where(ConnectedDevice.client_id == client_id)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/devices/connect", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def connect_device(
    request: DeviceConnectRequest,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Conectar un dispositivo wearable"""
    if request.device_type not in SUPPORTED_DEVICES:
        raise HTTPException(
            status_code=400,
            detail=f"Dispositivo no soportado. Dispositivos válidos: {list(SUPPORTED_DEVICES.keys())}"
        )

    # Verificar si ya existe
    existing = await db.execute(
        select(ConnectedDevice)
        .where(ConnectedDevice.client_id == request.client_id)
        .where(ConnectedDevice.device_type == request.device_type)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Este dispositivo ya está conectado para este cliente"
        )

    device = ConnectedDevice(
        workspace_id=current_user.workspace_id,
        client_id=request.client_id,
        device_type=request.device_type,
        device_name=SUPPORTED_DEVICES[request.device_type]["name"],
        access_token=request.access_token,
        refresh_token=request.refresh_token,
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return device


@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_device(
    device_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Desconectar un dispositivo"""
    result = await db.execute(
        select(ConnectedDevice)
        .where(ConnectedDevice.id == device_id)
        .where(ConnectedDevice.workspace_id == current_user.workspace_id)
    )
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    await db.delete(device)
    await db.commit()


@router.post("/devices/{device_id}/sync")
async def sync_device(
    device_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Sincronizar datos de un dispositivo"""
    result = await db.execute(
        select(ConnectedDevice)
        .where(ConnectedDevice.id == device_id)
        .where(ConnectedDevice.workspace_id == current_user.workspace_id)
    )
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    # TODO: Implementar sincronización real con cada API
    # Por ahora actualizamos el timestamp
    device.last_sync_at = datetime.utcnow()
    await db.commit()

    return {"message": "Sincronización iniciada", "device_type": device.device_type}


# =====================================================
# MÉTRICAS DE SALUD
# =====================================================

@router.get("/metrics", response_model=List[HealthMetricResponse])
async def list_health_metrics(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    client_id: UUID = Query(...),
    metric_type: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    limit: int = Query(100, le=1000),
):
    """Listar métricas de salud de un cliente"""
    query = select(HealthMetric).where(HealthMetric.client_id == client_id)

    if metric_type:
        query = query.where(HealthMetric.metric_type == metric_type)
    if from_date:
        query = query.where(HealthMetric.recorded_at >= from_date)
    if to_date:
        query = query.where(HealthMetric.recorded_at <= to_date)

    query = query.order_by(HealthMetric.recorded_at.desc()).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/metrics", response_model=HealthMetricResponse, status_code=status.HTTP_201_CREATED)
async def create_health_metric(
    metric: HealthMetricCreate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Registrar una métrica de salud manualmente"""
    if metric.metric_type not in METRIC_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de métrica no válido. Tipos válidos: {METRIC_TYPES}"
        )

    health_metric = HealthMetric(
        client_id=metric.client_id,
        metric_type=metric.metric_type,
        value=metric.value,
        unit=metric.unit,
        recorded_at=metric.recorded_at,
        source=metric.source,
        metadata=metric.metadata or {},
    )
    db.add(health_metric)
    await db.commit()
    await db.refresh(health_metric)
    return health_metric


# =====================================================
# ACTIVIDADES
# =====================================================

@router.get("/activities", response_model=List[ActivityResponse])
async def list_activities(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    client_id: UUID = Query(...),
    activity_type: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    limit: int = Query(50, le=200),
):
    """Listar actividades sincronizadas de un cliente"""
    query = select(SyncedActivity).where(SyncedActivity.client_id == client_id)

    if activity_type:
        query = query.where(SyncedActivity.activity_type == activity_type)
    if from_date:
        query = query.where(SyncedActivity.started_at >= from_date)
    if to_date:
        query = query.where(SyncedActivity.started_at <= to_date)

    query = query.order_by(SyncedActivity.started_at.desc()).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


# =====================================================
# RESUMEN DIARIO
# =====================================================

@router.get("/daily-summary", response_model=List[DailySummaryResponse])
async def get_daily_summaries(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    client_id: UUID = Query(...),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
):
    """Obtener resúmenes diarios de un cliente"""
    query = select(DailyHealthSummary).where(DailyHealthSummary.client_id == client_id)

    if from_date:
        query = query.where(DailyHealthSummary.summary_date >= from_date)
    if to_date:
        query = query.where(DailyHealthSummary.summary_date <= to_date)

    query = query.order_by(DailyHealthSummary.summary_date.desc())

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/daily-summary/today", response_model=Optional[DailySummaryResponse])
async def get_today_summary(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    client_id: UUID = Query(...),
):
    """Obtener resumen del día actual"""
    today = date.today()

    result = await db.execute(
        select(DailyHealthSummary)
        .where(DailyHealthSummary.client_id == client_id)
        .where(DailyHealthSummary.summary_date == today)
    )
    return result.scalar_one_or_none()


# =====================================================
# OBJETIVOS
# =====================================================

@router.get("/goals/{client_id}")
async def get_health_goals(
    client_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Obtener objetivos de salud de un cliente"""
    result = await db.execute(
        select(ClientHealthGoals).where(ClientHealthGoals.client_id == client_id)
    )
    goals = result.scalar_one_or_none()

    if not goals:
        # Retornar valores por defecto
        return {
            "daily_steps_goal": 10000,
            "daily_calories_goal": 2500,
            "daily_active_minutes_goal": 30,
            "daily_water_goal_ml": 2000,
            "daily_sleep_goal_minutes": 480,
            "weekly_workout_days_goal": 4,
            "weekly_active_minutes_goal": 150,
        }

    return goals


@router.put("/goals/{client_id}")
async def update_health_goals(
    client_id: UUID,
    goals_update: HealthGoalsUpdate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Actualizar objetivos de salud de un cliente"""
    result = await db.execute(
        select(ClientHealthGoals).where(ClientHealthGoals.client_id == client_id)
    )
    goals = result.scalar_one_or_none()

    if not goals:
        goals = ClientHealthGoals(client_id=client_id)
        db.add(goals)

    update_data = goals_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goals, field, value)

    await db.commit()
    await db.refresh(goals)
    return goals


# =====================================================
# ALERTAS
# =====================================================

@router.get("/alerts", response_model=List[AlertResponse])
async def list_health_alerts(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    client_id: UUID = Query(...),
    unread_only: bool = Query(False),
    limit: int = Query(50, le=200),
):
    """Listar alertas de salud de un cliente"""
    query = select(HealthAlert).where(HealthAlert.client_id == client_id)

    if unread_only:
        query = query.where(HealthAlert.is_read == False)

    query = query.order_by(HealthAlert.created_at.desc()).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Marcar alerta como leída"""
    result = await db.execute(
        select(HealthAlert).where(HealthAlert.id == alert_id)
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    alert.is_read = True
    await db.commit()
    return {"message": "Alerta marcada como leída"}


# =====================================================
# DASHBOARD DE SALUD
# =====================================================

@router.get("/dashboard/{client_id}", response_model=ClientHealthDashboard)
async def get_health_dashboard(
    client_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Obtener dashboard de salud completo de un cliente"""
    today = date.today()
    week_ago = today - timedelta(days=7)

    # Resumen de hoy
    today_result = await db.execute(
        select(DailyHealthSummary)
        .where(DailyHealthSummary.client_id == client_id)
        .where(DailyHealthSummary.summary_date == today)
    )
    today_summary = today_result.scalar_one_or_none()

    # Promedios semanales
    weekly_result = await db.execute(
        select(
            func.avg(DailyHealthSummary.total_steps).label("avg_steps"),
            func.avg(DailyHealthSummary.total_calories_burned).label("avg_calories"),
            func.avg(DailyHealthSummary.active_minutes).label("avg_active_minutes"),
            func.avg(DailyHealthSummary.sleep_duration_minutes).label("avg_sleep"),
            func.avg(DailyHealthSummary.avg_resting_heart_rate).label("avg_rhr"),
        )
        .where(DailyHealthSummary.client_id == client_id)
        .where(DailyHealthSummary.summary_date >= week_ago)
    )
    weekly_row = weekly_result.one()

    weekly_averages = {
        "steps": float(weekly_row.avg_steps or 0),
        "calories": float(weekly_row.avg_calories or 0),
        "active_minutes": float(weekly_row.avg_active_minutes or 0),
        "sleep_minutes": float(weekly_row.avg_sleep or 0),
        "resting_heart_rate": float(weekly_row.avg_rhr or 0),
    }

    # Actividades recientes
    activities_result = await db.execute(
        select(SyncedActivity)
        .where(SyncedActivity.client_id == client_id)
        .order_by(SyncedActivity.started_at.desc())
        .limit(5)
    )
    recent_activities = activities_result.scalars().all()

    # Alertas no leídas
    alerts_result = await db.execute(
        select(func.count(HealthAlert.id))
        .where(HealthAlert.client_id == client_id)
        .where(HealthAlert.is_read == False)
    )
    unread_alerts = alerts_result.scalar() or 0

    # Dispositivos conectados
    devices_result = await db.execute(
        select(ConnectedDevice)
        .where(ConnectedDevice.client_id == client_id)
        .where(ConnectedDevice.is_active == True)
    )
    connected_devices = devices_result.scalars().all()

    # Progreso de objetivos
    goals_result = await db.execute(
        select(ClientHealthGoals).where(ClientHealthGoals.client_id == client_id)
    )
    goals = goals_result.scalar_one_or_none()

    goals_progress = {}
    if today_summary and goals:
        goals_progress = {
            "steps": min(100, (today_summary.total_steps / goals.daily_steps_goal) * 100) if goals.daily_steps_goal else 0,
            "calories": min(100, (today_summary.total_calories_burned / goals.daily_calories_goal) * 100) if goals.daily_calories_goal else 0,
            "active_minutes": min(100, (today_summary.active_minutes / goals.daily_active_minutes_goal) * 100) if goals.daily_active_minutes_goal else 0,
            "sleep": min(100, ((today_summary.sleep_duration_minutes or 0) / goals.daily_sleep_goal_minutes) * 100) if goals.daily_sleep_goal_minutes else 0,
        }

    return ClientHealthDashboard(
        today_summary=today_summary,
        weekly_averages=weekly_averages,
        recent_activities=recent_activities,
        unread_alerts=unread_alerts,
        connected_devices=connected_devices,
        goals_progress=goals_progress,
    )
