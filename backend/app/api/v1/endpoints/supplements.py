"""Supplement library endpoints with referral codes."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel

from app.core.database import get_db
from app.models.supplement import Supplement, SupplementRecommendation
from app.middleware.auth import require_workspace, require_staff, CurrentUser

router = APIRouter()


# ============ SCHEMAS ============

class SupplementCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    serving_size: str = "30g"
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    ingredients: Optional[str] = None
    usage_instructions: Optional[str] = None
    warnings: Optional[str] = None
    image_url: Optional[str] = None
    purchase_url: Optional[str] = None
    referral_code: Optional[str] = None
    referral_url: Optional[str] = None
    commission_percentage: Optional[float] = None
    is_public: bool = False


class SupplementUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    serving_size: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    ingredients: Optional[str] = None
    usage_instructions: Optional[str] = None
    warnings: Optional[str] = None
    image_url: Optional[str] = None
    purchase_url: Optional[str] = None
    referral_code: Optional[str] = None
    referral_url: Optional[str] = None
    commission_percentage: Optional[float] = None
    is_public: Optional[bool] = None


class SupplementResponse(BaseModel):
    id: UUID
    workspace_id: Optional[UUID]
    name: str
    brand: Optional[str]
    description: Optional[str]
    category: Optional[str]
    serving_size: str
    calories: Optional[float]
    protein: Optional[float]
    carbs: Optional[float]
    fat: Optional[float]
    ingredients: Optional[str]
    usage_instructions: Optional[str]
    warnings: Optional[str]
    image_url: Optional[str]
    purchase_url: Optional[str]
    referral_code: Optional[str]
    referral_url: Optional[str]
    commission_percentage: Optional[float]
    is_public: bool
    is_system: bool
    
    class Config:
        from_attributes = True


class RecommendationCreate(BaseModel):
    client_id: UUID
    supplement_id: UUID
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    notes: Optional[str] = None


class RecommendationResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    client_id: UUID
    supplement_id: UUID
    dosage: Optional[str]
    frequency: Optional[str]
    notes: Optional[str]
    is_active: bool
    supplement: Optional[SupplementResponse] = None
    
    class Config:
        from_attributes = True


# ============ SUPPLEMENTS ============

@router.get("", response_model=List[SupplementResponse])
async def list_supplements(
    search: Optional[str] = None,
    category: Optional[str] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar suplementos (públicos, del sistema, y del workspace).
    """
    query = select(Supplement).where(
        or_(
            Supplement.workspace_id == current_user.workspace_id,
            Supplement.is_public == True,
            Supplement.is_system == True
        )
    )
    
    if search:
        query = query.where(Supplement.name.ilike(f"%{search}%"))
    
    if category:
        query = query.where(Supplement.category == category)
    
    result = await db.execute(query.order_by(Supplement.name))
    return result.scalars().all()


@router.post("", response_model=SupplementResponse, status_code=status.HTTP_201_CREATED)
async def create_supplement(
    data: SupplementCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo suplemento.
    """
    supplement = Supplement(
        workspace_id=current_user.workspace_id,
        name=data.name,
        brand=data.brand,
        description=data.description,
        category=data.category,
        serving_size=data.serving_size,
        calories=data.calories,
        protein=data.protein,
        carbs=data.carbs,
        fat=data.fat,
        ingredients=data.ingredients,
        usage_instructions=data.usage_instructions,
        warnings=data.warnings,
        image_url=data.image_url,
        purchase_url=data.purchase_url,
        referral_code=data.referral_code,
        referral_url=data.referral_url,
        commission_percentage=data.commission_percentage,
        is_public=data.is_public,
        is_system=False
    )
    db.add(supplement)
    await db.commit()
    await db.refresh(supplement)
    return supplement


@router.get("/{supplement_id}", response_model=SupplementResponse)
async def get_supplement(
    supplement_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de un suplemento.
    """
    result = await db.execute(
        select(Supplement).where(
            Supplement.id == supplement_id,
            or_(
                Supplement.workspace_id == current_user.workspace_id,
                Supplement.is_public == True,
                Supplement.is_system == True
            )
        )
    )
    supplement = result.scalar_one_or_none()
    
    if not supplement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suplemento no encontrado"
        )
    
    return supplement


@router.put("/{supplement_id}", response_model=SupplementResponse)
async def update_supplement(
    supplement_id: UUID,
    data: SupplementUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar un suplemento.
    """
    result = await db.execute(
        select(Supplement).where(
            Supplement.id == supplement_id,
            Supplement.workspace_id == current_user.workspace_id
        )
    )
    supplement = result.scalar_one_or_none()
    
    if not supplement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suplemento no encontrado"
        )
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(supplement, field, value)
    
    await db.commit()
    await db.refresh(supplement)
    return supplement


@router.delete("/{supplement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplement(
    supplement_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un suplemento.
    """
    result = await db.execute(
        select(Supplement).where(
            Supplement.id == supplement_id,
            Supplement.workspace_id == current_user.workspace_id
        )
    )
    supplement = result.scalar_one_or_none()
    
    if not supplement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suplemento no encontrado"
        )
    
    await db.delete(supplement)
    await db.commit()


# ============ RECOMMENDATIONS ============

@router.get("/recommendations/client/{client_id}", response_model=List[RecommendationResponse])
async def list_client_recommendations(
    client_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar recomendaciones de suplementos para un cliente.
    """
    result = await db.execute(
        select(SupplementRecommendation)
        .where(
            SupplementRecommendation.workspace_id == current_user.workspace_id,
            SupplementRecommendation.client_id == client_id,
            SupplementRecommendation.is_active == True
        )
        .order_by(SupplementRecommendation.created_at.desc())
    )
    return result.scalars().all()


@router.post("/recommendations", response_model=RecommendationResponse, status_code=status.HTTP_201_CREATED)
async def create_recommendation(
    data: RecommendationCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear una recomendación de suplemento para un cliente.
    """
    recommendation = SupplementRecommendation(
        workspace_id=current_user.workspace_id,
        client_id=data.client_id,
        supplement_id=data.supplement_id,
        recommended_by=current_user.id,
        dosage=data.dosage,
        frequency=data.frequency,
        notes=data.notes,
        is_active=True
    )
    db.add(recommendation)
    await db.commit()
    await db.refresh(recommendation)
    return recommendation


@router.delete("/recommendations/{recommendation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recommendation(
    recommendation_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar una recomendación de suplemento.
    """
    result = await db.execute(
        select(SupplementRecommendation).where(
            SupplementRecommendation.id == recommendation_id,
            SupplementRecommendation.workspace_id == current_user.workspace_id
        )
    )
    recommendation = result.scalar_one_or_none()
    
    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recomendación no encontrada"
        )
    
    await db.delete(recommendation)
    await db.commit()
