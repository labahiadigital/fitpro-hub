"""Plantillas de campaña con descuento + envío masivo a un segmento.

Estas plantillas están pensadas para los flujos de remarketing del
entrenador (carrito abandonado, clientes inactivos), pero también
sirven como plantillas genéricas reutilizables.
"""
import asyncio
import html as html_mod
import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import CurrentUser, require_staff
from app.models.client import Client
from app.models.email_tracking import EmailCampaignTemplate
from app.models.invitation import ClientInvitation
from app.models.payment import Payment, PaymentStatus, Subscription, SubscriptionStatus
from app.services.email import email_service

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class CampaignTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    subject: str = Field(..., min_length=1, max_length=255)
    body_html: str = Field(..., min_length=1)
    target_segment: str = Field("custom", description="abandoned_cart | inactive | reminder | custom")
    discount_type: Optional[str] = Field(None, description="percent | amount")
    discount_value: Optional[float] = None
    discount_code: Optional[str] = None
    is_active: bool = True


class CampaignTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    target_segment: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    discount_code: Optional[str] = None
    is_active: Optional[bool] = None


class CampaignTemplateResponse(BaseModel):
    id: UUID
    name: str
    subject: str
    body_html: str
    target_segment: str
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    discount_code: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CampaignSendRequest(BaseModel):
    template_id: UUID
    # Lista explícita de destinatarios. La UI calcula el segmento y
    # envía sólo los IDs filtrados (con marketing consent etc.) para
    # que el backend no tenga que reaplicar la misma lógica de filtros.
    recipient_client_ids: Optional[List[UUID]] = None
    recipient_invitation_ids: Optional[List[UUID]] = None


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


@router.get("/email-templates", response_model=List[CampaignTemplateResponse])
async def list_campaign_templates(
    target_segment: Optional[str] = None,
    only_active: bool = True,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    q = select(EmailCampaignTemplate).where(
        EmailCampaignTemplate.workspace_id == current_user.workspace_id
    )
    if target_segment:
        q = q.where(EmailCampaignTemplate.target_segment == target_segment)
    if only_active:
        q = q.where(EmailCampaignTemplate.is_active.is_(True))
    q = q.order_by(desc(EmailCampaignTemplate.created_at))
    rows = (await db.execute(q)).scalars().all()
    return [CampaignTemplateResponse.model_validate(t) for t in rows]


@router.post(
    "/email-templates",
    response_model=CampaignTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_campaign_template(
    data: CampaignTemplateCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    if data.discount_type and data.discount_type not in ("percent", "amount"):
        raise HTTPException(status_code=400, detail="discount_type debe ser 'percent' o 'amount'")
    template = EmailCampaignTemplate(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        name=data.name,
        subject=data.subject,
        body_html=data.body_html,
        target_segment=data.target_segment,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        discount_code=data.discount_code,
        is_active=data.is_active,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return CampaignTemplateResponse.model_validate(template)


@router.put("/email-templates/{template_id}", response_model=CampaignTemplateResponse)
async def update_campaign_template(
    template_id: UUID,
    data: CampaignTemplateUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(EmailCampaignTemplate).where(
            EmailCampaignTemplate.id == template_id,
            EmailCampaignTemplate.workspace_id == current_user.workspace_id,
        )
    )
    template = res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    payload = data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        setattr(template, field, value)
    await db.commit()
    await db.refresh(template)
    return CampaignTemplateResponse.model_validate(template)


@router.delete("/email-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign_template(
    template_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(EmailCampaignTemplate).where(
            EmailCampaignTemplate.id == template_id,
            EmailCampaignTemplate.workspace_id == current_user.workspace_id,
        )
    )
    template = res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    await db.delete(template)
    await db.commit()


# ---------------------------------------------------------------------------
# Envío
# ---------------------------------------------------------------------------


def _render_template_body(template: EmailCampaignTemplate, *, name: str) -> str:
    """Sustituye placeholders simples ``{{name}}`` y ``{{discount}}``."""
    body = template.body_html
    safe_name = html_mod.escape(name or "atleta")
    body = body.replace("{{name}}", safe_name)
    body = body.replace("{{nombre}}", safe_name)

    if template.discount_value is not None:
        if template.discount_type == "percent":
            body = body.replace("{{discount}}", f"{int(template.discount_value)}%")
        else:
            body = body.replace("{{discount}}", f"{template.discount_value:.2f} €")
    if template.discount_code:
        body = body.replace("{{code}}", html_mod.escape(template.discount_code))
        body = body.replace("{{codigo}}", html_mod.escape(template.discount_code))
    return body


@router.post("/email-campaigns/send")
async def send_campaign(
    data: CampaignSendRequest,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Envía la plantilla a los clientes/invitaciones indicados.

    El frontend resuelve el segmento (carrito abandonado, inactivo) y
    pasa explícitamente los IDs de destinatarios. Aquí solo recogemos
    sus emails y nombres reales y disparamos los envíos en paralelo.
    """
    res = await db.execute(
        select(EmailCampaignTemplate).where(
            EmailCampaignTemplate.id == data.template_id,
            EmailCampaignTemplate.workspace_id == current_user.workspace_id,
        )
    )
    template = res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    recipients: list[dict] = []
    if data.recipient_client_ids:
        clients = (await db.execute(
            select(Client).where(
                Client.id.in_(data.recipient_client_ids),
                Client.workspace_id == current_user.workspace_id,
                Client.deleted_at.is_(None),
            )
        )).scalars().all()
        for c in clients:
            if not c.email:
                continue
            recipients.append({
                "email": c.email,
                "name": c.full_name,
                "client_id": c.id,
                "invitation_id": None,
            })
    if data.recipient_invitation_ids:
        invs = (await db.execute(
            select(ClientInvitation).where(
                ClientInvitation.id.in_(data.recipient_invitation_ids),
                ClientInvitation.workspace_id == current_user.workspace_id,
            )
        )).scalars().all()
        for inv in invs:
            if not inv.email:
                continue
            recipients.append({
                "email": inv.email,
                "name": f"{inv.first_name or ''} {inv.last_name or ''}".strip() or inv.email,
                "client_id": None,
                "invitation_id": inv.id,
            })

    if not recipients:
        raise HTTPException(status_code=400, detail="No se especificaron destinatarios")

    async def _send_one(r: dict) -> bool:
        body = _render_template_body(template, name=r["name"])
        result = await email_service.send_email(
            to_email=r["email"],
            to_name=r["name"],
            subject=template.subject,
            html_content=body,
            tracking={
                "workspace_id": current_user.workspace_id,
                "client_id": r.get("client_id"),
                "invitation_id": r.get("invitation_id"),
                "template_kind": f"campaign:{template.target_segment}",
                "update_invitation": r.get("invitation_id") is not None,
                "payload": {"template_id": str(template.id)},
            },
        )
        return bool(result)

    results = await asyncio.gather(*(_send_one(r) for r in recipients), return_exceptions=True)
    sent = sum(1 for r in results if r is True)
    failed = len(results) - sent
    return {
        "sent": sent,
        "failed": failed,
        "total": len(recipients),
    }
