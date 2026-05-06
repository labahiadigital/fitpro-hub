"""Endpoints para los Beneficios que el entrenador comparte con sus clientes.

Mapeo de rutas:

* ``GET    /community/benefits`` – entrenador lista sus beneficios.
* ``POST   /community/benefits`` – entrenador crea un nuevo beneficio.
* ``PUT    /community/benefits/{id}`` – entrenador edita un beneficio.
* ``DELETE /community/benefits/{id}`` – entrenador desactiva (soft) un
  beneficio.
* ``GET    /my-community/benefits`` – cliente ve los beneficios activos
  del workspace al que pertenece (su entrenador).

Dejamos el endpoint del cliente filtrado solo por ``is_active=True`` y
ordenado por ``sort_order ASC, created_at DESC`` para que el entrenador
pueda destacar campañas concretas.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, asc, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import CurrentUser, require_staff, require_workspace
from app.models.community import CommunityBenefit


router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class CommunityBenefitBase(BaseModel):
    title: str
    description: Optional[str] = None
    brand: Optional[str] = None
    url: Optional[str] = None
    discount_code: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = True
    sort_order: Optional[int] = 0


class CommunityBenefitCreate(CommunityBenefitBase):
    pass


class CommunityBenefitUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    url: Optional[str] = None
    discount_code: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class CommunityBenefitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    title: str
    description: Optional[str]
    brand: Optional[str]
    url: Optional[str]
    discount_code: Optional[str]
    image_url: Optional[str]
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Trainer endpoints (require_staff)
# ---------------------------------------------------------------------------


@router.get("/community/benefits", response_model=List[CommunityBenefitResponse])
async def list_benefits(
    include_inactive: bool = True,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Lista todos los beneficios del workspace del entrenador."""
    q = (
        select(CommunityBenefit)
        .where(CommunityBenefit.workspace_id == current_user.workspace_id)
        .order_by(asc(CommunityBenefit.sort_order), desc(CommunityBenefit.created_at))
    )
    if not include_inactive:
        q = q.where(CommunityBenefit.is_active.is_(True))
    rows = (await db.execute(q)).scalars().all()
    return rows


@router.post(
    "/community/benefits",
    response_model=CommunityBenefitResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_benefit(
    data: CommunityBenefitCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="El título no puede estar vacío")
    if not (data.url or data.discount_code):
        raise HTTPException(
            status_code=400,
            detail="Tienes que informar al menos una URL o un código de descuento",
        )

    benefit = CommunityBenefit(
        workspace_id=current_user.workspace_id,
        created_by=getattr(current_user, "id", None),
        title=data.title.strip(),
        description=(data.description or None),
        brand=(data.brand or None),
        url=(data.url or None),
        discount_code=(data.discount_code or None),
        image_url=(data.image_url or None),
        is_active=True if data.is_active is None else bool(data.is_active),
        sort_order=int(data.sort_order or 0),
    )
    db.add(benefit)
    await db.commit()
    await db.refresh(benefit)
    return benefit


@router.put(
    "/community/benefits/{benefit_id}",
    response_model=CommunityBenefitResponse,
)
async def update_benefit(
    benefit_id: UUID,
    data: CommunityBenefitUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(CommunityBenefit).where(
            CommunityBenefit.id == benefit_id,
            CommunityBenefit.workspace_id == current_user.workspace_id,
        )
    )
    benefit = res.scalar_one_or_none()
    if not benefit:
        raise HTTPException(status_code=404, detail="Beneficio no encontrado")

    payload = data.model_dump(exclude_unset=True)
    for field in ("title", "description", "brand", "url", "discount_code", "image_url"):
        if field in payload:
            value = payload[field]
            if isinstance(value, str):
                value = value.strip() or None
            setattr(benefit, field, value)
    if "is_active" in payload and payload["is_active"] is not None:
        benefit.is_active = bool(payload["is_active"])
    if "sort_order" in payload and payload["sort_order"] is not None:
        benefit.sort_order = int(payload["sort_order"])

    if not benefit.title:
        raise HTTPException(status_code=400, detail="El título no puede estar vacío")
    if not (benefit.url or benefit.discount_code):
        raise HTTPException(
            status_code=400,
            detail="Tienes que informar al menos una URL o un código de descuento",
        )

    await db.commit()
    await db.refresh(benefit)
    return benefit


@router.delete(
    "/community/benefits/{benefit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_benefit(
    benefit_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(CommunityBenefit).where(
            CommunityBenefit.id == benefit_id,
            CommunityBenefit.workspace_id == current_user.workspace_id,
        )
    )
    benefit = res.scalar_one_or_none()
    if not benefit:
        raise HTTPException(status_code=404, detail="Beneficio no encontrado")
    await db.delete(benefit)
    await db.commit()
    return None


# ---------------------------------------------------------------------------
# Client endpoint (sólo lectura, beneficios activos del workspace)
# ---------------------------------------------------------------------------


@router.get(
    "/my-community/benefits",
    response_model=List[CommunityBenefitResponse],
)
async def list_my_benefits(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """El cliente ve los beneficios activos de SU workspace.

    No filtramos por rol: como el cliente sólo recibe los beneficios de
    su propio entrenador, basta con cruzar por ``workspace_id``.
    """
    rows = (
        await db.execute(
            select(CommunityBenefit)
            .where(
                CommunityBenefit.workspace_id == current_user.workspace_id,
                CommunityBenefit.is_active.is_(True),
            )
            .order_by(
                asc(CommunityBenefit.sort_order),
                desc(CommunityBenefit.created_at),
            )
        )
    ).scalars().all()
    return rows
