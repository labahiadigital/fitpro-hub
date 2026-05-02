"""Client invitation endpoints."""
import secrets
from datetime import datetime, timedelta

from dateutil.relativedelta import relativedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.config import settings
from app.models.invitation import ClientInvitation, InvitationStatus

# String constants for status values (matching database)
STATUS_PENDING = "pending"
STATUS_ACCEPTED = "accepted"
STATUS_EXPIRED = "expired"
STATUS_CANCELLED = "cancelled"
from app.models.workspace import Workspace
from app.models.client import Client
from app.models.user import User, UserRole, RoleType
from app.models.payment import Payment, PaymentStatus, Subscription, SubscriptionStatus
from app.models.product import Product
from app.middleware.auth import require_staff, require_workspace, CurrentUser
from app.core.security import (
    get_password_hash,
    create_tokens,
    verify_password,
)
import logging
import traceback
from datetime import timezone

logger = logging.getLogger(__name__)
from app.services.email import email_service, EmailTemplates
from app.services.product_capacity import ensure_product_capacity
from app.tasks.notifications import send_email_task
from app.services.onboarding import (
    attach_onboarding_progress_photo,
    enrich_onboarding_health_data,
)

router = APIRouter()


# ============ Schemas ============

class InvitationCreate(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    message: Optional[str] = None
    expires_days: int = 7
    product_id: Optional[UUID] = None


class InvitationResponse(BaseModel):
    id: UUID
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    status: str
    token: str
    expires_at: datetime
    created_at: datetime
    invitation_url: str
    
    class Config:
        from_attributes = True


class InvitationListResponse(BaseModel):
    items: List[InvitationResponse]
    total: int


class ResendInvitationRequest(BaseModel):
    invitation_id: UUID


class ProductInfo(BaseModel):
    """Product/plan info included in invitation validation."""
    id: UUID
    name: str
    description: Optional[str] = None
    price: float
    currency: str = "EUR"
    interval: Optional[str] = None
    product_type: str = "subscription"


class ValidateTokenResponse(BaseModel):
    valid: bool
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    workspace_name: Optional[str] = None
    workspace_slug: Optional[str] = None
    message: Optional[str] = None
    product: Optional[ProductInfo] = None
    payment_completed: bool = False


# ============ Email Templates ============

def get_invitation_email_html(
    client_name: str,
    trainer_name: str,
    workspace_name: str,
    invitation_url: str,
    custom_message: Optional[str] = None,
) -> str:
    """Generate HTML email for client invitation."""
    message_section = f"""
        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2D6A4F;">
            <p style="margin: 0; color: #333; font-style: italic;">"{custom_message}"</p>
            <p style="margin: 5px 0 0; color: #666; font-size: 12px;">- {trainer_name}</p>
        </div>
    """ if custom_message else ""
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <tr>
                <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">¡Bienvenido a {workspace_name}!</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 40px 30px;">
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        Hola{f' <strong>{client_name}</strong>' if client_name else ''},
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                        <strong>{trainer_name}</strong> te ha invitado a unirte a <strong>{workspace_name}</strong> 
                        para comenzar tu programa de entrenamiento personalizado.
                    </p>
                    
                    {message_section}
                    
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                        Para completar tu registro, haz clic en el siguiente botón:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invitation_url}" 
                           style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #C9A227 100%); 
                                  color: #1a1a2e; padding: 15px 40px; text-decoration: none; 
                                  border-radius: 8px; font-weight: bold; font-size: 16px;
                                  box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                            Completar mi Registro
                        </a>
                    </div>
                    
                    <p style="color: #999; font-size: 14px; line-height: 1.6;">
                        Este enlace expirará en 7 días. Si no solicitaste esta invitación, 
                        puedes ignorar este correo.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                        <a href="{invitation_url}" style="color: #D4AF37; word-break: break-all;">{invitation_url}</a>
                    </p>
                </td>
            </tr>
            <tr>
                <td style="background: #1a1a2e; padding: 20px 30px; text-align: center;">
                    <p style="color: #888; font-size: 12px; margin: 0;">
                        © 2026 {workspace_name} · Powered by Trackfiz
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


# ============ Endpoints ============

@router.post("", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def create_invitation(
    data: InvitationCreate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """
    Create and send a client invitation.
    Only trainers/staff can invite clients.
    """
    # Get workspace info
    workspace_result = await db.execute(
        select(Workspace).where(Workspace.id == current_user.workspace_id)
    )
    workspace = workspace_result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace no encontrado"
        )
    
    # Check if email already has a pending invitation
    existing_result = await db.execute(
        select(ClientInvitation).where(
            ClientInvitation.workspace_id == current_user.workspace_id,
            ClientInvitation.email == data.email,
            ClientInvitation.status == STATUS_PENDING,
        )
    )
    existing = existing_result.scalar_one_or_none()
    
    if existing and not existing.is_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una invitación pendiente para este email"
        )
    
    # Check if client already exists in workspace
    client_result = await db.execute(
        select(Client).where(
            Client.workspace_id == current_user.workspace_id,
            Client.email == data.email,
        )
    )
    existing_client = client_result.scalar_one_or_none()
    
    if existing_client and existing_client.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este cliente ya tiene una cuenta activa"
        )
    
    # Validate product if provided
    product = None
    if data.product_id:
        product_result = await db.execute(
            select(Product).where(
                Product.id == data.product_id,
                Product.workspace_id == current_user.workspace_id,
                Product.is_active == True,
            )
        )
        product = product_result.scalar_one_or_none()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado o no activo"
            )

        # Enforce seat cap (max_users) before reserving the slot with the invitation
        await ensure_product_capacity(db, product)

    # Generate unique token
    token = secrets.token_urlsafe(32)
    
    # Calculate expiration
    expires_at = datetime.utcnow() + timedelta(days=data.expires_days)
    
    # Create invitation
    invitation = ClientInvitation(
        workspace_id=current_user.workspace_id,
        invited_by=current_user.id,
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        token=token,
        status=STATUS_PENDING,
        expires_at=expires_at,
        client_id=existing_client.id if existing_client else None,
        message=data.message,
        product_id=data.product_id,
    )
    
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)
    
    # Build invitation URL
    invitation_url = f"{settings.FRONTEND_URL}/onboarding/invite/{token}"
    
    # Send invitation email
    client_name = f"{data.first_name or ''} {data.last_name or ''}".strip() or None
    trainer_name = current_user.user.full_name or "Tu entrenador"
    
    email_html = get_invitation_email_html(
        client_name=client_name,
        trainer_name=trainer_name,
        workspace_name=workspace.name,
        invitation_url=invitation_url,
        custom_message=data.message,
    )
    
    # Send email in background
    background_tasks.add_task(
        send_email_task.delay,
        to_email=data.email,
        subject=f"Invitación a {workspace.name}",
        html_content=email_html,
    )
    
    return InvitationResponse(
        id=invitation.id,
        email=invitation.email,
        first_name=invitation.first_name,
        last_name=invitation.last_name,
        status=invitation.status.value,
        token=invitation.token,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
        invitation_url=invitation_url,
    )


@router.get("", response_model=InvitationListResponse)
async def list_invitations(
    status_filter: Optional[str] = Query(
        None,
        alias="status",
        description="Filter by invitation status (pending/accepted/expired/cancelled)",
    ),
    limit: int = 200,
    offset: int = 0,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """List all invitations for the workspace (paginated)."""
    limit = max(1, min(limit, 500))
    offset = max(0, offset)

    base_filters = [ClientInvitation.workspace_id == current_user.workspace_id]
    if status_filter:
        base_filters.append(ClientInvitation.status == status_filter)

    # Total count (independent of pagination) so the client can paginate.
    total_q = select(sa_func.count()).select_from(ClientInvitation).where(*base_filters)
    total = int((await db.scalar(total_q)) or 0)

    query = (
        select(ClientInvitation)
        .where(*base_filters)
        .order_by(ClientInvitation.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    result = await db.execute(query)
    invitations = result.scalars().all()

    items = []
    for inv in invitations:
        invitation_url = f"{settings.FRONTEND_URL}/onboarding/invite/{inv.token}"
        items.append(InvitationResponse(
            id=inv.id,
            email=inv.email,
            first_name=inv.first_name,
            last_name=inv.last_name,
            status=inv.status.value,
            token=inv.token,
            expires_at=inv.expires_at,
            created_at=inv.created_at,
            invitation_url=invitation_url,
        ))

    return InvitationListResponse(items=items, total=total)


@router.post("/{invitation_id}/resend", response_model=InvitationResponse)
async def resend_invitation(
    invitation_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Resend an invitation email and optionally extend expiration."""
    result = await db.execute(
        select(ClientInvitation).where(
            ClientInvitation.id == invitation_id,
            ClientInvitation.workspace_id == current_user.workspace_id,
        )
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitación no encontrada"
        )
    
    if invitation.status == STATUS_ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta invitación ya fue aceptada"
        )
    
    # Get workspace info
    workspace_result = await db.execute(
        select(Workspace).where(Workspace.id == current_user.workspace_id)
    )
    workspace = workspace_result.scalar_one()
    
    # Extend expiration if expired
    if invitation.is_expired:
        invitation.expires_at = datetime.utcnow() + timedelta(days=7)
        invitation.status = STATUS_PENDING
    
    await db.commit()
    await db.refresh(invitation)
    
    # Build invitation URL
    invitation_url = f"{settings.FRONTEND_URL}/onboarding/invite/{invitation.token}"
    
    # Send email
    client_name = f"{invitation.first_name or ''} {invitation.last_name or ''}".strip() or None
    trainer_name = current_user.user.full_name or "Tu entrenador"
    
    email_html = get_invitation_email_html(
        client_name=client_name,
        trainer_name=trainer_name,
        workspace_name=workspace.name,
        invitation_url=invitation_url,
        custom_message=invitation.message,
    )
    
    # Encolamos el envío en Celery. Antes el código envolvía
    # ``send_email_task.delay`` dentro de ``background_tasks.add_task``,
    # lo que añadía una capa redundante (delay() ya devuelve al instante)
    # y, si Celery no respondía, el error se "tragaba" silenciosamente y
    # nunca llegaba el correo al cliente. Ahora encolamos directamente y
    # capturamos errores para hacer fallback síncrono usando el
    # email_service: así el reenvío nunca se pierde aunque la cola esté
    # caída.
    email_sent = False
    try:
        send_email_task.delay(
            to_email=invitation.email,
            subject=f"Recordatorio: Invitación a {workspace.name}",
            html_content=email_html,
        )
        email_sent = True
        logger.info(f"Resend invitation email queued for {invitation.email}")
    except Exception as exc:
        logger.warning(
            f"Could not queue resend email for {invitation.email} via Celery: {exc}. "
            "Falling back to synchronous send."
        )

    if not email_sent:
        try:
            await email_service.send_email(
                to_email=invitation.email,
                to_name=client_name,
                subject=f"Recordatorio: Invitación a {workspace.name}",
                html_content=email_html,
            )
            logger.info(f"Resend invitation email sent synchronously to {invitation.email}")
        except Exception as exc:
            logger.error(f"Failed to resend invitation email to {invitation.email}: {exc}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo reenviar el correo de invitación. Inténtalo en unos minutos.",
            )

    return InvitationResponse(
        id=invitation.id,
        email=invitation.email,
        first_name=invitation.first_name,
        last_name=invitation.last_name,
        status=invitation.status.value,
        token=invitation.token,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
        invitation_url=invitation_url,
    )


@router.delete("/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_invitation(
    invitation_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending invitation."""
    result = await db.execute(
        select(ClientInvitation).where(
            ClientInvitation.id == invitation_id,
            ClientInvitation.workspace_id == current_user.workspace_id,
        )
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitación no encontrada"
        )
    
    if invitation.status == STATUS_ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede cancelar una invitación ya aceptada"
        )
    
    invitation.status = STATUS_CANCELLED
    await db.commit()


@router.get("/validate/{token}", response_model=ValidateTokenResponse)
async def validate_invitation_token(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Validate an invitation token (public endpoint).
    Returns invitation details if valid.
    """
    result = await db.execute(
        select(ClientInvitation).where(ClientInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        return ValidateTokenResponse(valid=False)
    
    if invitation.status != STATUS_PENDING:
        return ValidateTokenResponse(valid=False)
    
    if invitation.is_expired:
        invitation.status = STATUS_EXPIRED
        await db.commit()
        return ValidateTokenResponse(valid=False)
    
    # Get workspace info
    workspace_result = await db.execute(
        select(Workspace).where(Workspace.id == invitation.workspace_id)
    )
    workspace = workspace_result.scalar_one()
    
    # Get product info if linked
    product_info = None
    if invitation.product_id:
        product_result = await db.execute(
            select(Product).where(Product.id == invitation.product_id)
        )
        product = product_result.scalar_one_or_none()
        if product:
            product_info = ProductInfo(
                id=product.id,
                name=product.name,
                description=product.description,
                price=float(product.price),
                currency=product.currency or "EUR",
                interval=product.interval,
                product_type=product.product_type,
            )
    
    # Check if payment already completed
    payment_completed = False
    if invitation.payment_id:
        payment_result = await db.execute(
            select(Payment).where(Payment.id == invitation.payment_id)
        )
        payment = payment_result.scalar_one_or_none()
        if payment and payment.status == PaymentStatus.succeeded:
            payment_completed = True
    
    return ValidateTokenResponse(
        valid=True,
        email=invitation.email,
        first_name=invitation.first_name,
        last_name=invitation.last_name,
        workspace_name=workspace.name,
        workspace_slug=workspace.slug,
        message=invitation.message,
        product=product_info,
        payment_completed=payment_completed,
    )


@router.post("/accept/{token}")
async def accept_invitation(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Mark an invitation as accepted.
    Called after client completes onboarding.
    """
    result = await db.execute(
        select(ClientInvitation).where(ClientInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitación no encontrada"
        )
    
    if invitation.status == STATUS_ACCEPTED:
        return {"message": "Invitación ya aceptada"}
    
    if invitation.is_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La invitación ha expirado"
        )
    
    invitation.status = STATUS_ACCEPTED
    invitation.accepted_at = datetime.utcnow()
    await db.commit()
    
    return {"message": "Invitación aceptada correctamente"}


# Schema for invitation completion
class InvitationCompleteRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    goals: Optional[str] = None
    health_data: Optional[dict] = None
    consents: Optional[dict] = None
    progress_photo_data_url: Optional[str] = None
    progress_photo_type: Optional[str] = "front"


@router.post("/complete/{token}")
async def complete_invitation(
    token: str,
    data: InvitationCompleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Complete an invitation by creating user account and client profile.
    Uses local authentication (not Supabase).
    """
    # Find invitation
    result = await db.execute(
        select(ClientInvitation).where(ClientInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitación no encontrada"
        )
    
    if invitation.status == STATUS_ACCEPTED:
        # Idempotencia: si ya fue aceptada pero el usuario vuelve a enviar el
        # formulario (doble clic, reintento tras timeout, StrictMode en dev,
        # etc.), consideramos éxito silencioso en lugar de mostrar un error,
        # porque la cuenta ya existe.
        existing_user_result = await db.execute(
            select(User).where(User.email == data.email.lower())
        )
        existing_user = existing_user_result.scalar_one_or_none()
        if existing_user:
            # Si arrastraba email_verified=False de cuentas creadas con el
            # flujo antiguo, lo auto-verificamos ahora: completar la
            # invitación con el token correcto demuestra control del buzón.
            if not existing_user.email_verified:
                existing_user.email_verified = True
                existing_user.email_verification_token = None
                existing_user.email_verification_sent_at = None
                await db.commit()

            access_token, refresh_token = create_tokens(
                {"sub": str(existing_user.id), "email": existing_user.email}
            )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": settings.access_token_expire_minutes * 60,
                "refresh_token": refresh_token,
                "requires_email_verification": False,
                "user": {
                    "id": str(existing_user.id),
                    "email": existing_user.email,
                    "full_name": existing_user.full_name,
                },
                "already_completed": True,
            }
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La invitación ya fue utilizada"
        )
    
    if invitation.is_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La invitación ha expirado"
        )
    
    # MULTI-WORKSPACE: si el email ya existe en el sistema, no es un error
    # automático. Si la persona tiene cuenta en otro workspace, la dejamos
    # vincularse a este nuevo workspace siempre que demuestre conocer su
    # contraseña actual. Si ya es cliente activa de este mismo workspace,
    # entonces sí que debe iniciar sesión.
    email_lc = data.email.lower()
    result = await db.execute(
        select(User).where(User.email == email_lc)
    )
    existing_user = result.scalar_one_or_none()

    workspace_result = await db.execute(
        select(Workspace).where(Workspace.id == invitation.workspace_id)
    )
    workspace = workspace_result.scalar_one_or_none()

    if existing_user:
        if not existing_user.is_active or existing_user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta cuenta no está disponible. Contacta con soporte.",
            )
        # Verificamos que conoce la contraseña: para vincularse a otro
        # workspace debe demostrar que es el dueño de la cuenta.
        if not existing_user.password_hash or not verify_password(
            data.password, existing_user.password_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Ese email ya tiene cuenta en Trackfiz. Usa la misma "
                    "contraseña que ya tenías para vincular este perfil al "
                    "nuevo entrenador, o inicia sesión con tu cuenta."
                ),
            )
        # ¿ya es cliente activo de ESTE workspace?
        existing_client_q = await db.execute(
            select(Client).where(
                Client.workspace_id == invitation.workspace_id,
                Client.user_id == existing_user.id,
                Client.is_active == True,  # noqa: E712
                Client.deleted_at.is_(None),
            )
        )
        if existing_client_q.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Ya estás registrado en este workspace. Inicia sesión "
                    "con tu email y contraseña."
                ),
            )
    
    # Si la invitación exige pago, lo verificamos. Los productos gratuitos
    # (price <= 0) no requieren payment_id; el resto sí.
    if invitation.product_id:
        product_for_payment_q = await db.execute(
            select(Product).where(Product.id == invitation.product_id)
        )
        product_for_payment = product_for_payment_q.scalar_one_or_none()
        try:
            product_price_value = float(product_for_payment.price) if product_for_payment and product_for_payment.price is not None else 0.0
        except (TypeError, ValueError):
            product_price_value = 0.0
        requires_payment = product_for_payment is not None and product_price_value > 0

        if requires_payment:
            if not invitation.payment_id:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Esta invitación requiere pago. Completa el pago antes de registrarte.",
                )
            payment_result = await db.execute(
                select(Payment).where(Payment.id == invitation.payment_id)
            )
            payment_record = payment_result.scalar_one_or_none()
            if not payment_record or payment_record.status != PaymentStatus.succeeded:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="El pago no se ha completado correctamente.",
                )
    
    try:
        full_name = f"{data.first_name} {data.last_name}"
        enriched_health_data = enrich_onboarding_health_data(
            health_data=data.health_data,
            birth_date=data.birth_date,
            gender=data.gender,
            height_cm=data.height_cm,
            weight_kg=data.weight_kg,
        )

        is_returning_user = existing_user is not None

        if is_returning_user:
            # Reutilizamos la cuenta global. La contraseña ya se ha validado
            # arriba; no la sobrescribimos.
            user = existing_user
            user.is_active = True
            if not user.email_verified:
                # La persona ha demostrado conocer la contraseña, así que
                # legitimamos el email para no exigirle reverificarlo.
                user.email_verified = True
                user.email_verification_token = None
                user.email_verification_sent_at = None
        else:
            # Damos por verificado el email: la persona ha completado el
            # onboarding usando un token de invitación único que sólo existe
            # en el correo que el entrenador envió a esa dirección. Llegar
            # hasta aquí significa que controla el buzón.
            #
            # Esto evita el bug crónico "no me llega el email de verificación"
            # con clientes Hotmail/Outlook (filtros agresivos contra remitentes
            # transaccionales) que dejaba clientes legítimos sin poder entrar
            # tras pagar y rellenar el cuestionario.
            user = User(
                email=email_lc,
                full_name=full_name,
                phone=data.phone,
                password_hash=get_password_hash(data.password),
                email_verified=True,
                email_verification_token=None,
                email_verification_sent_at=None,
                is_active=True,
            )
            db.add(user)
            await db.flush()

        # UserRole en este workspace (puede no existir si es nuevo o si
        # venía de otro workspace).
        existing_role_q = await db.execute(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.workspace_id == invitation.workspace_id,
            )
        )
        existing_role = existing_role_q.scalar_one_or_none()
        if not existing_role:
            db.add(UserRole(
                user_id=user.id,
                workspace_id=invitation.workspace_id,
                role=RoleType.client,
                is_default=not is_returning_user,
            ))

        # Si ya hubiera un Client previo (p.ej. inactivo) en este workspace,
        # lo reactivamos. Si no, creamos uno nuevo.
        existing_client_q = await db.execute(
            select(Client).where(
                Client.workspace_id == invitation.workspace_id,
                Client.email == email_lc,
            )
        )
        client = existing_client_q.scalar_one_or_none()
        if client:
            client.user_id = user.id
            client.first_name = data.first_name
            client.last_name = data.last_name
            client.phone = data.phone or client.phone
            client.birth_date = data.birth_date or client.birth_date
            client.gender = data.gender or client.gender
            if data.height_cm is not None:
                client.height_cm = str(data.height_cm)
            if data.weight_kg is not None:
                client.weight_kg = str(data.weight_kg)
            if data.goals:
                client.goals = data.goals
            if enriched_health_data:
                client.health_data = enriched_health_data
            if data.consents:
                client.consents = data.consents
            client.is_active = True
            client.deleted_at = None
        else:
            client = Client(
                workspace_id=invitation.workspace_id,
                user_id=user.id,
                first_name=data.first_name,
                last_name=data.last_name,
                email=email_lc,
                phone=data.phone,
                birth_date=data.birth_date,
                gender=data.gender,
                height_cm=str(data.height_cm) if data.height_cm else None,
                weight_kg=str(data.weight_kg) if data.weight_kg else None,
                goals=data.goals,
                health_data=enriched_health_data,
                consents=data.consents or {},
                is_active=True,
            )
            db.add(client)
            await db.flush()
        await attach_onboarding_progress_photo(
            db=db,
            client=client,
            data_url=data.progress_photo_data_url,
            photo_type=data.progress_photo_type or "front",
        )
        
        # Create subscription if invitation has a product
        if invitation.product_id:
            product_result = await db.execute(
                select(Product).where(Product.id == invitation.product_id)
            )
            product = product_result.scalar_one_or_none()
            if product:
                # Final seat-cap guard: block if the product is full.
                # Exclude THIS invitation from the pending count to avoid a
                # false positive when we are about to convert it into a sub.
                await ensure_product_capacity(
                    db, product, exclude_invitation_id=invitation.id
                )

                now = datetime.now(timezone.utc)
                ic = product.interval_count or 1
                interval_map = {
                    "week": timedelta(weeks=ic),
                    "biweekly": timedelta(weeks=2 * ic),
                    "month": relativedelta(months=ic),
                    "quarter": relativedelta(months=3 * ic),
                    "semester": relativedelta(months=6 * ic),
                    "year": relativedelta(years=ic),
                }
                delta = interval_map.get(product.interval or "month", relativedelta(months=1))
                period_end = now + delta
                
                # Build subscription extra_data with COF tokens from payment
                sub_extra = {
                    "product_id": str(product.id),
                    "gateway": "redsys",
                    "invitation_id": str(invitation.id),
                }
                
                # Load payment to copy COF tokens for recurring charges
                pay = None
                if invitation.payment_id:
                    pay_result = await db.execute(
                        select(Payment).where(Payment.id == invitation.payment_id)
                    )
                    pay = pay_result.scalar_one_or_none()
                    if pay and pay.extra_data:
                        pay_extra = pay.extra_data
                        for key in ("redsys_identifier", "redsys_cof_txnid",
                                    "redsys_card_last4", "redsys_card_brand_name",
                                    "redsys_card_brand"):
                            if pay_extra.get(key):
                                sub_extra[key] = pay_extra[key]
                
                subscription = Subscription(
                    workspace_id=invitation.workspace_id,
                    client_id=client.id,
                    name=product.name,
                    description=product.description,
                    status=SubscriptionStatus.active,
                    amount=product.price,
                    currency=product.currency or "EUR",
                    interval=product.interval or "month",
                    current_period_start=now,
                    current_period_end=period_end,
                    extra_data=sub_extra,
                )
                db.add(subscription)
                await db.flush()
                
                # Link the payment to the subscription and client
                if pay:
                    pay.subscription_id = subscription.id
                    pay.client_id = client.id
                    pay.payment_type = "subscription"
                
                logger.info(
                    f"Subscription created: {subscription.name} for client {client.id}, "
                    f"amount={product.price} {product.currency}/{product.interval}"
                )
        
        # Mark invitation as accepted
        invitation.status = STATUS_ACCEPTED
        invitation.accepted_at = datetime.utcnow()
        invitation.client_id = client.id
        
        await db.commit()
        
        ws_name_for_email = workspace.name if workspace else None

        # Los emails se encolan en Celery EN VEZ de enviarse de forma
        # síncrona. Cada send_email puede tardar varios segundos contra
        # Brevo y, sumados al upload de la foto + creación de cuenta + 
        # cliente + suscripción, hacían que la request superase los 30s
        # de timeout del axios del frontend. El usuario veía "Error al
        # completar registro" aunque internamente la cuenta SÍ se había
        # creado; al reintentar, la idempotencia (status==accepted)
        # devolvía OK rápido y "funcionaba" la segunda vez.
        # Con la cola, el endpoint responde en <2s y los emails se
        # entregan de forma asíncrona con reintentos automáticos.

        # Email de bienvenida (no de verificación: ya hemos auto-verificado
        # arriba porque el token de invitación demuestra control del buzón).
        try:
            send_email_task.delay(
                to_email=data.email,
                subject="🚀 ¡Bienvenido/a a mi asesoría! Tus próximos pasos",
                html_content=EmailTemplates.client_welcome_after_onboarding(
                    full_name,
                    f"{settings.FRONTEND_URL}/my-dashboard",
                    workspace_name=ws_name_for_email,
                ),
            )
            logger.info(f"Welcome email queued for {data.email}")
        except Exception as e:
            logger.error(f"Failed to queue welcome email: {e}")

        # Login directo en todos los casos: el cliente acaba de demostrar
        # control del email (token de invitación único) o de la cuenta
        # existente (contraseña), así que no le exigimos un paso extra.
        access_token, refresh_token = create_tokens(
            {"sub": str(user.id), "email": user.email}
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.access_token_expire_minutes * 60,
            "refresh_token": refresh_token,
            "requires_email_verification": False,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
            },
        }
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error completing invitation: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al completar registro"
        )


class PublicProductSignupRequest(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class PublicProductSignupResponse(BaseModel):
    invitation_token: str
    invitation_url: str


@router.post("/public-signup/{workspace_slug}/{product_id}", response_model=PublicProductSignupResponse)
async def public_product_signup(
    workspace_slug: str,
    product_id: UUID,
    data: PublicProductSignupRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint: create a self-service invitation for a product.
    Used from the public product link to start the onboarding flow.
    """
    workspace_result = await db.execute(
        select(Workspace).where(Workspace.slug == workspace_slug)
    )
    workspace = workspace_result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace no encontrado")

    product_result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.workspace_id == workspace.id,
            Product.is_active == True,
        )
    )
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado o no disponible")

    # Enforce seat cap before locking the invitation token
    await ensure_product_capacity(db, product)

    # MULTI-WORKSPACE: un email puede existir en otros workspaces. Sólo
    # bloqueamos si la persona YA es cliente activa de ESTE workspace
    # concreto. Si tiene cuenta pero no está en este workspace, le dejamos
    # avanzar al onboarding -- en /complete/{token} se reutiliza el User
    # existente exigiéndole su contraseña actual (igual que en
    # /register-client).
    email_lc = data.email.lower()
    existing_user_q = await db.execute(
        select(User).where(User.email == email_lc)
    )
    existing_user = existing_user_q.scalar_one_or_none()
    if existing_user:
        already_in_ws_q = await db.execute(
            select(Client).where(
                Client.workspace_id == workspace.id,
                Client.user_id == existing_user.id,
                Client.is_active == True,  # noqa: E712
                Client.deleted_at.is_(None),
            )
        )
        if already_in_ws_q.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Ya tienes una cuenta activa con este entrenador. "
                    "Inicia sesión para acceder a tu plan."
                ),
            )

    owner_result = await db.execute(
        select(UserRole.user_id).where(
            UserRole.workspace_id == workspace.id,
            UserRole.role == RoleType.owner,
        ).limit(1)
    )
    owner_id = owner_result.scalar_one_or_none()
    if not owner_id:
        raise HTTPException(status_code=500, detail="Workspace sin propietario configurado")

    token = secrets.token_urlsafe(48)
    expires_at = datetime.utcnow() + timedelta(days=7)

    invitation = ClientInvitation(
        workspace_id=workspace.id,
        invited_by=owner_id,
        email=data.email.lower(),
        first_name=data.first_name,
        last_name=data.last_name,
        token=token,
        status=STATUS_PENDING,
        expires_at=expires_at,
        product_id=product_id,
    )

    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)

    frontend_url = settings.FRONTEND_URL.rstrip("/")
    invitation_url = f"{frontend_url}/onboarding/invite/{token}"

    return PublicProductSignupResponse(
        invitation_token=token,
        invitation_url=invitation_url,
    )
