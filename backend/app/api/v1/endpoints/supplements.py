"""Supplement library endpoints - simplified to match actual DB schema."""
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel

from app.core.database import get_db
from app.models.supplement import Supplement, SupplementFavorite
from app.middleware.auth import require_workspace, require_staff, CurrentUser, get_current_user

router = APIRouter()


# ============ SCHEMAS ============

class SupplementCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    serving_size: Optional[float] = None
    serving_unit: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    usage_instructions: Optional[str] = None
    warnings: Optional[str] = None
    image_url: Optional[str] = None
    purchase_url: Optional[str] = None


class SupplementResponse(BaseModel):
    id: UUID
    workspace_id: Optional[UUID] = None
    name: str
    brand: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    serving_size: Optional[Decimal] = None
    serving_unit: Optional[str] = None
    calories: Optional[Decimal] = None
    protein: Optional[Decimal] = None
    carbs: Optional[Decimal] = None
    fat: Optional[Decimal] = None
    usage_instructions: Optional[str] = None
    warnings: Optional[str] = None
    image_url: Optional[str] = None
    purchase_url: Optional[str] = None
    is_global: bool = False
    
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
    Listar suplementos (globales y del workspace).
    """
    query = select(Supplement).where(
        or_(
            Supplement.workspace_id == current_user.workspace_id,
            Supplement.is_global == True
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
    Crear un suplemento.
    """
    supplement = Supplement(
        workspace_id=current_user.workspace_id,
        name=data.name,
        brand=data.brand,
        description=data.description,
        category=data.category,
        serving_size=data.serving_size,
        serving_unit=data.serving_unit,
        calories=data.calories,
        protein=data.protein,
        carbs=data.carbs,
        fat=data.fat,
        usage_instructions=data.usage_instructions,
        warnings=data.warnings,
        image_url=data.image_url,
        purchase_url=data.purchase_url,
        is_global=False
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
    Obtener un suplemento por ID.
    """
    result = await db.execute(
        select(Supplement).where(
            Supplement.id == supplement_id,
            or_(
                Supplement.workspace_id == current_user.workspace_id,
                Supplement.is_global == True
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
    data: SupplementCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Supplement).where(Supplement.id == supplement_id))
    supplement = result.scalar_one_or_none()
    if not supplement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suplemento no encontrado")
    if supplement.is_global:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No se pueden modificar datos del sistema")
    if supplement.workspace_id != current_user.workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suplemento no encontrado")
    
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
    result = await db.execute(select(Supplement).where(Supplement.id == supplement_id))
    supplement = result.scalar_one_or_none()
    if not supplement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suplemento no encontrado")
    if supplement.is_global:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No se pueden modificar datos del sistema")
    if supplement.workspace_id != current_user.workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suplemento no encontrado")
    
    await db.delete(supplement)
    await db.commit()


# ============ BULK SEED ============

@router.post("/seed", status_code=status.HTTP_201_CREATED)
async def seed_supplements(
    supplements_data: List[SupplementCreate],
    replace_all: bool = False,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Bulk-create supplements. If replace_all=True, delete existing workspace supplements first.
    """
    if replace_all:
        result = await db.execute(
            select(Supplement).where(
                Supplement.workspace_id == current_user.workspace_id
            )
        )
        existing = result.scalars().all()
        for s in existing:
            await db.delete(s)

    created = []
    for data in supplements_data:
        supplement = Supplement(
            workspace_id=current_user.workspace_id,
            name=data.name,
            brand=data.brand,
            description=data.description,
            category=data.category,
            serving_size=data.serving_size,
            serving_unit=data.serving_unit,
            calories=data.calories,
            protein=data.protein,
            carbs=data.carbs,
            fat=data.fat,
            usage_instructions=data.usage_instructions,
            warnings=data.warnings,
            image_url=data.image_url,
            purchase_url=data.purchase_url,
            is_global=False,
        )
        db.add(supplement)
        created.append(supplement)

    await db.commit()
    for s in created:
        await db.refresh(s)
    return {"message": f"Created {len(created)} supplements", "count": len(created)}


# ============ FAVORITES ============

@router.get("/favorites/list")
async def list_supplement_favorites(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar suplementos favoritos del usuario.
    """
    result = await db.execute(
        select(SupplementFavorite).where(SupplementFavorite.user_id == current_user.id)
    )
    favorites = result.scalars().all()
    return [{"supplement_id": f.supplement_id} for f in favorites]


@router.post("/favorites/{supplement_id}", status_code=status.HTTP_201_CREATED)
async def add_supplement_favorite(
    supplement_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Añadir suplemento a favoritos.
    """
    existing = await db.execute(
        select(SupplementFavorite).where(
            SupplementFavorite.user_id == current_user.id,
            SupplementFavorite.supplement_id == supplement_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El suplemento ya está en favoritos"
        )
    
    favorite = SupplementFavorite(
        workspace_id=current_user.workspace_id,
        user_id=current_user.id,
        supplement_id=supplement_id
    )
    db.add(favorite)
    await db.commit()
    return {"message": "Suplemento añadido a favoritos"}


@router.delete("/favorites/{supplement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_supplement_favorite(
    supplement_id: UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar suplemento de favoritos.
    """
    result = await db.execute(
        select(SupplementFavorite).where(
            SupplementFavorite.user_id == current_user.id,
            SupplementFavorite.supplement_id == supplement_id
        )
    )
    favorite = result.scalar_one_or_none()
    
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El suplemento no está en favoritos"
        )
    
    await db.delete(favorite)
    await db.commit()
