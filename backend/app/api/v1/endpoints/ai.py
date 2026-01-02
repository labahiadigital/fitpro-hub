"""
Endpoints de la API para generación con IA
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_workspace
from app.models.client import Client
from app.services.ai_generator import AIGenerationRequest, AIGeneratorService

router = APIRouter()


# =====================================================
# SCHEMAS
# =====================================================

class AIConfigurationBase(BaseModel):
    provider: str = "openai"
    api_key: Optional[str] = None
    workout_model: str = "gpt-4o"
    nutrition_model: str = "gpt-4o"
    chat_model: str = "gpt-4o-mini"
    monthly_tokens_limit: int = 1000000
    default_language: str = "es"
    include_explanations: bool = True
    adaptation_level: str = "moderate"


class AIConfigurationResponse(AIConfigurationBase):
    id: UUID
    workspace_id: UUID
    tokens_used_this_month: int
    is_active: bool
    last_used_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GenerateWorkoutRequest(BaseModel):
    client_id: Optional[UUID] = None
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    experience_level: str = "intermediate"
    goal: str = "Mejorar condición física"
    days_per_week: int = 4
    session_duration: int = 60
    equipment: List[str] = Field(default_factory=lambda: ["Gimnasio completo"])
    injuries: List[str] = Field(default_factory=list)
    preferences: Optional[str] = None


class GenerateMealPlanRequest(BaseModel):
    client_id: Optional[UUID] = None
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    target_weight: Optional[float] = None
    goal: str = "Mantener peso"
    activity_level: str = "moderate"
    target_calories: int = 2000
    allergies: List[str] = Field(default_factory=list)
    intolerances: List[str] = Field(default_factory=list)
    food_preferences: Optional[str] = None
    meals_per_day: int = 5


class AnalyzeProgressRequest(BaseModel):
    client_id: UUID
    include_recommendations: bool = True


class GenerationResponse(BaseModel):
    success: bool
    content: Optional[Dict[str, Any]] = None
    tokens_used: int = 0
    generation_time_ms: int = 0
    error: Optional[str] = None


class AIUsageStats(BaseModel):
    total_generations: int
    tokens_used_this_month: int
    tokens_remaining: int
    generations_by_type: Dict[str, int]
    average_generation_time_ms: float


# =====================================================
# CONFIGURACIÓN DE IA
# =====================================================

@router.get("/configuration", response_model=Optional[AIConfigurationResponse])
async def get_ai_configuration(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Obtener configuración de IA del workspace"""
    result = await db.execute(
        select("*").select_from(db.get_bind().dialect.identifier_preparer.quote("ai_configurations"))
        .where("workspace_id" == current_user.workspace_id)
    )
    # Simplificado - en producción usar modelo SQLAlchemy
    return None


@router.post("/configuration", response_model=Dict[str, str])
async def configure_ai(
    config: AIConfigurationBase,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Configurar integración de IA"""
    # En producción, guardar en base de datos
    return {"message": "Configuración guardada correctamente"}


# =====================================================
# GENERACIÓN DE PLANES
# =====================================================

@router.post("/generate/workout", response_model=GenerationResponse)
async def generate_workout_plan(
    request: GenerateWorkoutRequest,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Generar plan de entrenamiento con IA"""
    # Obtener datos del cliente si se proporciona ID
    client_data = {}

    if request.client_id:
        result = await db.execute(
            select(Client).where(Client.id == request.client_id)
        )
        client = result.scalar_one_or_none()

        if client:
            client_data = {
                "name": f"{client.first_name} {client.last_name}",
                "age": _calculate_age(client.birth_date) if client.birth_date else request.age,
                "gender": client.gender or request.gender,
                "weight": client.weight_kg or request.weight,
                "height": client.height_cm or request.height,
                "injuries": client.health_data.get("injuries", []) if client.health_data else request.injuries,
            }

    # Combinar con datos de la solicitud
    client_data.update({
        "name": client_data.get("name") or request.name or "Cliente",
        "age": client_data.get("age") or request.age,
        "gender": client_data.get("gender") or request.gender,
        "weight": client_data.get("weight") or request.weight,
        "height": client_data.get("height") or request.height,
        "experience_level": request.experience_level,
        "goal": request.goal,
        "days_per_week": request.days_per_week,
        "session_duration": request.session_duration,
        "equipment": request.equipment,
        "injuries": client_data.get("injuries") or request.injuries,
        "preferences": request.preferences,
    })

    # Obtener API key (en producción, de la configuración del workspace)
    # Por ahora usamos variable de entorno
    import os
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="API key de IA no configurada. Configure la integración en Ajustes > IA."
        )

    # Generar plan
    ai_service = AIGeneratorService(api_key=api_key, provider="openai")
    result = await ai_service.generate_workout_plan(client_data)

    if not result.success:
        raise HTTPException(status_code=500, detail=result.error)

    return GenerationResponse(
        success=True,
        content=result.content,
        tokens_used=result.tokens_input + result.tokens_output,
        generation_time_ms=result.generation_time_ms,
    )


@router.post("/generate/meal-plan", response_model=GenerationResponse)
async def generate_meal_plan(
    request: GenerateMealPlanRequest,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Generar plan nutricional con IA"""
    # Obtener datos del cliente si se proporciona ID
    client_data = {}

    if request.client_id:
        result = await db.execute(
            select(Client).where(Client.id == request.client_id)
        )
        client = result.scalar_one_or_none()

        if client:
            client_data = {
                "name": f"{client.first_name} {client.last_name}",
                "age": _calculate_age(client.birth_date) if client.birth_date else request.age,
                "gender": client.gender or request.gender,
                "weight": client.weight_kg or request.weight,
                "height": client.height_cm or request.height,
                "allergies": client.allergies or request.allergies,
                "intolerances": client.intolerances or request.intolerances,
            }

    # Combinar con datos de la solicitud
    client_data.update({
        "name": client_data.get("name") or request.name or "Cliente",
        "age": client_data.get("age") or request.age,
        "gender": client_data.get("gender") or request.gender,
        "weight": client_data.get("weight") or request.weight,
        "height": client_data.get("height") or request.height,
        "target_weight": request.target_weight or client_data.get("weight"),
        "goal": request.goal,
        "activity_level": request.activity_level,
        "target_calories": request.target_calories,
        "allergies": client_data.get("allergies") or request.allergies,
        "intolerances": client_data.get("intolerances") or request.intolerances,
        "food_preferences": request.food_preferences,
        "meals_per_day": request.meals_per_day,
    })

    # Obtener API key
    import os
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="API key de IA no configurada. Configure la integración en Ajustes > IA."
        )

    # Generar plan
    ai_service = AIGeneratorService(api_key=api_key, provider="openai")
    result = await ai_service.generate_meal_plan(client_data)

    if not result.success:
        raise HTTPException(status_code=500, detail=result.error)

    return GenerationResponse(
        success=True,
        content=result.content,
        tokens_used=result.tokens_input + result.tokens_output,
        generation_time_ms=result.generation_time_ms,
    )


@router.post("/analyze/progress", response_model=GenerationResponse)
async def analyze_client_progress(
    request: AnalyzeProgressRequest,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Analizar progreso del cliente con IA"""
    # Obtener datos del cliente
    result = await db.execute(
        select(Client).where(Client.id == request.client_id)
    )
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Construir datos para análisis
    client_data = {
        "name": f"{client.first_name} {client.last_name}",
        "goal": client.health_data.get("goal", "Mejorar condición física") if client.health_data else "Mejorar condición física",
        "initial_weight": client.health_data.get("initial_weight", client.weight_kg) if client.health_data else client.weight_kg,
        "start_date": client.created_at.strftime("%Y-%m-%d") if client.created_at else None,
        "current_weight": client.weight_kg,
        "current_date": datetime.now().strftime("%Y-%m-%d"),
        "workouts_completed": 0,  # TODO: Obtener de la base de datos
        "nutrition_adherence": 80,  # TODO: Calcular de la base de datos
        "measurements": client.health_data.get("measurements", {}) if client.health_data else {},
    }

    # Obtener API key
    import os
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="API key de IA no configurada. Configure la integración en Ajustes > IA."
        )

    # Analizar progreso
    ai_service = AIGeneratorService(api_key=api_key, provider="openai")
    result = await ai_service.analyze_progress(client_data)

    if not result.success:
        raise HTTPException(status_code=500, detail=result.error)

    return GenerationResponse(
        success=True,
        content=result.content,
        tokens_used=result.tokens_input + result.tokens_output,
        generation_time_ms=result.generation_time_ms,
    )


# =====================================================
# ESTADÍSTICAS
# =====================================================

@router.get("/stats", response_model=AIUsageStats)
async def get_ai_usage_stats(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Obtener estadísticas de uso de IA"""
    # En producción, obtener de la base de datos
    return AIUsageStats(
        total_generations=0,
        tokens_used_this_month=0,
        tokens_remaining=1000000,
        generations_by_type={},
        average_generation_time_ms=0,
    )


# =====================================================
# HELPERS
# =====================================================

def _calculate_age(birth_date) -> Optional[int]:
    """Calcular edad a partir de fecha de nacimiento"""
    if not birth_date:
        return None

    today = datetime.now().date()
    return today.year - birth_date.year - (
        (today.month, today.day) < (birth_date.month, birth_date.day)
    )
