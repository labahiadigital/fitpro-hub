"""
Client Portal API endpoints.
These endpoints are accessible by clients to view/manage their own data.
All data is filtered to only show what belongs to the authenticated client.
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.database import get_db
from app.models.client import Client
from app.models.workout import WorkoutProgram, WorkoutLog
from app.models.nutrition import MealPlan
from app.models.exercise import ClientMeasurement
from app.models.booking import Booking
from app.middleware.auth import get_current_user, CurrentUser
from app.models.user import RoleType

router = APIRouter()


# ============ HELPER FUNCTIONS ============

async def get_client_for_user(user_id: UUID, db: AsyncSession) -> Client:
    """Get the client record linked to a user account."""
    result = await db.execute(
        select(Client).where(Client.user_id == user_id)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró perfil de cliente para este usuario"
        )
    return client


# ============ SCHEMAS ============

class ClientDashboardResponse(BaseModel):
    """Dashboard data for client portal."""
    client_id: UUID
    full_name: str
    next_session: Optional[dict] = None
    week_progress: dict
    nutrition_today: dict
    goals: dict
    recent_activity: List[dict]
    upcoming_sessions: List[dict]


class ClientProfileResponse(BaseModel):
    """Client profile data."""
    id: UUID
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    height_cm: Optional[str] = None
    weight_kg: Optional[str] = None
    goals: Optional[str] = None
    health_data: dict = {}
    
    class Config:
        from_attributes = True


class ClientProfileUpdate(BaseModel):
    """Update client profile."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class WorkoutProgramClientResponse(BaseModel):
    """Workout program as seen by client."""
    id: UUID
    name: str
    description: Optional[str] = None
    duration_weeks: Optional[int] = None
    difficulty: Optional[str] = None
    template: Optional[dict] = None
    tags: Optional[List[str]] = []
    created_at: datetime
    
    class Config:
        from_attributes = True


class WorkoutLogCreate(BaseModel):
    """Create workout log."""
    program_id: UUID
    log: dict  # Exercise data, sets, reps, weights, etc.
    completed_at: Optional[str] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None


class WorkoutLogResponse(BaseModel):
    """Workout log response."""
    id: UUID
    program_id: UUID
    log: dict
    created_at: datetime
    
    class Config:
        from_attributes = True


class MealPlanClientResponse(BaseModel):
    """Meal plan as seen by client."""
    id: UUID
    name: str
    description: Optional[str] = None
    target_calories: Optional[float] = None
    target_protein: Optional[float] = None
    target_carbs: Optional[float] = None
    target_fat: Optional[float] = None
    meal_times: Optional[dict] = None
    plan: Optional[dict] = None
    adherence: Optional[dict] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class NutritionLogCreate(BaseModel):
    """Log daily nutrition intake."""
    date: str  # YYYY-MM-DD
    meal_name: str  # Name of the meal (from meal_times)
    foods: List[dict]  # [{name, calories, protein, carbs, fat, quantity, food_id}]
    notes: Optional[str] = None


class NutritionLogResponse(BaseModel):
    """Nutrition log response (stored in MealPlan.adherence)."""
    date: str
    meal_name: str
    foods: List[dict]
    total_calories: int
    total_protein: float
    total_carbs: float
    total_fat: float
    notes: Optional[str] = None


class MeasurementCreate(BaseModel):
    """Create body measurement."""
    measured_at: str  # YYYY-MM-DD
    weight_kg: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    muscle_mass_kg: Optional[float] = None
    measurements: Optional[dict] = None  # {chest, waist, hips, arms, thighs}
    notes: Optional[str] = None


class MeasurementResponse(BaseModel):
    """Measurement response."""
    id: UUID
    measured_at: str
    weight_kg: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    muscle_mass_kg: Optional[float] = None
    measurements: dict = {}
    photos: List[dict] = []
    notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class BookingClientResponse(BaseModel):
    """Booking as seen by client."""
    id: UUID
    title: str
    description: Optional[str] = None
    start_time: str
    end_time: str
    status: str
    booking_type: Optional[str] = None
    location: Optional[str] = None
    online_link: Optional[str] = None
    
    class Config:
        from_attributes = True




# ============ DASHBOARD ============

@router.get("/dashboard", response_model=ClientDashboardResponse)
async def get_client_dashboard(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get dashboard data for the authenticated client.
    """
    client = await get_client_for_user(current_user.id, db)
    
    # Get upcoming bookings
    upcoming_bookings_result = await db.execute(
        select(Booking)
        .where(
            Booking.client_id == client.id,
            Booking.status.in_(["confirmed", "pending"])
        )
        .order_by(Booking.start_time)
        .limit(5)
    )
    upcoming_bookings = upcoming_bookings_result.scalars().all()
    
    # Get workout logs for this week
    week_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    logs_result = await db.execute(
        select(WorkoutLog)
        .where(
            WorkoutLog.client_id == client.id,
            WorkoutLog.created_at >= week_start
        )
    )
    week_logs = logs_result.scalars().all()
    
    # Get assigned programs count
    programs_result = await db.execute(
        select(WorkoutProgram)
        .where(
            WorkoutProgram.client_id == client.id,
            WorkoutProgram.is_template == False
        )
    )
    assigned_programs = programs_result.scalars().all()
    
    # Get active meal plan
    meal_plan_result = await db.execute(
        select(MealPlan)
        .where(MealPlan.client_id == client.id)
        .order_by(desc(MealPlan.created_at))
        .limit(1)
    )
    active_meal_plan = meal_plan_result.scalar_one_or_none()
    
    # Calculate nutrition totals from adherence logs
    today = date.today().isoformat()
    nutrition_totals = {
        "calories": {"current": 0, "target": float(active_meal_plan.target_calories or 2000) if active_meal_plan else 2000},
        "protein": {"current": 0, "target": float(active_meal_plan.target_protein or 140) if active_meal_plan else 140},
        "carbs": {"current": 0, "target": float(active_meal_plan.target_carbs or 250) if active_meal_plan else 250},
        "fats": {"current": 0, "target": float(active_meal_plan.target_fat or 70) if active_meal_plan else 70},
    }
    
    # Get today's logs from adherence
    if active_meal_plan and active_meal_plan.adherence:
        logs = active_meal_plan.adherence.get("logs", [])
        for log in logs:
            if log.get("date") == today:
                nutrition_totals["calories"]["current"] += log.get("total_calories", 0)
                nutrition_totals["protein"]["current"] += log.get("total_protein", 0)
                nutrition_totals["carbs"]["current"] += log.get("total_carbs", 0)
                nutrition_totals["fats"]["current"] += log.get("total_fat", 0)
    
    # Format next session
    next_session = None
    if upcoming_bookings:
        booking = upcoming_bookings[0]
        next_session = {
            "id": str(booking.id),
            "title": booking.title,
            "date": booking.start_time,
            "type": booking.booking_type or "session",
            "location": booking.location,
        }
    
    # Format upcoming sessions
    upcoming_sessions = [
        {
            "id": str(b.id),
            "date": b.start_time,
            "type": b.title,
            "duration": "60 min",
            "status": b.status,
        }
        for b in upcoming_bookings
    ]
    
    return ClientDashboardResponse(
        client_id=client.id,
        full_name=client.full_name,
        next_session=next_session,
        week_progress={
            "workouts_completed": len(week_logs),
            "workouts_total": len(assigned_programs) * 4 if assigned_programs else 4,
            "calories_burned": sum(log.log.get("calories_burned", 0) for log in week_logs if log.log),
        },
        nutrition_today=nutrition_totals,
        goals={
            "primary": client.goals or "Sin objetivo definido",
            "progress": 35,  # TODO: Calculate from measurements
            "start_weight": float(client.weight_kg) if client.weight_kg else 0,
            "current_weight": float(client.weight_kg) if client.weight_kg else 0,
            "target_weight": client.health_data.get("goal_weight_kg", 0) if client.health_data else 0,
        },
        recent_activity=[],  # TODO: Implement activity feed
        upcoming_sessions=upcoming_sessions,
    )


# ============ PROFILE ============

@router.get("/profile", response_model=ClientProfileResponse)
async def get_client_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get client's own profile."""
    client = await get_client_for_user(current_user.id, db)
    return client


@router.put("/profile", response_model=ClientProfileResponse)
async def update_client_profile(
    data: ClientProfileUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update client's own profile."""
    client = await get_client_for_user(current_user.id, db)
    
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(client, field, value)
    
    await db.commit()
    await db.refresh(client)
    return client


# ============ WORKOUTS ============

@router.get("/workouts", response_model=List[WorkoutProgramClientResponse])
async def get_my_workouts(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all workout programs assigned to the client."""
    client = await get_client_for_user(current_user.id, db)
    
    result = await db.execute(
        select(WorkoutProgram)
        .where(
            WorkoutProgram.client_id == client.id,
            WorkoutProgram.is_template == False
        )
        .order_by(desc(WorkoutProgram.created_at))
    )
    return result.scalars().all()


@router.get("/workouts/{program_id}", response_model=WorkoutProgramClientResponse)
async def get_my_workout(
    program_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific workout program."""
    client = await get_client_for_user(current_user.id, db)
    
    result = await db.execute(
        select(WorkoutProgram)
        .where(
            WorkoutProgram.id == program_id,
            WorkoutProgram.client_id == client.id
        )
    )
    program = result.scalar_one_or_none()
    
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Programa no encontrado"
        )
    return program


@router.post("/workouts/logs", response_model=WorkoutLogResponse, status_code=status.HTTP_201_CREATED)
async def log_workout(
    data: WorkoutLogCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Log a completed workout."""
    client = await get_client_for_user(current_user.id, db)
    
    # Verify the program belongs to this client
    result = await db.execute(
        select(WorkoutProgram)
        .where(
            WorkoutProgram.id == data.program_id,
            WorkoutProgram.client_id == client.id
        )
    )
    program = result.scalar_one_or_none()
    
    if not program:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este programa"
        )
    
    log = WorkoutLog(
        program_id=data.program_id,
        client_id=client.id,
        log=data.log
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


@router.get("/workouts/logs/history", response_model=List[WorkoutLogResponse])
async def get_workout_history(
    limit: int = Query(20, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get workout history for the client."""
    client = await get_client_for_user(current_user.id, db)
    
    result = await db.execute(
        select(WorkoutLog)
        .where(WorkoutLog.client_id == client.id)
        .order_by(desc(WorkoutLog.created_at))
        .limit(limit)
    )
    return result.scalars().all()


# ============ NUTRITION ============

@router.get("/nutrition/plan", response_model=Optional[MealPlanClientResponse])
async def get_my_meal_plan(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the active meal plan for the client."""
    client = await get_client_for_user(current_user.id, db)
    
    result = await db.execute(
        select(MealPlan)
        .where(MealPlan.client_id == client.id)
        .order_by(desc(MealPlan.created_at))
        .limit(1)
    )
    return result.scalar_one_or_none()


@router.get("/nutrition/plans", response_model=List[MealPlanClientResponse])
async def get_all_meal_plans(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all meal plans for the client."""
    client = await get_client_for_user(current_user.id, db)
    
    result = await db.execute(
        select(MealPlan)
        .where(MealPlan.client_id == client.id)
        .order_by(desc(MealPlan.created_at))
    )
    return result.scalars().all()


@router.post("/nutrition/logs", response_model=NutritionLogResponse, status_code=status.HTTP_201_CREATED)
async def log_nutrition(
    data: NutritionLogCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Log food intake. Stores in the active meal plan's adherence field."""
    client = await get_client_for_user(current_user.id, db)
    
    # Get active meal plan
    result = await db.execute(
        select(MealPlan)
        .where(MealPlan.client_id == client.id)
        .order_by(desc(MealPlan.created_at))
        .limit(1)
    )
    meal_plan = result.scalar_one_or_none()
    
    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes un plan nutricional asignado"
        )
    
    # Calculate totals from foods
    total_calories = sum(f.get("calories", 0) * f.get("quantity", 1) for f in data.foods)
    total_protein = sum(f.get("protein", 0) * f.get("quantity", 1) for f in data.foods)
    total_carbs = sum(f.get("carbs", 0) * f.get("quantity", 1) for f in data.foods)
    total_fat = sum(f.get("fat", 0) * f.get("quantity", 1) for f in data.foods)
    
    # Create log entry
    log_entry = {
        "date": data.date,
        "meal_name": data.meal_name,
        "foods": data.foods,
        "total_calories": int(total_calories),
        "total_protein": round(total_protein, 1),
        "total_carbs": round(total_carbs, 1),
        "total_fat": round(total_fat, 1),
        "notes": data.notes,
        "logged_at": datetime.now().isoformat()
    }
    
    # Update adherence in meal plan
    adherence = meal_plan.adherence or {"logs": []}
    if "logs" not in adherence:
        adherence["logs"] = []
    adherence["logs"].append(log_entry)
    meal_plan.adherence = adherence
    
    await db.commit()
    
    return NutritionLogResponse(
        date=data.date,
        meal_name=data.meal_name,
        foods=data.foods,
        total_calories=int(total_calories),
        total_protein=round(total_protein, 1),
        total_carbs=round(total_carbs, 1),
        total_fat=round(total_fat, 1),
        notes=data.notes
    )


@router.get("/nutrition/logs", response_model=List[NutritionLogResponse])
async def get_nutrition_logs(
    date_filter: Optional[str] = Query(None, alias="date"),
    limit: int = Query(20, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get nutrition logs from the meal plan adherence."""
    client = await get_client_for_user(current_user.id, db)
    
    # Get active meal plan
    result = await db.execute(
        select(MealPlan)
        .where(MealPlan.client_id == client.id)
        .order_by(desc(MealPlan.created_at))
        .limit(1)
    )
    meal_plan = result.scalar_one_or_none()
    
    if not meal_plan or not meal_plan.adherence:
        return []
    
    logs = meal_plan.adherence.get("logs", [])
    
    # Filter by date if provided
    if date_filter:
        logs = [l for l in logs if l.get("date") == date_filter]
    
    # Sort by date descending and limit
    logs = sorted(logs, key=lambda x: x.get("logged_at", ""), reverse=True)[:limit]
    
    return [
        NutritionLogResponse(
            date=log.get("date", ""),
            meal_name=log.get("meal_name", ""),
            foods=log.get("foods", []),
            total_calories=log.get("total_calories", 0),
            total_protein=log.get("total_protein", 0),
            total_carbs=log.get("total_carbs", 0),
            total_fat=log.get("total_fat", 0),
            notes=log.get("notes")
        )
        for log in logs
    ]


@router.delete("/nutrition/logs/{log_index}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_nutrition_log(
    log_index: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a nutrition log by index."""
    client = await get_client_for_user(current_user.id, db)
    
    result = await db.execute(
        select(MealPlan)
        .where(MealPlan.client_id == client.id)
        .order_by(desc(MealPlan.created_at))
        .limit(1)
    )
    meal_plan = result.scalar_one_or_none()
    
    if not meal_plan or not meal_plan.adherence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró el registro"
        )
    
    logs = meal_plan.adherence.get("logs", [])
    
    if log_index < 0 or log_index >= len(logs):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro no encontrado"
        )
    
    logs.pop(log_index)
    meal_plan.adherence = {"logs": logs}
    await db.commit()


# ============ PROGRESS / MEASUREMENTS ============

@router.get("/progress/measurements", response_model=List[MeasurementResponse])
async def get_measurements(
    limit: int = Query(20, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get body measurements history."""
    client = await get_client_for_user(current_user.id, db)
    
    result = await db.execute(
        select(ClientMeasurement)
        .where(ClientMeasurement.client_id == client.id)
        .order_by(desc(ClientMeasurement.measured_at))
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/progress/measurements", response_model=MeasurementResponse, status_code=status.HTTP_201_CREATED)
async def create_measurement(
    data: MeasurementCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Record body measurement."""
    client = await get_client_for_user(current_user.id, db)
    
    measurement = ClientMeasurement(
        client_id=client.id,
        measured_at=data.measured_at,
        weight_kg=data.weight_kg,
        body_fat_percentage=data.body_fat_percentage,
        muscle_mass_kg=data.muscle_mass_kg,
        measurements=data.measurements or {},
        notes=data.notes
    )
    db.add(measurement)
    await db.commit()
    await db.refresh(measurement)
    
    # Update client's current weight if provided
    if data.weight_kg:
        client.weight_kg = str(data.weight_kg)
        await db.commit()
    
    return measurement


@router.get("/progress/summary")
async def get_progress_summary(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get progress summary including stats and goals."""
    client = await get_client_for_user(current_user.id, db)
    
    # Get latest and first measurements
    result = await db.execute(
        select(ClientMeasurement)
        .where(ClientMeasurement.client_id == client.id)
        .order_by(desc(ClientMeasurement.measured_at))
    )
    measurements = result.scalars().all()
    
    latest = measurements[0] if measurements else None
    first = measurements[-1] if measurements else None
    
    return {
        "current_stats": {
            "weight": float(latest.weight_kg) if latest and latest.weight_kg else float(client.weight_kg or 0),
            "body_fat": float(latest.body_fat_percentage) if latest and latest.body_fat_percentage else None,
            "muscle_mass": float(latest.muscle_mass_kg) if latest and latest.muscle_mass_kg else None,
        },
        "start_stats": {
            "weight": float(first.weight_kg) if first and first.weight_kg else float(client.weight_kg or 0),
            "body_fat": float(first.body_fat_percentage) if first and first.body_fat_percentage else None,
            "muscle_mass": float(first.muscle_mass_kg) if first and first.muscle_mass_kg else None,
        },
        "target_stats": {
            "weight": client.health_data.get("goal_weight_kg") if client.health_data else None,
            "body_fat": client.health_data.get("goal_body_fat") if client.health_data else None,
            "muscle_mass": client.health_data.get("goal_muscle_mass") if client.health_data else None,
        },
        "measurements_count": len(measurements),
        "goals": client.goals,
    }


# ============ CALENDAR / BOOKINGS ============

@router.get("/calendar/bookings", response_model=List[BookingClientResponse])
async def get_my_bookings(
    status: Optional[str] = None,
    upcoming_only: bool = True,
    limit: int = Query(20, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get bookings for the client."""
    client = await get_client_for_user(current_user.id, db)
    
    query = select(Booking).where(Booking.client_id == client.id)
    
    if status:
        query = query.where(Booking.status == status)
    
    if upcoming_only:
        now = datetime.now().isoformat()
        query = query.where(Booking.start_time >= now)
    
    result = await db.execute(
        query.order_by(Booking.start_time).limit(limit)
    )
    return result.scalars().all()


@router.get("/calendar/bookings/{booking_id}", response_model=BookingClientResponse)
async def get_booking_detail(
    booking_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get details of a specific booking."""
    client = await get_client_for_user(current_user.id, db)
    
    result = await db.execute(
        select(Booking)
        .where(
            Booking.id == booking_id,
            Booking.client_id == client.id
        )
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cita no encontrada"
        )
    return booking


# NOTE: Documents endpoint removed - documents table does not exist yet
# TODO: Implement when documents table is created
