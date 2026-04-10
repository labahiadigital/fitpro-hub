"""Beverage endpoints for drink tracking."""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import ProgrammingError

from app.core.database import get_db
from app.middleware.auth import CurrentUser, require_workspace
from app.models.beverage import Beverage

router = APIRouter()


class BeverageCreate(BaseModel):
    name: str
    category: Optional[str] = None
    serving_size_ml: float = 250
    reference_ml: float = 100
    calories: float = 0
    protein: float = 0
    fat: float = 0
    carbs: float = 0


class BeverageResponse(BaseModel):
    id: UUID
    name: str
    category: Optional[str] = None
    serving_size_ml: float = 250
    reference_ml: float = 100
    calories: float = 0
    protein: float = 0
    fat: float = 0
    carbs: float = 0
    is_global: bool = False

    class Config:
        from_attributes = True


@router.get("", response_model=List[BeverageResponse])
async def list_beverages(
    search: Optional[str] = None,
    category: Optional[str] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    try:
        query = select(Beverage).where(
            or_(
                Beverage.workspace_id == current_user.workspace_id,
                Beverage.is_global.is_(True),
            )
        )
        if search:
            query = query.where(
                or_(
                    Beverage.name.ilike(f"%{search}%"),
                    Beverage.category.ilike(f"%{search}%"),
                )
            )
        if category:
            query = query.where(Beverage.category.ilike(f"%{category}%"))
        query = query.order_by(Beverage.name)
        result = await db.execute(query)
        return result.scalars().all()
    except ProgrammingError:
        await db.rollback()
        return []


@router.post("", response_model=BeverageResponse, status_code=status.HTTP_201_CREATED)
async def create_beverage(
    data: BeverageCreate,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    beverage = Beverage(
        workspace_id=current_user.workspace_id,
        name=data.name,
        category=data.category,
        serving_size_ml=data.serving_size_ml,
        reference_ml=data.reference_ml,
        calories=data.calories,
        protein=data.protein,
        fat=data.fat,
        carbs=data.carbs,
        is_global=False,
    )
    db.add(beverage)
    await db.commit()
    await db.refresh(beverage)
    return beverage


@router.delete("/{beverage_id}")
async def delete_beverage(
    beverage_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Beverage).where(
            Beverage.id == beverage_id,
            Beverage.workspace_id == current_user.workspace_id,
        )
    )
    beverage = result.scalar_one_or_none()
    if not beverage:
        raise HTTPException(status_code=404, detail="Beverage not found")
    await db.delete(beverage)
    await db.commit()
    return {"status": "deleted"}
