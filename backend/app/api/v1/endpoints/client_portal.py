"""
Client Portal API endpoints.
These endpoints are accessible by clients to view/manage their own data.
All data is filtered to only show what belongs to the authenticated client.
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
import uuid as uuid_module
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from supabase import acreate_client

from app.core.database import get_db
from app.core.config import settings
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
    measured_at: str  # YYYY-MM-DD or ISO datetime
    weight_kg: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    muscle_mass_kg: Optional[float] = None
    measurements: Optional[dict] = None  # {chest, waist, hips, arms, thighs}
    notes: Optional[str] = None


class MeasurementResponse(BaseModel):
    """Measurement response."""
    id: UUID
    measured_at: Optional[datetime] = None
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
    # Force SQLAlchemy to detect changes by reassigning the entire dictionary
    current_adherence = dict(meal_plan.adherence) if meal_plan.adherence else {"logs": []}
    if "logs" not in current_adherence:
        current_adherence["logs"] = []
    
    current_adherence["logs"].append(log_entry)
    
    # Reassign to trigger SQLAlchemy change detection
    meal_plan.adherence = current_adherence
    
    # Debug: print to verify
    import logging
    logging.info(f"[NUTRITION LOG] Saving adherence with {len(current_adherence['logs'])} logs")
    
    # Commit changes
    await db.commit()
    await db.refresh(meal_plan)
    
    logging.info(f"[NUTRITION LOG] After refresh: {len(meal_plan.adherence.get('logs', []))} logs")
    
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
    
    # Parse measured_at to datetime
    measured_at_dt = None
    if data.measured_at:
        try:
            # Try ISO format first
            measured_at_dt = datetime.fromisoformat(data.measured_at.replace('Z', '+00:00'))
        except ValueError:
            try:
                # Try YYYY-MM-DD format
                measured_at_dt = datetime.strptime(data.measured_at, "%Y-%m-%d")
            except ValueError:
                # Default to now if parsing fails
                measured_at_dt = datetime.now()
    
    measurement = ClientMeasurement(
        client_id=client.id,
        measured_at=measured_at_dt,
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


@router.post("/progress/photos")
async def upload_progress_photo(
    file: UploadFile = File(...),
    photo_type: str = Query("front", description="Type: front, back, side"),
    notes: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a progress photo. Returns the photo URL."""
    client = await get_client_for_user(current_user.id, db)
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not allowed. Use JPEG, PNG, or WebP."
        )
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    unique_id = str(uuid_module.uuid4())
    filename = f"progress-photos/{client.id}/{unique_id}.{ext}"
    
    try:
        # Initialize Supabase client (async)
        supabase = await acreate_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        # Read file content
        content = await file.read()
        
        # Upload to Supabase Storage (async method)
        bucket_name = "progress-photos"
        try:
            upload_result = await supabase.storage.from_(bucket_name).upload(
                path=filename,
                file=content,
                file_options={"content-type": file.content_type, "upsert": "true"}
            )
        except Exception as upload_err:
            # If bucket doesn't exist or other error, try alternative approach
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Storage upload failed: {str(upload_err)}"
            )
        
        # Build public URL manually (sync, doesn't need await)
        public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{filename}"
        
        # Create a photo entry (stored in a measurement or separate)
        photo_data = {
            "url": public_url,
            "type": photo_type,
            "notes": notes,
            "uploaded_at": datetime.now().isoformat(),
            "filename": filename
        }
        
        # Get or create today's measurement to attach the photo
        # Use first() instead of scalar_one_or_none() to handle multiple measurements per day
        db_result = await db.execute(
            select(ClientMeasurement)
            .where(
                and_(
                    ClientMeasurement.client_id == client.id,
                    ClientMeasurement.measured_at >= datetime.combine(date.today(), datetime.min.time())
                )
            )
            .order_by(ClientMeasurement.measured_at.desc())
            .limit(1)
        )
        measurement = db_result.scalar_one_or_none()
        
        if measurement:
            # Append photo to existing measurement
            current_photos = list(measurement.photos or [])
            current_photos.append(photo_data)
            measurement.photos = current_photos
        else:
            # Create new measurement with just the photo
            measurement = ClientMeasurement(
                client_id=client.id,
                measured_at=datetime.now(),
                photos=[photo_data]
            )
            db.add(measurement)
        
        await db.commit()
        
        return {
            "success": True,
            "url": public_url,
            "photo": photo_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading photo: {str(e)}"
        )


@router.get("/progress/photos")
async def get_progress_photos(
    limit: int = Query(20, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all progress photos for the client."""
    client = await get_client_for_user(current_user.id, db)
    
    result = await db.execute(
        select(ClientMeasurement)
        .where(ClientMeasurement.client_id == client.id)
        .where(ClientMeasurement.photos != None)
        .order_by(desc(ClientMeasurement.measured_at))
        .limit(limit)
    )
    measurements = result.scalars().all()
    
    # Flatten all photos with their dates
    all_photos = []
    for m in measurements:
        if m.photos:
            for photo in m.photos:
                photo["measurement_date"] = m.measured_at.isoformat() if m.measured_at else None
                all_photos.append(photo)
    
    return all_photos


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


# ============ MESSAGES / CHAT ============

from app.models.message import (
    Conversation, Message, ConversationType, MessageType,
    MessageSource, MessageDirection, MessageStatus
)


class ClientMessageCreate(BaseModel):
    content: str
    message_type: str = "text"


class ClientMessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: Optional[UUID]
    source: str
    direction: str
    message_type: str
    content: Optional[str]
    external_status: str
    is_sent: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ClientConversationResponse(BaseModel):
    id: UUID
    trainer_name: Optional[str] = None
    trainer_avatar_url: Optional[str] = None
    last_message_at: Optional[datetime]
    last_message_preview: Optional[str]
    unread_count: int
    created_at: datetime


@router.get("/messages/conversation", response_model=ClientConversationResponse)
async def get_or_create_client_conversation(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get or create the client's conversation with their trainer.
    Clients only have one conversation - with their assigned trainer/workspace.
    """
    client = await get_client_for_user(current_user.id, db)
    
    # Try to find existing conversation
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.client_id == client.id,
                Conversation.workspace_id == client.workspace_id
            )
        )
    )
    conversation = result.scalar_one_or_none()
    
    # Create if doesn't exist
    if not conversation:
        conversation = Conversation(
            workspace_id=client.workspace_id,
            client_id=client.id,
            name=f"Chat con {client.full_name}",
            conversation_type='direct',
            participant_ids=[current_user.id],
            preferred_channel='platform',
            unread_count=0
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
    
    # Get trainer info (the one who created the client)
    from app.models.user import User
    trainer_name = None
    trainer_avatar = None
    if client.created_by:
        trainer_result = await db.execute(
            select(User).where(User.id == client.created_by)
        )
        trainer = trainer_result.scalar_one_or_none()
        if trainer:
            trainer_name = trainer.full_name
            trainer_avatar = trainer.avatar_url
    
    return ClientConversationResponse(
        id=conversation.id,
        trainer_name=trainer_name or "Tu Entrenador",
        trainer_avatar_url=trainer_avatar,
        last_message_at=conversation.last_message_at,
        last_message_preview=conversation.last_message_preview,
        unread_count=conversation.unread_count or 0,
        created_at=conversation.created_at
    )


@router.get("/messages", response_model=List[ClientMessageResponse])
async def get_client_messages(
    limit: int = Query(50, le=200),
    before: Optional[datetime] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get messages for the client's conversation."""
    client = await get_client_for_user(current_user.id, db)
    
    # Get client's conversation
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.client_id == client.id,
                Conversation.workspace_id == client.workspace_id
            )
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        return []
    
    # Get messages
    query = select(Message).where(
        and_(
            Message.conversation_id == conversation.id,
            Message.is_deleted == False
        )
    )
    
    if before:
        query = query.where(Message.created_at < before)
    
    result = await db.execute(
        query.order_by(desc(Message.created_at)).limit(limit)
    )
    messages = result.scalars().all()
    
    # Return in chronological order
    return [
        ClientMessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            source=str(m.source) if m.source else "platform",
            direction=str(m.direction) if m.direction else "outbound",
            message_type=str(m.message_type) if m.message_type else "text",
            content=m.content,
            external_status=str(m.external_status) if m.external_status else "sent",
            is_sent=m.is_sent,
            created_at=m.created_at
        )
        for m in reversed(messages)
    ]


@router.post("/messages", response_model=ClientMessageResponse)
async def send_client_message(
    data: ClientMessageCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a message from client to trainer."""
    client = await get_client_for_user(current_user.id, db)
    
    # Get or create conversation
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.client_id == client.id,
                Conversation.workspace_id == client.workspace_id
            )
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        conversation = Conversation(
            workspace_id=client.workspace_id,
            client_id=client.id,
            name=f"Chat con {client.full_name}",
            conversation_type='direct',
            participant_ids=[current_user.id],
            preferred_channel='platform',
            unread_count=0
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
    
    # Create message
    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        source='platform',
        direction='inbound',  # From client's perspective, it's inbound to trainer
        message_type='text',
        content=data.content,
        external_status='sent',
        is_sent=True
    )
    db.add(message)
    
    # Update conversation
    conversation.last_message_at = datetime.now()
    conversation.last_message_preview = data.content[:100] if data.content else None
    conversation.last_message_source = 'platform'
    conversation.unread_count = (conversation.unread_count or 0) + 1
    
    await db.commit()
    await db.refresh(message)
    
    return ClientMessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        source=str(message.source) if message.source else "platform",
        direction=str(message.direction) if message.direction else "outbound",
        message_type=str(message.message_type) if message.message_type else "text",
        content=message.content,
        external_status=str(message.external_status) if message.external_status else "sent",
        is_sent=message.is_sent,
        created_at=message.created_at
    )


@router.post("/messages/mark-read")
async def mark_client_messages_read(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark all messages in client's conversation as read."""
    client = await get_client_for_user(current_user.id, db)
    
    # Get conversation
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.client_id == client.id,
                Conversation.workspace_id == client.workspace_id
            )
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        return {"success": True, "marked_count": 0}
    
    # For client, we reset unread_count to 0 (messages from trainer are now read)
    # Note: This is simplified - in a real app you'd track read status per-user
    # For now, we'll just reset the count as the client views the chat
    old_count = conversation.unread_count or 0
    conversation.unread_count = 0
    
    await db.commit()
    
    return {"success": True, "marked_count": old_count}


@router.get("/messages/unread-count")
async def get_client_unread_count(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get unread message count for the client."""
    client = await get_client_for_user(current_user.id, db)
    
    # Get conversation
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.client_id == client.id,
                Conversation.workspace_id == client.workspace_id
            )
        )
    )
    conversation = result.scalar_one_or_none()
    
    # Count unread messages (messages from trainer that client hasn't read)
    # For simplicity, we track unread at conversation level
    # In this context, unread for client = messages from trainer not yet viewed
    if not conversation:
        return {"unread_count": 0}
    
    # The unread_count in conversation tracks trainer's perspective
    # For client, we need to count outbound messages not read by client
    result = await db.execute(
        select(func.count(Message.id)).where(
            and_(
                Message.conversation_id == conversation.id,
                Message.direction == MessageDirection.OUTBOUND,  # From trainer
                Message.is_deleted == False,
                ~Message.read_by.contains([current_user.id])  # Not read by this user
            )
        )
    )
    count = result.scalar() or 0
    
    return {"unread_count": count}


# ============ FEEDBACK SCHEMAS ============

class ClientFeedbackCreate(BaseModel):
    """Create feedback for a specific item."""
    feedback_type: str  # 'exercise', 'meal', 'workout_program', 'meal_plan'
    reference_id: Optional[UUID] = None
    reference_name: Optional[str] = None
    rating: Optional[int] = None
    comment: Optional[str] = None
    context: Optional[dict] = {}


class ClientFeedbackResponse(BaseModel):
    """Feedback response."""
    id: UUID
    feedback_type: str
    reference_id: Optional[UUID] = None
    reference_name: Optional[str] = None
    rating: Optional[int] = None
    comment: Optional[str] = None
    context: dict = {}
    created_at: datetime
    
    class Config:
        from_attributes = True


class ClientWorkoutFeedbackCreate(BaseModel):
    """Create overall feedback for a workout program."""
    program_id: UUID
    overall_rating: int
    difficulty_rating: Optional[int] = None
    enjoyment_rating: Optional[int] = None
    effectiveness_rating: Optional[int] = None
    what_liked: Optional[str] = None
    what_improve: Optional[str] = None
    general_comment: Optional[str] = None


class ClientDietFeedbackCreate(BaseModel):
    """Create overall feedback for a meal plan."""
    meal_plan_id: UUID
    overall_rating: int
    taste_rating: Optional[int] = None
    satiety_rating: Optional[int] = None
    variety_rating: Optional[int] = None
    practicality_rating: Optional[int] = None
    favorite_meals: Optional[str] = None
    disliked_meals: Optional[str] = None
    general_comment: Optional[str] = None
    adherence_percentage: Optional[int] = None


class ClientEmotionCreate(BaseModel):
    """Create emotion/mood log."""
    emotion_date: date
    mood_level: int  # 1-5
    emotions: Optional[List[str]] = []
    energy_level: Optional[int] = None
    sleep_quality: Optional[int] = None
    stress_level: Optional[int] = None
    notes: Optional[str] = None
    context: Optional[dict] = {}


class ClientEmotionResponse(BaseModel):
    """Emotion log response."""
    id: UUID
    emotion_date: date
    mood_level: int
    emotions: List[str] = []
    energy_level: Optional[int] = None
    sleep_quality: Optional[int] = None
    stress_level: Optional[int] = None
    notes: Optional[str] = None
    context: dict = {}
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ FEEDBACK ENDPOINTS ============

@router.post("/feedback", response_model=ClientFeedbackResponse)
async def create_client_feedback(
    data: ClientFeedbackCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create feedback for a specific exercise, meal, workout or diet."""
    from app.models.feedback import ClientFeedback
    
    client = await get_client_for_user(current_user.id, db)
    
    feedback = ClientFeedback(
        workspace_id=client.workspace_id,
        client_id=client.id,
        feedback_type=data.feedback_type,
        reference_id=data.reference_id,
        reference_name=data.reference_name,
        rating=data.rating,
        comment=data.comment,
        context=data.context or {}
    )
    
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    
    return feedback


@router.get("/feedback", response_model=List[ClientFeedbackResponse])
async def get_client_feedback(
    feedback_type: Optional[str] = None,
    limit: int = Query(50, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get client's feedback history."""
    from app.models.feedback import ClientFeedback
    
    client = await get_client_for_user(current_user.id, db)
    
    query = select(ClientFeedback).where(ClientFeedback.client_id == client.id)
    
    if feedback_type:
        query = query.where(ClientFeedback.feedback_type == feedback_type)
    
    result = await db.execute(
        query.order_by(desc(ClientFeedback.created_at)).limit(limit)
    )
    
    return result.scalars().all()


@router.post("/feedback/workout-program")
async def create_workout_program_feedback(
    data: ClientWorkoutFeedbackCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create overall feedback for a complete workout program."""
    from app.models.feedback import ClientWorkoutFeedback
    
    client = await get_client_for_user(current_user.id, db)
    
    feedback = ClientWorkoutFeedback(
        workspace_id=client.workspace_id,
        client_id=client.id,
        program_id=data.program_id,
        overall_rating=data.overall_rating,
        difficulty_rating=data.difficulty_rating,
        enjoyment_rating=data.enjoyment_rating,
        effectiveness_rating=data.effectiveness_rating,
        what_liked=data.what_liked,
        what_improve=data.what_improve,
        general_comment=data.general_comment
    )
    
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    
    return {
        "id": str(feedback.id),
        "overall_rating": feedback.overall_rating,
        "created_at": feedback.created_at
    }


@router.post("/feedback/diet")
async def create_diet_feedback(
    data: ClientDietFeedbackCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create overall feedback for a complete meal plan / diet."""
    from app.models.feedback import ClientDietFeedback
    
    client = await get_client_for_user(current_user.id, db)
    
    feedback = ClientDietFeedback(
        workspace_id=client.workspace_id,
        client_id=client.id,
        meal_plan_id=data.meal_plan_id,
        overall_rating=data.overall_rating,
        taste_rating=data.taste_rating,
        satiety_rating=data.satiety_rating,
        variety_rating=data.variety_rating,
        practicality_rating=data.practicality_rating,
        favorite_meals=data.favorite_meals,
        disliked_meals=data.disliked_meals,
        general_comment=data.general_comment,
        adherence_percentage=data.adherence_percentage
    )
    
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    
    return {
        "id": str(feedback.id),
        "overall_rating": feedback.overall_rating,
        "created_at": feedback.created_at
    }


# ============ EMOTIONS ENDPOINTS ============

@router.post("/emotions", response_model=ClientEmotionResponse)
async def create_client_emotion(
    data: ClientEmotionCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Log client's daily mood/emotion."""
    from app.models.feedback import ClientEmotion
    
    client = await get_client_for_user(current_user.id, db)
    
    # Check if already logged for this date
    existing = await db.execute(
        select(ClientEmotion).where(
            and_(
                ClientEmotion.client_id == client.id,
                ClientEmotion.emotion_date == data.emotion_date
            )
        )
    )
    existing_emotion = existing.scalar_one_or_none()
    
    if existing_emotion:
        # Update existing
        existing_emotion.mood_level = data.mood_level
        existing_emotion.emotions = data.emotions or []
        existing_emotion.energy_level = data.energy_level
        existing_emotion.sleep_quality = data.sleep_quality
        existing_emotion.stress_level = data.stress_level
        existing_emotion.notes = data.notes
        existing_emotion.context = data.context or {}
        await db.commit()
        await db.refresh(existing_emotion)
        return existing_emotion
    
    # Create new
    emotion = ClientEmotion(
        workspace_id=client.workspace_id,
        client_id=client.id,
        emotion_date=data.emotion_date,
        mood_level=data.mood_level,
        emotions=data.emotions or [],
        energy_level=data.energy_level,
        sleep_quality=data.sleep_quality,
        stress_level=data.stress_level,
        notes=data.notes,
        context=data.context or {}
    )
    
    db.add(emotion)
    await db.commit()
    await db.refresh(emotion)
    
    return emotion


@router.get("/emotions", response_model=List[ClientEmotionResponse])
async def get_client_emotions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(30, le=365),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get client's emotion/mood history."""
    from app.models.feedback import ClientEmotion
    
    client = await get_client_for_user(current_user.id, db)
    
    query = select(ClientEmotion).where(ClientEmotion.client_id == client.id)
    
    if start_date:
        query = query.where(ClientEmotion.emotion_date >= start_date)
    if end_date:
        query = query.where(ClientEmotion.emotion_date <= end_date)
    
    result = await db.execute(
        query.order_by(desc(ClientEmotion.emotion_date)).limit(limit)
    )
    
    return result.scalars().all()


@router.get("/emotions/today", response_model=Optional[ClientEmotionResponse])
async def get_today_emotion(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get client's emotion for today."""
    from app.models.feedback import ClientEmotion
    from datetime import date as date_type
    
    client = await get_client_for_user(current_user.id, db)
    today = date_type.today()
    
    result = await db.execute(
        select(ClientEmotion).where(
            and_(
                ClientEmotion.client_id == client.id,
                ClientEmotion.emotion_date == today
            )
        )
    )
    
    return result.scalar_one_or_none()
