"""
Endpoints de la API para el Sistema de Referidos Multinivel
"""

import secrets
import string
from datetime import date, datetime
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.middleware.auth import require_workspace
from app.models.referrals import (
    Affiliate,
    AffiliateSupplementLink,
    AffiliatePayout,
    ReferralClick,
    ReferralConversion,
    ReferralLink,
    ReferralProgram,
    SupplementReferral,
)

router = APIRouter()


# =====================================================
# SCHEMAS
# =====================================================

class ReferralProgramBase(BaseModel):
    name: str
    description: Optional[str] = None
    program_type: str = "simple"
    commission_type: str = "percentage"
    commission_value: float = 10
    levels: List[dict] = [{"level": 1, "commission": 10}, {"level": 2, "commission": 5}]
    max_levels: int = 2
    applicable_to: str = "all"
    min_purchase_amount: float = 0
    cookie_duration_days: int = 30
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ReferralProgramResponse(ReferralProgramBase):
    id: UUID
    workspace_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AffiliateBase(BaseModel):
    display_name: str
    email: str
    phone: Optional[str] = None
    payment_method: str = "bank_transfer"
    payment_details: dict = {}


class AffiliateCreate(AffiliateBase):
    parent_affiliate_code: Optional[str] = None


class AffiliateResponse(AffiliateBase):
    id: UUID
    workspace_id: UUID
    user_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    affiliate_code: str
    parent_affiliate_id: Optional[UUID] = None
    level: int
    status: str
    total_referrals: int
    total_conversions: int
    total_earnings: float
    pending_earnings: float
    paid_earnings: float
    accepted_terms: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ReferralLinkBase(BaseModel):
    destination_url: str
    program_id: Optional[UUID] = None
    product_id: Optional[UUID] = None
    course_id: Optional[UUID] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None


class ReferralLinkCreate(ReferralLinkBase):
    pass


class ReferralLinkResponse(ReferralLinkBase):
    id: UUID
    affiliate_id: UUID
    link_code: str
    clicks: int
    conversions: int
    revenue: float
    is_active: bool
    full_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversionCreate(BaseModel):
    affiliate_code: str
    sale_amount: float
    conversion_type: str = "sale"
    converted_client_id: Optional[UUID] = None
    payment_id: Optional[UUID] = None
    subscription_id: Optional[UUID] = None


class ConversionResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    affiliate_id: UUID
    conversion_type: str
    sale_amount: float
    commission_rate: float
    commission_amount: float
    currency: str
    affiliate_level: int
    status: str
    converted_at: datetime
    approved_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PayoutResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    affiliate_id: UUID
    period_start: date
    period_end: date
    gross_amount: float
    deductions: float
    net_amount: float
    currency: str
    conversions_count: int
    status: str
    scheduled_date: Optional[date] = None
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SupplementReferralBase(BaseModel):
    supplement_name: str
    supplement_brand: str
    supplement_description: Optional[str] = None
    supplement_image_url: Optional[str] = None
    supplement_url: str
    category: str = "general"
    brand_commission_rate: float = 15
    affiliate_commission_rate: float = 10


class SupplementReferralResponse(SupplementReferralBase):
    id: UUID
    is_active: bool
    is_featured: bool
    total_clicks: int
    total_sales: int
    total_revenue: float
    created_at: datetime

    class Config:
        from_attributes = True


class AffiliateDashboard(BaseModel):
    affiliate: AffiliateResponse
    total_clicks: int
    total_conversions: int
    conversion_rate: float
    total_earnings: float
    pending_earnings: float
    paid_earnings: float
    recent_conversions: List[ConversionResponse]
    links_count: int


# =====================================================
# UTILIDADES
# =====================================================

def generate_affiliate_code(length: int = 8) -> str:
    """Generar código de afiliado único"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


def generate_link_code(length: int = 10) -> str:
    """Generar código de enlace único"""
    chars = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


async def calculate_multilevel_commissions(
    db: AsyncSession,
    affiliate_id: UUID,
    sale_amount: float,
    program: ReferralProgram,
) -> List[dict]:
    """Calcular comisiones multinivel"""
    commissions = []
    current_affiliate_id = affiliate_id
    level = 1

    while current_affiliate_id and level <= program.max_levels:
        # Obtener afiliado
        result = await db.execute(
            select(Affiliate).where(Affiliate.id == current_affiliate_id)
        )
        affiliate = result.scalar_one_or_none()

        if not affiliate or affiliate.status != "active":
            break

        # Buscar comisión para este nivel
        level_config = next(
            (l for l in program.levels if l.get("level") == level),
            None
        )

        if level_config:
            if program.commission_type == "percentage":
                commission_amount = sale_amount * (level_config["commission"] / 100)
            else:
                commission_amount = level_config["commission"]

            commissions.append({
                "affiliate_id": affiliate.id,
                "level": level,
                "commission_rate": level_config["commission"],
                "commission_amount": commission_amount,
            })

        # Subir al padre
        current_affiliate_id = affiliate.parent_affiliate_id
        level += 1

    return commissions


# =====================================================
# PROGRAMAS DE REFERIDOS
# =====================================================

@router.get("/programs", response_model=List[ReferralProgramResponse])
async def list_programs(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    active_only: bool = Query(False),
):
    """Listar programas de referidos"""
    query = select(ReferralProgram).where(
        ReferralProgram.workspace_id == current_user.workspace_id
    )

    if active_only:
        query = query.where(ReferralProgram.is_active == True)

    result = await db.execute(query.order_by(ReferralProgram.created_at.desc()))
    return result.scalars().all()


@router.post("/programs", response_model=ReferralProgramResponse, status_code=status.HTTP_201_CREATED)
async def create_program(
    program_data: ReferralProgramBase,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Crear programa de referidos"""
    program = ReferralProgram(
        workspace_id=current_user.workspace_id,
        **program_data.model_dump()
    )
    db.add(program)
    await db.commit()
    await db.refresh(program)
    return program


@router.put("/programs/{program_id}", response_model=ReferralProgramResponse)
async def update_program(
    program_id: UUID,
    program_data: ReferralProgramBase,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Actualizar programa de referidos"""
    result = await db.execute(
        select(ReferralProgram)
        .where(ReferralProgram.id == program_id)
        .where(ReferralProgram.workspace_id == current_user.workspace_id)
    )
    program = result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Programa no encontrado")

    for field, value in program_data.model_dump().items():
        setattr(program, field, value)

    await db.commit()
    await db.refresh(program)
    return program


# =====================================================
# AFILIADOS
# =====================================================

@router.get("/affiliates", response_model=List[AffiliateResponse])
async def list_affiliates(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = Query(None),
):
    """Listar afiliados del workspace"""
    query = select(Affiliate).where(Affiliate.workspace_id == current_user.workspace_id)

    if status:
        query = query.where(Affiliate.status == status)

    result = await db.execute(query.order_by(Affiliate.created_at.desc()))
    return result.scalars().all()


@router.post("/affiliates", response_model=AffiliateResponse, status_code=status.HTTP_201_CREATED)
async def create_affiliate(
    affiliate_data: AffiliateCreate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Registrar nuevo afiliado"""
    # Generar código único
    affiliate_code = generate_affiliate_code()
    while True:
        existing = await db.execute(
            select(Affiliate).where(Affiliate.affiliate_code == affiliate_code)
        )
        if not existing.scalar_one_or_none():
            break
        affiliate_code = generate_affiliate_code()

    # Buscar padre si se proporcionó código
    parent_id = None
    level = 1
    if affiliate_data.parent_affiliate_code:
        parent_result = await db.execute(
            select(Affiliate).where(Affiliate.affiliate_code == affiliate_data.parent_affiliate_code)
        )
        parent = parent_result.scalar_one_or_none()
        if parent:
            parent_id = parent.id
            level = parent.level + 1

    affiliate = Affiliate(
        workspace_id=current_user.workspace_id,
        affiliate_code=affiliate_code,
        display_name=affiliate_data.display_name,
        email=affiliate_data.email,
        phone=affiliate_data.phone,
        payment_method=affiliate_data.payment_method,
        payment_details=affiliate_data.payment_details,
        parent_affiliate_id=parent_id,
        level=level,
    )
    db.add(affiliate)
    await db.commit()
    await db.refresh(affiliate)
    return affiliate


@router.get("/affiliates/{affiliate_id}", response_model=AffiliateResponse)
async def get_affiliate(
    affiliate_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Obtener afiliado por ID"""
    result = await db.execute(
        select(Affiliate)
        .where(Affiliate.id == affiliate_id)
        .where(Affiliate.workspace_id == current_user.workspace_id)
    )
    affiliate = result.scalar_one_or_none()

    if not affiliate:
        raise HTTPException(status_code=404, detail="Afiliado no encontrado")

    return affiliate


@router.put("/affiliates/{affiliate_id}/approve")
async def approve_affiliate(
    affiliate_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Aprobar afiliado"""
    result = await db.execute(
        select(Affiliate)
        .where(Affiliate.id == affiliate_id)
        .where(Affiliate.workspace_id == current_user.workspace_id)
    )
    affiliate = result.scalar_one_or_none()

    if not affiliate:
        raise HTTPException(status_code=404, detail="Afiliado no encontrado")

    affiliate.status = "active"
    affiliate.approved_at = datetime.utcnow()
    affiliate.approved_by = current_user.id

    await db.commit()
    return {"message": "Afiliado aprobado correctamente"}


@router.get("/affiliates/{affiliate_id}/dashboard", response_model=AffiliateDashboard)
async def get_affiliate_dashboard(
    affiliate_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Obtener dashboard del afiliado"""
    # Obtener afiliado
    result = await db.execute(
        select(Affiliate)
        .where(Affiliate.id == affiliate_id)
        .where(Affiliate.workspace_id == current_user.workspace_id)
    )
    affiliate = result.scalar_one_or_none()

    if not affiliate:
        raise HTTPException(status_code=404, detail="Afiliado no encontrado")

    # Contar clics totales
    clicks_result = await db.execute(
        select(func.sum(ReferralLink.clicks))
        .where(ReferralLink.affiliate_id == affiliate_id)
    )
    total_clicks = clicks_result.scalar() or 0

    # Contar enlaces
    links_result = await db.execute(
        select(func.count(ReferralLink.id))
        .where(ReferralLink.affiliate_id == affiliate_id)
    )
    links_count = links_result.scalar() or 0

    # Conversiones recientes
    conversions_result = await db.execute(
        select(ReferralConversion)
        .where(ReferralConversion.affiliate_id == affiliate_id)
        .order_by(ReferralConversion.converted_at.desc())
        .limit(10)
    )
    recent_conversions = conversions_result.scalars().all()

    # Calcular tasa de conversión
    conversion_rate = (affiliate.total_conversions / total_clicks * 100) if total_clicks > 0 else 0

    return AffiliateDashboard(
        affiliate=affiliate,
        total_clicks=total_clicks,
        total_conversions=affiliate.total_conversions,
        conversion_rate=round(conversion_rate, 2),
        total_earnings=float(affiliate.total_earnings or 0),
        pending_earnings=float(affiliate.pending_earnings or 0),
        paid_earnings=float(affiliate.paid_earnings or 0),
        recent_conversions=recent_conversions,
        links_count=links_count,
    )


# =====================================================
# ENLACES DE REFERIDO
# =====================================================

@router.get("/links", response_model=List[ReferralLinkResponse])
async def list_links(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    affiliate_id: Optional[UUID] = Query(None),
):
    """Listar enlaces de referido"""
    query = select(ReferralLink).join(Affiliate).where(
        Affiliate.workspace_id == current_user.workspace_id
    )

    if affiliate_id:
        query = query.where(ReferralLink.affiliate_id == affiliate_id)

    result = await db.execute(query.order_by(ReferralLink.created_at.desc()))
    links = result.scalars().all()

    # Agregar URL completa
    for link in links:
        link.full_url = f"https://trackfiz.com/r/{link.link_code}"

    return links


@router.post("/links", response_model=ReferralLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_link(
    link_data: ReferralLinkCreate,
    affiliate_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Crear enlace de referido"""
    # Verificar que el afiliado existe
    affiliate_result = await db.execute(
        select(Affiliate)
        .where(Affiliate.id == affiliate_id)
        .where(Affiliate.workspace_id == current_user.workspace_id)
    )
    affiliate = affiliate_result.scalar_one_or_none()

    if not affiliate:
        raise HTTPException(status_code=404, detail="Afiliado no encontrado")

    # Generar código único
    link_code = generate_link_code()
    while True:
        existing = await db.execute(
            select(ReferralLink).where(ReferralLink.link_code == link_code)
        )
        if not existing.scalar_one_or_none():
            break
        link_code = generate_link_code()

    link = ReferralLink(
        affiliate_id=affiliate_id,
        link_code=link_code,
        **link_data.model_dump()
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)

    link.full_url = f"https://trackfiz.com/r/{link.link_code}"
    return link


# =====================================================
# TRACKING DE CLICS (Público)
# =====================================================

@router.get("/track/{link_code}")
async def track_click(
    link_code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Registrar clic y redirigir (endpoint público)"""
    result = await db.execute(
        select(ReferralLink).where(ReferralLink.link_code == link_code)
    )
    link = result.scalar_one_or_none()

    if not link or not link.is_active:
        raise HTTPException(status_code=404, detail="Enlace no encontrado")

    # Registrar clic
    click = ReferralClick(
        link_id=link.id,
        affiliate_id=link.affiliate_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        referrer_url=request.headers.get("referer"),
    )
    db.add(click)

    # Actualizar contador
    link.clicks = (link.clicks or 0) + 1

    await db.commit()

    # Construir URL de destino con UTM
    destination = link.destination_url
    params = []
    if link.utm_source:
        params.append(f"utm_source={link.utm_source}")
    if link.utm_medium:
        params.append(f"utm_medium={link.utm_medium}")
    if link.utm_campaign:
        params.append(f"utm_campaign={link.utm_campaign}")
    params.append(f"ref={link.link_code}")

    if params:
        separator = "&" if "?" in destination else "?"
        destination = f"{destination}{separator}{'&'.join(params)}"

    return {"redirect_url": destination}


# =====================================================
# CONVERSIONES
# =====================================================

@router.post("/conversions", response_model=ConversionResponse, status_code=status.HTTP_201_CREATED)
async def register_conversion(
    conversion_data: ConversionCreate,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Registrar conversión"""
    # Buscar afiliado por código
    affiliate_result = await db.execute(
        select(Affiliate).where(Affiliate.affiliate_code == conversion_data.affiliate_code)
    )
    affiliate = affiliate_result.scalar_one_or_none()

    if not affiliate or affiliate.status != "active":
        raise HTTPException(status_code=404, detail="Afiliado no encontrado o inactivo")

    # Obtener programa activo
    program_result = await db.execute(
        select(ReferralProgram)
        .where(ReferralProgram.workspace_id == current_user.workspace_id)
        .where(ReferralProgram.is_active == True)
        .limit(1)
    )
    program = program_result.scalar_one_or_none()

    if not program:
        # Usar comisión por defecto
        commission_rate = 10
        commission_amount = conversion_data.sale_amount * 0.10
    else:
        if program.program_type == "multilevel":
            # Calcular comisiones multinivel
            commissions = await calculate_multilevel_commissions(
                db, affiliate.id, conversion_data.sale_amount, program
            )
            # Crear conversiones para cada nivel
            for comm in commissions:
                conversion = ReferralConversion(
                    workspace_id=current_user.workspace_id,
                    affiliate_id=comm["affiliate_id"],
                    program_id=program.id,
                    conversion_type=conversion_data.conversion_type,
                    sale_amount=conversion_data.sale_amount,
                    commission_rate=comm["commission_rate"],
                    commission_amount=comm["commission_amount"],
                    affiliate_level=comm["level"],
                    converted_client_id=conversion_data.converted_client_id,
                    payment_id=conversion_data.payment_id,
                    subscription_id=conversion_data.subscription_id,
                )
                db.add(conversion)

                # Actualizar estadísticas del afiliado
                aff_result = await db.execute(
                    select(Affiliate).where(Affiliate.id == comm["affiliate_id"])
                )
                aff = aff_result.scalar_one_or_none()
                if aff:
                    aff.total_conversions = (aff.total_conversions or 0) + 1
                    aff.total_earnings = float(aff.total_earnings or 0) + comm["commission_amount"]
                    aff.pending_earnings = float(aff.pending_earnings or 0) + comm["commission_amount"]

            await db.commit()
            return commissions[0] if commissions else None
        else:
            # Comisión simple
            if program.commission_type == "percentage":
                commission_rate = float(program.commission_value)
                commission_amount = conversion_data.sale_amount * (commission_rate / 100)
            else:
                commission_rate = 0
                commission_amount = float(program.commission_value)

    # Crear conversión
    conversion = ReferralConversion(
        workspace_id=current_user.workspace_id,
        affiliate_id=affiliate.id,
        program_id=program.id if program else None,
        conversion_type=conversion_data.conversion_type,
        sale_amount=conversion_data.sale_amount,
        commission_rate=commission_rate,
        commission_amount=commission_amount,
        affiliate_level=1,
        converted_client_id=conversion_data.converted_client_id,
        payment_id=conversion_data.payment_id,
        subscription_id=conversion_data.subscription_id,
    )
    db.add(conversion)

    # Actualizar estadísticas del afiliado
    affiliate.total_conversions = (affiliate.total_conversions or 0) + 1
    affiliate.total_earnings = float(affiliate.total_earnings or 0) + commission_amount
    affiliate.pending_earnings = float(affiliate.pending_earnings or 0) + commission_amount

    await db.commit()
    await db.refresh(conversion)
    return conversion


@router.get("/conversions", response_model=List[ConversionResponse])
async def list_conversions(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    affiliate_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
):
    """Listar conversiones"""
    query = select(ReferralConversion).where(
        ReferralConversion.workspace_id == current_user.workspace_id
    )

    if affiliate_id:
        query = query.where(ReferralConversion.affiliate_id == affiliate_id)
    if status:
        query = query.where(ReferralConversion.status == status)

    result = await db.execute(query.order_by(ReferralConversion.converted_at.desc()))
    return result.scalars().all()


@router.put("/conversions/{conversion_id}/approve")
async def approve_conversion(
    conversion_id: UUID,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Aprobar conversión"""
    result = await db.execute(
        select(ReferralConversion)
        .where(ReferralConversion.id == conversion_id)
        .where(ReferralConversion.workspace_id == current_user.workspace_id)
    )
    conversion = result.scalar_one_or_none()

    if not conversion:
        raise HTTPException(status_code=404, detail="Conversión no encontrada")

    conversion.status = "approved"
    conversion.approved_at = datetime.utcnow()

    await db.commit()
    return {"message": "Conversión aprobada"}


# =====================================================
# PAGOS A AFILIADOS
# =====================================================

@router.get("/payouts", response_model=List[PayoutResponse])
async def list_payouts(
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
    affiliate_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
):
    """Listar pagos a afiliados"""
    query = select(AffiliatePayout).where(
        AffiliatePayout.workspace_id == current_user.workspace_id
    )

    if affiliate_id:
        query = query.where(AffiliatePayout.affiliate_id == affiliate_id)
    if status:
        query = query.where(AffiliatePayout.status == status)

    result = await db.execute(query.order_by(AffiliatePayout.created_at.desc()))
    return result.scalars().all()


@router.post("/payouts/generate")
async def generate_payouts(
    period_start: date,
    period_end: date,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Generar pagos pendientes para el período"""
    # Obtener conversiones aprobadas no pagadas
    conversions_result = await db.execute(
        select(ReferralConversion)
        .where(ReferralConversion.workspace_id == current_user.workspace_id)
        .where(ReferralConversion.status == "approved")
        .where(ReferralConversion.converted_at >= period_start)
        .where(ReferralConversion.converted_at <= period_end)
    )
    conversions = conversions_result.scalars().all()

    # Agrupar por afiliado
    affiliate_conversions = {}
    for conv in conversions:
        if conv.affiliate_id not in affiliate_conversions:
            affiliate_conversions[conv.affiliate_id] = []
        affiliate_conversions[conv.affiliate_id].append(conv)

    payouts_created = 0
    for affiliate_id, convs in affiliate_conversions.items():
        gross_amount = sum(float(c.commission_amount) for c in convs)

        payout = AffiliatePayout(
            workspace_id=current_user.workspace_id,
            affiliate_id=affiliate_id,
            period_start=period_start,
            period_end=period_end,
            gross_amount=gross_amount,
            net_amount=gross_amount,
            conversion_ids=[c.id for c in convs],
            conversions_count=len(convs),
        )
        db.add(payout)
        payouts_created += 1

    await db.commit()
    return {"message": f"Se generaron {payouts_created} pagos pendientes"}


# =====================================================
# BIBLIOTECA DE SUPLEMENTOS CON REFERIDOS
# =====================================================

@router.get("/supplements", response_model=List[SupplementReferralResponse])
async def list_supplement_referrals(
    db: AsyncSession = Depends(get_db),
    category: Optional[str] = Query(None),
    featured_only: bool = Query(False),
):
    """Listar suplementos con programa de referidos (público)"""
    query = select(SupplementReferral).where(SupplementReferral.is_active == True)

    if category:
        query = query.where(SupplementReferral.category == category)
    if featured_only:
        query = query.where(SupplementReferral.is_featured == True)

    result = await db.execute(query.order_by(SupplementReferral.supplement_name))
    return result.scalars().all()


@router.post("/supplements", response_model=SupplementReferralResponse, status_code=status.HTTP_201_CREATED)
async def create_supplement_referral(
    supplement_data: SupplementReferralBase,
    current_user: Any = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Crear suplemento con programa de referidos (admin)"""
    supplement = SupplementReferral(**supplement_data.model_dump())
    db.add(supplement)
    await db.commit()
    await db.refresh(supplement)
    return supplement
