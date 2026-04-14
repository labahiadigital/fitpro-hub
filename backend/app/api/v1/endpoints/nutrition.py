"""Nutrition endpoints - simplified to match actual DB schema."""
import copy
import re
from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import CurrentUser, get_current_user, require_staff, require_workspace
from app.models.client import Client
from app.models.nutrition import Food, FoodFavorite, FoodGroup, MealPlan, Recipe
from app.api.v1.endpoints.tasks import create_auto_task

router = APIRouter()


# ============ SCHEMAS ============

class FoodResponse(BaseModel):
    id: UUID
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    serving_size: Optional[Decimal] = None
    serving_unit: Optional[str] = None
    calories: Optional[Decimal] = None
    protein_g: Optional[Decimal] = None
    carbs_g: Optional[Decimal] = None
    fat_g: Optional[Decimal] = None
    fiber_g: Optional[Decimal] = None
    is_global: bool = False
    
    class Config:
        from_attributes = True


class FoodListResponse(BaseModel):
    items: List[FoodResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class MealPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    duration_days: int = 7
    duration_weeks: int = 1
    target_calories: Optional[float] = None
    target_protein: Optional[float] = None
    target_carbs: Optional[float] = None
    target_fat: Optional[float] = None
    dietary_tags: List[str] = []
    plan: dict = {"weeks": [{"week": 1, "days": []}]}
    is_template: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    review_interval_days: Optional[int] = None


class MealPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    duration_days: Optional[int] = None
    duration_weeks: Optional[int] = None
    target_calories: Optional[float] = None
    target_protein: Optional[float] = None
    target_carbs: Optional[float] = None
    target_fat: Optional[float] = None
    dietary_tags: Optional[List[str]] = None
    plan: Optional[dict] = None
    is_template: Optional[bool] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    review_interval_days: Optional[int] = None


class MealPlanResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    client_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    duration_days: int
    duration_weeks: int = 1
    target_calories: Optional[Decimal] = None
    target_protein: Optional[Decimal] = None
    target_carbs: Optional[Decimal] = None
    target_fat: Optional[Decimal] = None
    dietary_tags: List[str] = []
    plan: dict = {}
    is_template: bool
    is_active: Optional[bool] = False
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    review_interval_days: Optional[int] = None
    next_review_date: Optional[date] = None

    class Config:
        from_attributes = True


# ============ FOODS ============

@router.get("/foods", response_model=FoodListResponse)
async def list_foods(
    search: Optional[str] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar alimentos (globales y del workspace).
    """
    query = select(Food).where(
        or_(
            Food.workspace_id == current_user.workspace_id,
            Food.is_global.is_(True)
        )
    )
    
    if search:
        query = query.where(
            func.unaccent(Food.name).ilike(func.unaccent(f"%{search}%"))
        )
    
    if category:
        query = query.where(Food.category == category)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(Food.name).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    foods = result.scalars().all()
    
    return FoodListResponse(
        items=[FoodResponse.model_validate(f) for f in foods],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/foods/{food_id}", response_model=FoodResponse)
async def get_food(
    food_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener un alimento por ID.
    """
    result = await db.execute(
        select(Food).where(
            Food.id == food_id,
            or_(
                Food.workspace_id == current_user.workspace_id,
                Food.is_global.is_(True)
            )
        )
    )
    food = result.scalar_one_or_none()
    
    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alimento no encontrado"
        )
    
    return FoodResponse.model_validate(food)


class FoodCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    serving_size: Optional[float] = 100
    serving_unit: Optional[str] = "g"
    calories: Optional[float] = 0
    protein_g: Optional[float] = 0
    carbs_g: Optional[float] = 0
    fat_g: Optional[float] = 0
    fiber_g: Optional[float] = 0


@router.post("/foods", response_model=FoodResponse, status_code=status.HTTP_201_CREATED)
async def create_food(
    data: FoodCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un alimento personalizado para el workspace.
    """
    food = Food(
        workspace_id=current_user.workspace_id,
        name=data.name,
        brand=data.brand,
        category=data.category,
        serving_size=data.serving_size,
        serving_unit=data.serving_unit,
        calories=data.calories,
        protein_g=data.protein_g,
        carbs_g=data.carbs_g,
        fat_g=data.fat_g,
        fiber_g=data.fiber_g,
        is_global=False
    )
    db.add(food)
    await db.commit()
    await db.refresh(food)
    return FoodResponse.model_validate(food)


# ============ MEAL PLANS ============

@router.get("/meal-plans", response_model=List[MealPlanResponse])
async def list_meal_plans(
    client_id: Optional[UUID] = None,
    is_template: Optional[bool] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar planes nutricionales.
    """
    query = select(MealPlan).where(MealPlan.workspace_id == current_user.workspace_id)
    
    if client_id:
        query = query.where(MealPlan.client_id == client_id)
    
    if is_template is not None:
        query = query.where(MealPlan.is_template == is_template)
    
    result = await db.execute(query.order_by(MealPlan.created_at.desc()))
    plans = result.scalars().all()

    today = date.today()
    dirty = False
    for p in plans:
        if p.is_active and p.end_date and p.end_date < today:
            p.is_active = False
            dirty = True
    if dirty:
        await db.commit()

    return plans


@router.post("/meal-plans", response_model=MealPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_meal_plan(
    data: MealPlanCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un plan nutricional.
    """
    should_activate = data.client_id is not None and not data.is_template
    
    if should_activate:
        await db.execute(
            update(MealPlan)
            .where(
                MealPlan.client_id == data.client_id,
                MealPlan.workspace_id == current_user.workspace_id,
            )
            .values(is_active=False)
        )

    parsed_start = None
    parsed_end = None
    if data.start_date:
        try:
            parsed_start = date.fromisoformat(data.start_date)
        except (ValueError, TypeError):
            pass
    if data.end_date:
        try:
            parsed_end = date.fromisoformat(data.end_date)
        except (ValueError, TypeError):
            pass

    review_interval = data.review_interval_days
    next_review = None
    if review_interval and review_interval > 0 and parsed_start:
        next_review = parsed_start + timedelta(days=review_interval)

    meal_plan = MealPlan(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        client_id=data.client_id,
        name=data.name,
        description=data.description,
        duration_days=data.duration_weeks * 7,
        duration_weeks=data.duration_weeks,
        target_calories=data.target_calories,
        target_protein=data.target_protein,
        target_carbs=data.target_carbs,
        target_fat=data.target_fat,
        dietary_tags=data.dietary_tags,
        plan=data.plan,
        executed_plan=copy.deepcopy(data.plan) if should_activate else None,
        is_template=data.is_template,
        is_active=should_activate,
        start_date=parsed_start,
        end_date=parsed_end,
        review_interval_days=review_interval,
        next_review_date=next_review,
    )
    db.add(meal_plan)
    await db.flush()

    if parsed_end and data.client_id:
        await create_auto_task(
            db=db,
            workspace_id=current_user.workspace_id,
            created_by=current_user.id,
            title=f"Fin de plan nutricional: {data.name}",
            due_date=datetime.combine(parsed_end, datetime.min.time()),
            source="auto",
            source_ref=f"meal_plan_end:{meal_plan.id}",
            client_id=data.client_id,
        )

    if next_review and data.client_id:
        await create_auto_task(
            db=db,
            workspace_id=current_user.workspace_id,
            created_by=current_user.id,
            title=f"Revisión plan nutricional: {data.name}",
            due_date=datetime.combine(next_review, datetime.min.time()),
            source="auto",
            source_ref=f"meal_plan_review:{meal_plan.id}",
            client_id=data.client_id,
        )

    await db.commit()
    await db.refresh(meal_plan)
    return meal_plan


@router.get("/meal-plans/{plan_id}", response_model=MealPlanResponse)
async def get_meal_plan(
    plan_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener un plan nutricional por ID.
    """
    result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.workspace_id == current_user.workspace_id
        )
    )
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan nutricional no encontrado"
        )
    
    return plan


@router.put("/meal-plans/{plan_id}", response_model=MealPlanResponse)
async def update_meal_plan(
    plan_id: UUID,
    data: MealPlanUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar un plan nutricional (parcialmente).
    """
    result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.workspace_id == current_user.workspace_id
        )
    )
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan nutricional no encontrado"
        )
    
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            if field in ("start_date", "end_date") and isinstance(value, str):
                try:
                    value = date.fromisoformat(value) if value else None
                except (ValueError, TypeError):
                    value = None
            setattr(plan, field, value)

    if data.review_interval_days is not None and plan.start_date:
        if data.review_interval_days > 0:
            plan.next_review_date = plan.start_date + timedelta(days=data.review_interval_days)
        else:
            plan.next_review_date = None

    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/meal-plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal_plan(
    plan_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un plan nutricional.
    """
    result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.workspace_id == current_user.workspace_id
        )
    )
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan nutricional no encontrado"
        )
    
    await db.delete(plan)
    await db.commit()


@router.post("/meal-plans/{plan_id}/activate", response_model=MealPlanResponse)
async def activate_meal_plan(
    plan_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Mark a plan as active and deactivate all other plans for the same client."""
    result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.workspace_id == current_user.workspace_id
        )
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    if not plan.client_id:
        raise HTTPException(status_code=400, detail="Solo se pueden activar planes asignados a un cliente")

    await db.execute(
        update(MealPlan)
        .where(
            MealPlan.client_id == plan.client_id,
            MealPlan.workspace_id == current_user.workspace_id,
        )
        .values(is_active=False)
    )
    plan.is_active = True
    if plan.executed_plan is None and plan.plan:
        plan.executed_plan = copy.deepcopy(plan.plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.post("/meal-plans/{plan_id}/deactivate", response_model=MealPlanResponse)
async def deactivate_meal_plan(
    plan_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Mark a plan as inactive."""
    result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.workspace_id == current_user.workspace_id
        )
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    plan.is_active = False
    await db.commit()
    await db.refresh(plan)
    return plan


# Schema for assign request
class AssignMealPlanRequest(BaseModel):
    client_id: UUID
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
    review_interval_days: Optional[int] = None


@router.post("/meal-plans/{plan_id}/assign", response_model=MealPlanResponse, status_code=status.HTTP_201_CREATED)
async def assign_meal_plan_to_client(
    plan_id: UUID,
    data: AssignMealPlanRequest,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Asignar un plan nutricional (template) a un cliente.
    Crea una copia del plan con el client_id asignado.
    """
    # Get the template meal plan
    result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.workspace_id == current_user.workspace_id
        )
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan nutricional no encontrado"
        )
    
    # Deactivate all existing plans for this client
    await db.execute(
        update(MealPlan)
        .where(
            MealPlan.client_id == data.client_id,
            MealPlan.workspace_id == current_user.workspace_id,
        )
        .values(is_active=False)
    )

    parsed_start = None
    parsed_end = None
    if data.start_date:
        try:
            parsed_start = date.fromisoformat(data.start_date)
        except (ValueError, TypeError):
            pass
    if data.end_date:
        try:
            parsed_end = date.fromisoformat(data.end_date)
        except (ValueError, TypeError):
            pass

    review_interval = data.review_interval_days
    next_review = None
    if review_interval and review_interval > 0 and parsed_start:
        next_review = parsed_start + timedelta(days=review_interval)

    assigned_plan = MealPlan(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        client_id=data.client_id,
        name=template.name,
        description=template.description,
        duration_days=template.duration_days,
        duration_weeks=template.duration_weeks,
        target_calories=template.target_calories,
        target_protein=template.target_protein,
        target_carbs=template.target_carbs,
        target_fat=template.target_fat,
        dietary_tags=template.dietary_tags,
        plan=template.plan,
        executed_plan=copy.deepcopy(template.plan) if template.plan else None,
        meal_times=template.meal_times,
        is_template=False,
        is_active=True,
        start_date=parsed_start,
        end_date=parsed_end,
        review_interval_days=review_interval,
        next_review_date=next_review,
    )
    
    db.add(assigned_plan)
    await db.flush()

    if parsed_end:
        await create_auto_task(
            db=db,
            workspace_id=current_user.workspace_id,
            created_by=current_user.id,
            title=f"Fin de plan nutricional: {template.name}",
            due_date=datetime.combine(parsed_end, datetime.min.time()),
            description=f"El plan nutricional '{template.name}' finaliza en esta fecha.",
            source_ref=f"meal_plan_end:{assigned_plan.id}",
            client_id=data.client_id,
        )

    if next_review:
        await create_auto_task(
            db=db,
            workspace_id=current_user.workspace_id,
            created_by=current_user.id,
            title=f"Revisión plan nutricional: {template.name}",
            due_date=datetime.combine(next_review, datetime.min.time()),
            description=f"Revisar progreso del plan nutricional '{template.name}'. Intervalo: cada {review_interval} días.",
            source_ref=f"meal_plan_review:{assigned_plan.id}",
            client_id=data.client_id,
        )

    await db.commit()
    await db.refresh(assigned_plan)
    return assigned_plan


# ============ FAVORITES ============

@router.get("/favorites/foods")
async def list_food_favorites(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar alimentos favoritos del usuario.
    """
    result = await db.execute(
        select(FoodFavorite).where(FoodFavorite.user_id == current_user.id)
    )
    favorites = result.scalars().all()
    return [{"food_id": f.food_id} for f in favorites]


@router.post("/favorites/foods/{food_id}", status_code=status.HTTP_201_CREATED)
async def add_food_favorite(
    food_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Añadir alimento a favoritos.
    """
    # Check if already favorited
    existing = await db.execute(
        select(FoodFavorite).where(
            FoodFavorite.user_id == current_user.id,
            FoodFavorite.food_id == food_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El alimento ya está en favoritos"
        )
    
    favorite = FoodFavorite(
        workspace_id=current_user.workspace_id,
        user_id=current_user.id,
        food_id=food_id
    )
    db.add(favorite)
    await db.commit()
    return {"message": "Alimento añadido a favoritos"}


@router.delete("/favorites/foods/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_food_favorite(
    food_id: UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar alimento de favoritos.
    """
    result = await db.execute(
        select(FoodFavorite).where(
            FoodFavorite.user_id == current_user.id,
            FoodFavorite.food_id == food_id
        )
    )
    favorite = result.scalar_one_or_none()
    
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El alimento no está en favoritos"
        )
    
    await db.delete(favorite)
    await db.commit()


# ============ CLIENT LOGS (for trainers) ============

@router.get("/clients/{client_id}/logs")
async def get_client_nutrition_logs(
    client_id: UUID,
    days: int = Query(30, le=365),
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener los logs de nutrición de un cliente específico.
    Solo accesible por staff (entrenadores).
    """
    client_result = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.workspace_id == current_user.workspace_id
        )
    )
    client = client_result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    
    result = await db.execute(
        select(MealPlan)
        .where(MealPlan.client_id == client_id)
        .order_by(desc(MealPlan.created_at))
    )
    meal_plans = result.scalars().all()
    
    active_plan = next((mp for mp in meal_plans if mp.is_active), meal_plans[0] if meal_plans else None)
    
    if not meal_plans or all(not mp.adherence for mp in meal_plans):
        return {
            "client_id": str(client_id),
            "client_name": client.full_name,
            "logs": [],
            "summary": {"total_days": 0, "avg_calories": 0},
            "targets": {
                "calories": float(active_plan.target_calories) if active_plan and active_plan.target_calories else 2000,
                "protein": float(active_plan.target_protein) if active_plan and active_plan.target_protein else 140,
                "carbs": float(active_plan.target_carbs) if active_plan and active_plan.target_carbs else 250,
                "fat": float(active_plan.target_fat) if active_plan and active_plan.target_fat else 70,
            }
        }
    
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    def _safe_float(val, default=0.0):
        if val is None:
            return default
        try:
            return float(val)
        except (ValueError, TypeError):
            m = re.search(r"[\d.]+", str(val))
            return float(m.group()) if m else default

    def _get_plan_days_trainer(mp_plan, week_num=None):
        if not mp_plan:
            return []
        if "weeks" in mp_plan:
            weeks = mp_plan["weeks"]
            if not weeks:
                return []
            if week_num is not None:
                wk = next((w for w in weeks if w.get("week") == week_num), None)
                return wk.get("days", []) if wk else []
            return weeks[0].get("days", [])
        return mp_plan.get("days", [])

    def _calc_plan_meal_macros_trainer(mp_plan, meal_name, log_date_str, plan_start_date=None, duration_weeks=1):
        if not mp_plan:
            return None
        try:
            d = date.fromisoformat(log_date_str)
            plan_day_num = d.isoweekday()
        except Exception:
            return None

        week_num = 1
        if plan_start_date and duration_weeks and duration_weeks > 1:
            try:
                start = plan_start_date if isinstance(plan_start_date, date) else date.fromisoformat(str(plan_start_date))
                delta_days = (d - start).days
                week_num = (delta_days // 7) % duration_weeks + 1
            except Exception:
                week_num = 1

        plan_days_ref = _get_plan_days_trainer(mp_plan, week_num)
        day_data = next((dd for dd in plan_days_ref if dd.get("day") == plan_day_num), None)
        if not day_data:
            return None
        meal_data = next((m for m in day_data.get("meals", []) if m.get("name") == meal_name), None)
        if not meal_data:
            return None
        cal = prot = carb = fat_v = 0.0
        plan_foods = []
        for item in meal_data.get("items", []):
            fd = item.get("food") or item.get("supplement") or {}
            ss = _safe_float(fd.get("serving_size"), 100) or 100
            qty = _safe_float(item.get("quantity_grams"), 0)
            factor = qty / ss
            ic = round(_safe_float(fd.get("calories")) * factor)
            ip = round(_safe_float(fd.get("protein")) * factor, 1)
            icb = round(_safe_float(fd.get("carbs")) * factor, 1)
            ift = round(_safe_float(fd.get("fat")) * factor, 1)
            cal += ic; prot += ip; carb += icb; fat_v += ift
            per100 = 100 / ss
            plan_foods.append({
                "name": fd.get("name", ""),
                "calories": ic, "protein": ip, "carbs": icb, "fat": ift,
                "quantity": qty,
                "recipe_group": item.get("recipe_group"),
                "calories_per_100g": round(_safe_float(fd.get("calories")) * per100),
                "protein_per_100g": round(_safe_float(fd.get("protein")) * per100, 1),
                "carbs_per_100g": round(_safe_float(fd.get("carbs")) * per100, 1),
                "fat_per_100g": round(_safe_float(fd.get("fat")) * per100, 1),
            })
        return {"calories": int(cal), "protein": round(prot, 1), "carbs": round(carb, 1), "fat": round(fat_v, 1), "foods": plan_foods}
    
    days_data = defaultdict(lambda: {"meals": [], "totals": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}, "plan_totals": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}, "has_modifications": False})
    
    for mp in meal_plans:
        if not mp.adherence:
            continue
        logs = mp.adherence.get("logs", [])
        mp_plan = mp.plan if mp.plan else {}
        mp_start = mp.created_at.date() if mp.created_at else None
        mp_dur_weeks = mp.duration_weeks if hasattr(mp, 'duration_weeks') and mp.duration_weeks else 1
        filtered_logs = [
            log for log in logs
            if start_date.isoformat() <= log.get("date", "") <= end_date.isoformat()
        ]
        for log in filtered_logs:
            log_date = log.get("date", "")
            meal_name = log.get("meal_name")
            plan_ref = _calc_plan_meal_macros_trainer(mp_plan, meal_name, log_date, mp_start, mp_dur_weeks)
            has_mods = False
            if plan_ref:
                logged_names = {f.get("name") for f in log.get("foods", [])}
                plan_names = {f.get("name") for f in plan_ref.get("foods", [])}
                if logged_names != plan_names:
                    has_mods = True
            days_data[log_date]["meals"].append({
                "meal_name": meal_name,
                "total_calories": log.get("total_calories", 0),
                "total_protein": log.get("total_protein", 0),
                "total_carbs": log.get("total_carbs", 0),
                "total_fat": log.get("total_fat", 0),
                "foods": log.get("foods", []),
                "logged_at": log.get("logged_at"),
                "notes": log.get("notes"),
                "satisfaction_rating": log.get("satisfaction_rating"),
                "plan_reference": plan_ref,
                "has_modifications": has_mods,
            })
            days_data[log_date]["totals"]["calories"] += log.get("total_calories", 0)
            days_data[log_date]["totals"]["protein"] += log.get("total_protein", 0)
            days_data[log_date]["totals"]["carbs"] += log.get("total_carbs", 0)
            days_data[log_date]["totals"]["fat"] += log.get("total_fat", 0)
            if plan_ref:
                days_data[log_date]["plan_totals"]["calories"] += plan_ref["calories"]
                days_data[log_date]["plan_totals"]["protein"] += plan_ref["protein"]
                days_data[log_date]["plan_totals"]["carbs"] += plan_ref["carbs"]
                days_data[log_date]["plan_totals"]["fat"] += plan_ref["fat"]
            if has_mods:
                days_data[log_date]["has_modifications"] = True
    
    days_list = [
        {"date": d, **data}
        for d, data in sorted(days_data.items(), key=lambda x: x[0], reverse=True)
    ]
    
    total_days = len(days_list)
    avg_calories = sum(d["totals"]["calories"] for d in days_list) / total_days if total_days > 0 else 0
    
    return {
        "client_id": str(client_id),
        "client_name": client.full_name,
        "logs": days_list,
        "summary": {
            "total_days": total_days,
            "avg_calories": round(avg_calories),
        },
        "targets": {
            "calories": float(active_plan.target_calories) if active_plan and active_plan.target_calories else 2000,
            "protein": float(active_plan.target_protein) if active_plan and active_plan.target_protein else 140,
            "carbs": float(active_plan.target_carbs) if active_plan and active_plan.target_carbs else 250,
            "fat": float(active_plan.target_fat) if active_plan and active_plan.target_fat else 70,
        }
    }


# ============ RECIPES ============

class RecipeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []
    servings: int = 1
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    difficulty: Optional[str] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None
    is_public: bool = False
    items: list = []
    total_calories: float = 0
    total_protein: float = 0
    total_carbs: float = 0
    total_fat: float = 0
    total_fiber: float = 0
    total_sugar: float = 0


class RecipeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    servings: Optional[int] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    difficulty: Optional[str] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None
    is_public: Optional[bool] = None
    items: Optional[list] = None
    total_calories: Optional[float] = None
    total_protein: Optional[float] = None
    total_carbs: Optional[float] = None
    total_fat: Optional[float] = None
    total_fiber: Optional[float] = None
    total_sugar: Optional[float] = None


class RecipeResponse(BaseModel):
    id: UUID
    workspace_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []
    servings: int = 1
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    difficulty: Optional[str] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None
    is_public: bool = False
    is_global: bool = False
    items: list = []
    total_calories: Optional[Decimal] = 0
    total_protein: Optional[Decimal] = 0
    total_carbs: Optional[Decimal] = 0
    total_fat: Optional[Decimal] = 0
    total_fiber: Optional[Decimal] = 0
    total_sugar: Optional[Decimal] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.get("/recipes", response_model=List[RecipeResponse])
async def list_recipes(
    search: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    tag: Optional[str] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """List workspace recipes + global (system) recipes."""
    query = select(Recipe).where(
        or_(
            Recipe.workspace_id == current_user.workspace_id,
            Recipe.is_global.is_(True)
        )
    )

    if search:
        query = query.where(
            func.unaccent(Recipe.name).ilike(func.unaccent(f"%{search}%"))
        )

    if category:
        query = query.where(Recipe.category == category)

    if difficulty:
        query = query.where(Recipe.difficulty == difficulty)

    if tag:
        query = query.where(Recipe.tags.any(tag))

    result = await db.execute(query.order_by(Recipe.name))
    return result.scalars().all()


@router.get("/recipes/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(
    recipe_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            or_(
                Recipe.workspace_id == current_user.workspace_id,
                Recipe.is_global.is_(True)
            )
        )
    )
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    return recipe


@router.post("/recipes", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
async def create_recipe(
    data: RecipeCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    recipe = Recipe(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        name=data.name,
        description=data.description,
        category=data.category,
        tags=data.tags,
        servings=data.servings,
        prep_time_minutes=data.prep_time_minutes,
        cook_time_minutes=data.cook_time_minutes,
        difficulty=data.difficulty,
        image_url=data.image_url,
        notes=data.notes,
        is_public=data.is_public,
        items=data.items,
        total_calories=data.total_calories,
        total_protein=data.total_protein,
        total_carbs=data.total_carbs,
        total_fat=data.total_fat,
        total_fiber=data.total_fiber,
        total_sugar=data.total_sugar,
    )
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    return recipe


@router.put("/recipes/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(
    recipe_id: UUID,
    data: RecipeUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Recipe).where(Recipe.id == recipe_id, Recipe.workspace_id == current_user.workspace_id)
    )
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(recipe, field, value)
    await db.commit()
    await db.refresh(recipe)
    return recipe


@router.post("/recipes/{recipe_id}/duplicate", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_recipe(
    recipe_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Duplicate a recipe (works for both workspace and global recipes)."""
    result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            or_(
                Recipe.workspace_id == current_user.workspace_id,
                Recipe.is_global.is_(True)
            )
        )
    )
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Receta no encontrada")

    copy = Recipe(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        name=f"{original.name} (copia)",
        description=original.description,
        category=original.category,
        tags=original.tags or [],
        servings=original.servings,
        prep_time_minutes=original.prep_time_minutes,
        cook_time_minutes=original.cook_time_minutes,
        difficulty=original.difficulty,
        image_url=original.image_url,
        notes=original.notes,
        is_public=False,
        is_global=False,
        items=original.items or [],
        total_calories=original.total_calories,
        total_protein=original.total_protein,
        total_carbs=original.total_carbs,
        total_fat=original.total_fat,
        total_fiber=original.total_fiber,
        total_sugar=original.total_sugar,
    )
    db.add(copy)
    await db.commit()
    await db.refresh(copy)
    return copy


@router.delete("/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(
    recipe_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Recipe).where(Recipe.id == recipe_id, Recipe.workspace_id == current_user.workspace_id)
    )
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    await db.delete(recipe)
    await db.commit()


# ============ AUTO-ACTIVATION ============

@router.post("/auto-activate")
async def auto_activate_plans(
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Auto-activate/deactivate meal plans based on start_date and end_date."""
    today = date.today()

    expired = await db.execute(
        update(MealPlan)
        .where(
            MealPlan.workspace_id == current_user.workspace_id,
            MealPlan.is_active.is_(True),
            MealPlan.end_date.isnot(None),
            MealPlan.end_date < today,
        )
        .values(is_active=False)
    )
    deactivated_count = expired.rowcount

    pending = await db.execute(
        select(MealPlan).where(
            MealPlan.workspace_id == current_user.workspace_id,
            MealPlan.is_active.is_(False),
            MealPlan.client_id.isnot(None),
            MealPlan.is_template.is_(False),
            MealPlan.start_date.isnot(None),
            MealPlan.start_date <= today,
            or_(MealPlan.end_date.is_(None), MealPlan.end_date >= today),
        )
    )
    to_activate = pending.scalars().all()

    activated_count = 0
    for plan in to_activate:
        has_active = await db.scalar(
            select(func.count()).select_from(MealPlan).where(
                MealPlan.client_id == plan.client_id,
                MealPlan.is_active.is_(True),
            )
        )
        if not has_active:
            plan.is_active = True
            if plan.executed_plan is None and plan.plan:
                plan.executed_plan = copy.deepcopy(plan.plan)
            activated_count += 1

    await db.commit()
    return {"activated": activated_count, "deactivated": deactivated_count}


# ============ FOOD GROUPS ============

class FoodGroupCreate(BaseModel):
    name: str
    subcategory: Optional[str] = None
    quantity: Optional[str] = None
    calories: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0


class FoodGroupResponse(BaseModel):
    id: UUID
    workspace_id: Optional[UUID] = None
    name: str
    subcategory: Optional[str] = None
    quantity: Optional[str] = None
    calories: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0
    is_global: bool = False

    class Config:
        from_attributes = True


@router.get("/food-groups", response_model=List[FoodGroupResponse])
async def list_food_groups(
    search: Optional[str] = None,
    category: Optional[str] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    query = select(FoodGroup).where(
        or_(
            FoodGroup.workspace_id == current_user.workspace_id,
            FoodGroup.is_global.is_(True),
        )
    )
    if search:
        query = query.where(
            or_(
                FoodGroup.name.ilike(f"%{search}%"),
                FoodGroup.subcategory.ilike(f"%{search}%"),
            )
        )
    if category:
        query = query.where(FoodGroup.name.ilike(f"%{category}%"))
    result = await db.execute(query.order_by(FoodGroup.name))
    return result.scalars().all()


@router.post("/food-groups", response_model=FoodGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_food_group(
    data: FoodGroupCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    fg = FoodGroup(
        workspace_id=current_user.workspace_id,
        name=data.name,
        subcategory=data.subcategory,
        quantity=data.quantity,
        calories=data.calories,
        protein_g=data.protein_g,
        carbs_g=data.carbs_g,
        fat_g=data.fat_g,
        fiber_g=data.fiber_g,
    )
    db.add(fg)
    await db.commit()
    await db.refresh(fg)
    return fg


@router.put("/food-groups/{fg_id}", response_model=FoodGroupResponse)
async def update_food_group(
    fg_id: UUID,
    data: FoodGroupCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FoodGroup).where(
            FoodGroup.id == fg_id,
            FoodGroup.workspace_id == current_user.workspace_id,
        )
    )
    fg = result.scalar_one_or_none()
    if not fg:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    for key, val in data.model_dump().items():
        setattr(fg, key, val)
    await db.commit()
    await db.refresh(fg)
    return fg


@router.delete("/food-groups/{fg_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_food_group(
    fg_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FoodGroup).where(
            FoodGroup.id == fg_id,
            FoodGroup.workspace_id == current_user.workspace_id,
        )
    )
    fg = result.scalar_one_or_none()
    if not fg:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    await db.delete(fg)
    await db.commit()
