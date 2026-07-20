"""Client invitation endpoints."""
import secrets
from datetime import datetime, timedelta

from dateutil.relativedelta import relativedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from sqlalchemy.orm import undefer
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.config import settings
from app.core.storage import resolve_url
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
from app.models.form import Form, FormSubmission
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
    attach_onboarding_progress_photo_background,
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
    logo_url: Optional[str] = None
    branding: Dict[str, Any] = {}
    message: Optional[str] = None
    product: Optional[ProductInfo] = None
    payment_completed: bool = False
    # Datos públicos de soporte del workspace (movil + email) que se
    # muestran al cliente en la pantalla post-pago si no recibe el email
    # de bienvenida. Vienen de Settings → Workspace → Soporte.
    support_phone: Optional[str] = None
    support_email: Optional[str] = None
    # Si la invitación trae ya móvil + contraseña + consentimientos
    # pre-rellenados (flujo público de producto que captura todo antes
    # del pago) la página de invitación salta el formulario de registro
    # y completa automáticamente al detectar el pago.
    data_complete: bool = False


# ============ Email Templates ============

from app.services.invitation_email import (
    build_client_invitation_email_html,
    invitation_email_subject,
)


def get_invitation_email_html(
    client_name: str,
    trainer_name: str,
    workspace_name: str,
    invitation_url: str,
    custom_message: Optional[str] = None,
    branding: Optional[Dict[str, Any]] = None,
    logo_url: Optional[str] = None,
) -> str:
    """Generate HTML email for client invitation (white-label)."""
    return build_client_invitation_email_html(
        workspace_name=workspace_name,
        trainer_name=trainer_name,
        invitation_url=invitation_url,
        client_name=client_name,
        custom_message=custom_message,
        branding=branding,
        logo_url=logo_url,
    )


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
    from app.core.workspace_url import workspace_public_base_url
    invitation_url = f"{workspace_public_base_url(workspace)}/onboarding/invite/{token}"
    
    # Send invitation email
    client_name = f"{data.first_name or ''} {data.last_name or ''}".strip() or None
    trainer_name = current_user.user.full_name or "Tu entrenador"
    
    email_html = get_invitation_email_html(
        client_name=client_name,
        trainer_name=trainer_name,
        workspace_name=workspace.name,
        invitation_url=invitation_url,
        custom_message=data.message,
        branding=workspace.branding or {},
        logo_url=await resolve_url(workspace.logo_url),
    )
    
    # Send email in background. ``tracking`` permite que el webhook de
    # Brevo cruce los eventos (delivered/opened/clicked) con la
    # invitación correcta y que aparezcan en /clients.
    background_tasks.add_task(
        send_email_task.delay,
        to_email=data.email,
        subject=invitation_email_subject(workspace.name, trainer_name),
        html_content=email_html,
        from_name=workspace.name,
        reply_to=(workspace.settings or {}).get("support", {}).get("email") if isinstance(workspace.settings, dict) else None,
        tracking={
            "workspace_id": str(workspace.id),
            "invitation_id": str(invitation.id),
            "user_id": str(current_user.id) if getattr(current_user, "id", None) else None,
            "template_kind": "invitation",
        },
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

    from app.core.workspace_url import workspace_public_base_url
    ws_result = await db.execute(
        select(Workspace).where(Workspace.id == current_user.workspace_id)
    )
    workspace = ws_result.scalar_one_or_none()
    base = workspace_public_base_url(workspace)

    items = []
    for inv in invitations:
        invitation_url = f"{base}/onboarding/invite/{inv.token}"
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
    from app.core.workspace_url import workspace_public_base_url
    invitation_url = f"{workspace_public_base_url(workspace)}/onboarding/invite/{invitation.token}"
    
    # Send email
    client_name = f"{invitation.first_name or ''} {invitation.last_name or ''}".strip() or None
    trainer_name = current_user.user.full_name or "Tu entrenador"
    
    email_html = get_invitation_email_html(
        client_name=client_name,
        trainer_name=trainer_name,
        workspace_name=workspace.name,
        invitation_url=invitation_url,
        custom_message=invitation.message,
        branding=workspace.branding or {},
        logo_url=await resolve_url(workspace.logo_url),
    )
    reply_to = (
        (workspace.settings or {}).get("support", {}).get("email")
        if isinstance(workspace.settings, dict)
        else None
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
            subject=f"Recordatorio: {invitation_email_subject(workspace.name, trainer_name)}",
            html_content=email_html,
            from_name=workspace.name,
            reply_to=reply_to,
            tracking={
                "workspace_id": str(workspace.id),
                "invitation_id": str(invitation.id),
                "user_id": str(current_user.id) if getattr(current_user, "id", None) else None,
                "template_kind": "invitation_resend",
            },
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
                subject=f"Recordatorio: {invitation_email_subject(workspace.name, trainer_name)}",
                html_content=email_html,
                reply_to=reply_to,
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
    
    # Check if payment already completed.
    #
    # Importante: el frontend (``InvitationOnboardingPage``) usa este flag
    # para decidir si dispara el auto-complete del onboarding tras un flujo
    # público con datos pre-rellenados. Cuando NO se requiere pago
    # (producto gratuito o invitación sin producto), debemos devolver
    # ``True`` para que el cliente no se quede colgado en la pantalla
    # "Estamos finalizando tu registro…" esperando a un pago que nunca
    # va a ocurrir. Antes solo devolvíamos True con ``payment_id`` válido,
    # lo que dejaba bloqueado el onboarding de productos gratis.
    requires_payment = bool(
        product_info is not None and (product_info.price or 0) > 0
    )
    if not requires_payment:
        payment_completed = True
    else:
        payment_completed = False
        if invitation.payment_id:
            payment_result = await db.execute(
                select(Payment).where(Payment.id == invitation.payment_id)
            )
            payment = payment_result.scalar_one_or_none()
            if payment and payment.status == PaymentStatus.succeeded:
                payment_completed = True
    
    # Extraer datos públicos de soporte del workspace
    ws_settings = (workspace.settings if workspace and workspace.settings else {}) or {}
    ws_support = ws_settings.get("support", {}) if isinstance(ws_settings, dict) else {}
    support_phone = ws_support.get("phone") if isinstance(ws_support, dict) else None
    support_email = ws_support.get("email") if isinstance(ws_support, dict) else None

    return ValidateTokenResponse(
        valid=True,
        email=invitation.email,
        first_name=invitation.first_name,
        last_name=invitation.last_name,
        workspace_name=workspace.name,
        workspace_slug=workspace.slug,
        logo_url=await resolve_url(workspace.logo_url),
        branding=workspace.branding or {},
        message=invitation.message,
        product=product_info,
        payment_completed=payment_completed,
        support_phone=support_phone,
        support_email=support_email,
        data_complete=invitation.is_data_complete,
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
    email: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
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
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Complete an invitation by creating user account and client profile.
    Uses local authentication (not Supabase).

    El upload de la foto de progreso a R2 se realiza en un background
    task DESPUÉS de devolver el response, para no bloquear al cliente
    durante varios segundos (en redes lentas era el principal motivo de
    los ~30 s percibidos en el onboarding).
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

    # Fusionamos los datos de la invitación con los del request: cuando el
    # cliente ha rellenado todo en el flujo público de producto (móvil,
    # contraseña y consentimientos antes del pago) la invitación trae
    # esos valores pre-guardados y la pantalla post-pago invoca este
    # endpoint sin volver a pedirlos al usuario.
    if not data.email and invitation.email:
        data.email = invitation.email
    if not data.first_name and invitation.first_name:
        data.first_name = invitation.first_name
    if not data.last_name and invitation.last_name:
        data.last_name = invitation.last_name
    if not data.phone and invitation.phone:
        data.phone = invitation.phone
    if not data.consents and isinstance(invitation.consent_data, dict):
        data.consents = invitation.consent_data

    # Validación mínima: tras el merge necesitamos sí o sí email + nombre.
    if not data.email:
        raise HTTPException(status_code=400, detail="Email requerido")
    if not data.first_name or not data.last_name:
        raise HTTPException(status_code=400, detail="Nombre y apellidos requeridos")

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

            # IMPORTANTE: pasamos workspace_id + role="client" en el JWT.
            # Si los omitimos, el frontend pone ``user.role = null`` y
            # ``DashboardLayout`` cae al menú del entrenador (los clientes
            # acababan viendo /dashboard del coach con todas las pestañas
            # privadas — bug crítico de aislamiento). Además
            # ``create_tokens`` devuelve 3 valores, no 2, así que antes
            # esto explotaba en TypeError y caíamos al ``return Token``
            # con ``access_token='pending_login'`` sin que el cliente
            # quedase nunca autenticado.
            access_token, refresh_token, _expires_in = create_tokens(
                user_id=str(existing_user.id),
                email=existing_user.email,
                workspace_id=str(invitation.workspace_id),
                role="client",
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
                    "role": "client",
                    "workspace_id": str(invitation.workspace_id),
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
        # Si la invitación trae password pre-rellenado (flujo público) o
        # el cliente acaba de completar el pago y no introdujo password,
        # confiamos en que controla el buzón (token de invitación único)
        # y, si hay producto, que su tarjeta validó la identidad. No le
        # forzamos a teclear su password antigua para no bloquearle.
        skip_password_check = (
            not data.password
            or (invitation.password_hash and invitation.password_hash == existing_user.password_hash)
        )
        if not skip_password_check:
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
            #
            # Para la contraseña usamos lo que mandó el cliente. Si vino
            # vacío (caso del flujo público que ya la guardó al pre-rellenar
            # la invitación) reutilizamos el hash almacenado. Si tampoco
            # hay hash en la invitación es un error de cliente.
            if data.password:
                # bcrypt es CPU-bound y bloquea el event loop. Lo movemos
                # a un thread para no congelar otras requests durante los
                # ~250-400 ms que tarda el hash con BCRYPT_ROUNDS=12.
                import asyncio  # noqa: WPS433

                password_hash_value = await asyncio.to_thread(
                    get_password_hash, data.password
                )
            elif invitation.password_hash:
                password_hash_value = invitation.password_hash
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Contraseña requerida",
                )
            user = User(
                email=email_lc,
                full_name=full_name,
                phone=data.phone,
                password_hash=password_hash_value,
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
            # Propagar facturación heredada de la invitación (sin pisar
            # valores ya existentes en el Client salvo que vengan vacíos).
            inv_fiscal = getattr(invitation, "fiscal_type", None)
            if inv_fiscal and not client.fiscal_type:
                client.fiscal_type = inv_fiscal
            inv_legal = getattr(invitation, "legal_name", None)
            if inv_legal and not client.legal_name:
                client.legal_name = inv_legal
            inv_tax = getattr(invitation, "tax_id", None)
            if inv_tax and not client.tax_id:
                client.tax_id = inv_tax
            inv_addr = getattr(invitation, "billing_address", None)
            if inv_addr and not client.billing_address:
                client.billing_address = inv_addr
            inv_city = getattr(invitation, "billing_city", None)
            if inv_city and not client.billing_city:
                client.billing_city = inv_city
            inv_cp = getattr(invitation, "billing_postal_code", None)
            if inv_cp and not client.billing_postal_code:
                client.billing_postal_code = inv_cp
            inv_country = getattr(invitation, "billing_country", None)
            if inv_country and not client.billing_country:
                client.billing_country = inv_country
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
                # Datos fiscales heredados de la invitación. Si la
                # invitación los trae (flujo público con producto), los
                # propagamos al ``Client`` para que la facturación
                # automática los use desde el primer pago.
                fiscal_type=getattr(invitation, "fiscal_type", None) or "individual",
                legal_name=getattr(invitation, "legal_name", None),
                tax_id=getattr(invitation, "tax_id", None),
                billing_address=getattr(invitation, "billing_address", None),
                billing_city=getattr(invitation, "billing_city", None),
                billing_postal_code=getattr(invitation, "billing_postal_code", None),
                billing_country=getattr(invitation, "billing_country", None) or "España",
            )
            db.add(client)
            await db.flush()
        # Encolamos el upload como background task: se ejecutará DESPUÉS
        # de que enviemos el response al cliente, así que no bloquea al
        # usuario en la pantalla de "Cargando..." mientras la imagen
        # (hasta 10 MB en base64) viaja a R2. Si por algún motivo
        # ``progress_photo_data_url`` viene vacío, el helper hace early
        # return y no se hace nada.
        if data.progress_photo_data_url:
            background_tasks.add_task(
                attach_onboarding_progress_photo_background,
                client_id=client.id,
                workspace_id=invitation.workspace_id,
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

        # ── Formulario del Sistema ────────────────────────────────────────
        # Buscamos el "Cuestionario Inicial Trackfiz" (form_type=system,
        # is_global=True) y creamos un FormSubmission pendiente para que el
        # cliente pueda rellenarlo desde el enlace del email de bienvenida.
        # Si no existe (entornos viejos sin la migración 051), seguimos
        # adelante sin romper el onboarding: el cliente recibirá el email
        # genérico al portal.
        system_form_submission_id: Optional[UUID] = None
        try:
            system_form_result = await db.execute(
                select(Form).where(
                    Form.is_global.is_(True),
                    Form.form_type == "system",
                    Form.is_active.is_(True),
                ).limit(1)
            )
            system_form = system_form_result.scalar_one_or_none()
            if system_form:
                submission = FormSubmission(
                    form_id=system_form.id,
                    client_id=client.id,
                    status="pending",
                    answers={},
                )
                db.add(submission)
                await db.flush()
                system_form_submission_id = submission.id
        except Exception as e:
            logger.error(f"Failed to create system form submission: {e}")

        # ── Formularios del workspace con auto-asignación ────────────────
        # Hay dos motivos por los que un Form del workspace se asigna
        # automáticamente al completar onboarding:
        #
        # 1. ``settings.send_on_signup``: se asigna a TODO cliente que
        #    se registra (consentimientos, protección de datos, etc.).
        # 2. ``settings.send_on_product_purchase`` + ``product_ids``: se
        #    asigna SÓLO cuando el cliente acaba de contratar uno de los
        #    productos vinculados (cuestionarios específicos por servicio).
        #
        # Para retrocompatibilidad seguimos respetando el flag legacy
        # ``settings.send_on_onboarding=true``: si está activo y no
        # tiene los nuevos flags, se evalúa con la regla histórica
        # (product_ids vacío → todos; product_ids con items → sólo esos).
        try:
            ws_forms_result = await db.execute(
                select(Form)
                .where(
                    Form.workspace_id == invitation.workspace_id,
                    Form.is_active.is_(True),
                )
                .options(undefer(Form.product_ids))
            )
            ws_forms_all = ws_forms_result.scalars().all()
            current_product_id = invitation.product_id
            for f in ws_forms_all:
                f_settings = f.settings or {}
                product_ids = list(getattr(f, "product_ids", None) or [])

                send_on_signup = bool(f_settings.get("send_on_signup", False))
                send_on_purchase = bool(f_settings.get("send_on_product_purchase", False))
                legacy_flag = bool(f_settings.get("send_on_onboarding", False))

                should_assign = False
                if send_on_signup:
                    # Para todos los onboardings.
                    should_assign = True
                elif send_on_purchase:
                    # Sólo si el cliente compró uno de los productos.
                    if current_product_id and current_product_id in product_ids:
                        should_assign = True
                elif legacy_flag and "send_on_signup" not in f_settings and "send_on_product_purchase" not in f_settings:
                    # Comportamiento histórico para forms creados antes de
                    # 2026-05 que aún no tienen los flags granulares.
                    if not product_ids:
                        should_assign = True
                    elif current_product_id and current_product_id in product_ids:
                        should_assign = True

                if not should_assign:
                    continue

                # Idempotencia: no duplicar la submission si ya existe.
                already_q = await db.execute(
                    select(FormSubmission.id).where(
                        FormSubmission.form_id == f.id,
                        FormSubmission.client_id == client.id,
                    ).limit(1)
                )
                if already_q.scalar_one_or_none():
                    continue
                db.add(FormSubmission(
                    form_id=f.id,
                    client_id=client.id,
                    status="pending",
                    answers={},
                ))
            await db.flush()
        except Exception as e:
            logger.error(f"Failed to auto-assign onboarding forms: {e}")

        await db.commit()

        # ── A PARTIR DE AQUÍ NUNCA DEVOLVEMOS 5XX ──────────────────────
        # El commit anterior YA creó Usuario + Cliente + Subscription
        # en base de datos. Si lanzamos una excepción ahora, el
        # frontend entra en bucle de reintentos contra un endpoint que
        # ya no puede triunfar (la invitación ya está en ACCEPTED) y
        # el cliente nunca obtiene sus tokens. Por eso envolvemos toda
        # la sección post-commit en try amplios que loguean pero
        # SIEMPRE terminan devolviendo 200.
        ws_name_for_email: Optional[str] = None
        support_phone: Optional[str] = None
        support_email: Optional[str] = None
        email_footer: Optional[str] = None
        try:
            ws_name_for_email = workspace.name if workspace else None
            raw_ws_settings = workspace.settings if workspace else None
            ws_settings = raw_ws_settings if isinstance(raw_ws_settings, dict) else {}
            ws_support_raw = ws_settings.get("support") if isinstance(ws_settings, dict) else None
            ws_support = ws_support_raw if isinstance(ws_support_raw, dict) else {}
            support_phone = ws_support.get("phone")
            support_email = ws_support.get("email")
            email_footer = ws_support.get("email_footer")
        except Exception as e:
            logger.error(f"Could not read workspace support settings post-commit: {e}")

        # URL al cuestionario del sistema. Si por algún motivo no se
        # pudo crear el FormSubmission (no existe el form global)
        # caemos al dashboard del cliente para no enviar un enlace roto.
        if system_form_submission_id:
            system_form_url = (
                f"{settings.FRONTEND_URL}/onboarding/system-form/{system_form_submission_id}"
            )
        else:
            system_form_url = f"{settings.FRONTEND_URL}/my-dashboard"

        # Los emails se encolan en Celery EN VEZ de enviarse de forma
        # síncrona. Cada send_email puede tardar varios segundos contra
        # Brevo y, sumados al upload de la foto + creación de cuenta +
        # cliente + suscripción, hacían que la request superase los 30s
        # de timeout del axios del frontend.
        try:
            send_email_task.delay(
                to_email=data.email,
                subject="🚀 ¡Bienvenido/a a mi asesoría! Tus próximos pasos",
                html_content=EmailTemplates.client_welcome_after_payment(
                    full_name,
                    system_form_url,
                    workspace_name=ws_name_for_email,
                    support_phone=support_phone,
                    support_email=support_email,
                    email_footer=email_footer,
                ),
                tracking={
                    "workspace_id": str(invitation.workspace_id),
                    "invitation_id": str(invitation.id),
                    "client_id": str(client.id) if client else None,
                    "user_id": str(user.id) if user else None,
                    "template_kind": "welcome_after_payment",
                },
            )
            logger.info(f"Welcome (post-payment) email queued for {data.email}")
        except Exception as e:
            # Si Celery/Redis no responde o el render del template peta,
            # NO rompemos el registro. El cliente puede entrar igual y
            # rellenar el cuestionario desde /my-forms.
            logger.error(f"Failed to queue welcome email: {e}")

        # Login directo en todos los casos: el cliente acaba de demostrar
        # control del email (token de invitación único) o de la cuenta
        # existente (contraseña), así que no le exigimos un paso extra.
        #
        # IMPORTANTE: pasamos workspace_id y role="client" en el JWT.
        # Si los omitimos, /auth/me responde con ``role = null`` y
        # ``DashboardLayout`` muestra el menú COMPLETO del entrenador
        # al cliente recién registrado (bug crítico de aislamiento).
        # Además ``create_tokens`` devuelve un 3-tuple
        # (access, refresh, expires_in), no un 2-tuple: el código
        # anterior ``access_token, refresh_token = create_tokens({..})``
        # rompía con TypeError y caía al fallback de ``pending_login``,
        # que el frontend interpretaba como un token válido y dejaba
        # al cliente con sesión rota.
        try:
            access_token, refresh_token, _expires_in = create_tokens(
                user_id=str(user.id),
                email=user.email,
                workspace_id=str(invitation.workspace_id),
                role="client",
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
                    "role": "client",
                    "workspace_id": str(invitation.workspace_id),
                },
            }
        except Exception as e:
            # Si por lo que sea no podemos firmar tokens (config rota),
            # devolvemos 200 sin sesión: el frontend mostrará el mensaje
            # pidiéndole que inicie sesión manualmente. No es válido
            # devolver 500 porque la cuenta YA existe.
            logger.error(f"Token signing failed after commit: {e}")
            logger.error(traceback.format_exc())
            return {
                "access_token": "pending_login",
                "token_type": "bearer",
                "expires_in": 0,
                "refresh_token": "",
                "requires_email_verification": False,
                "user": {
                    "id": str(getattr(user, "id", "")),
                    "email": getattr(user, "email", data.email),
                    "full_name": getattr(user, "full_name", full_name),
                },
                "requires_manual_login": True,
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
    # Datos pre-rellenados ANTES del pago para que la pantalla post-pago
    # no tenga que pedir un segundo formulario.
    phone: Optional[str] = None
    password: Optional[str] = None
    consents: Optional[dict] = None
    # Datos fiscales para emitir la factura tras el pago. ``fiscal_type``
    # vale "individual" (Persona Física) o "company" (Persona Jurídica).
    # Si es ``company`` el cliente factura como empresa y ``legal_name``
    # se usa como Razón Social en lugar de ``first_name + last_name``.
    fiscal_type: Optional[str] = None
    legal_name: Optional[str] = None
    tax_id: Optional[str] = None
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_postal_code: Optional[str] = None
    billing_country: Optional[str] = None


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

    # Pre-rellenamos contraseña / móvil / consentimientos si vienen en el
    # signup. La página pública del producto los pide ANTES del pago para
    # que la pantalla post-pago sólo muestre la confirmación.
    consent_data = data.consents if isinstance(data.consents, dict) else None
    marketing_flag = None
    if isinstance(consent_data, dict) and "marketing" in consent_data:
        marketing_flag = bool(consent_data.get("marketing"))

    if data.password:
        import asyncio  # noqa: WPS433

        password_hash_value = await asyncio.to_thread(
            get_password_hash, data.password
        )
    else:
        password_hash_value = None

    fiscal_type_value = (data.fiscal_type or "individual").strip().lower()
    if fiscal_type_value not in ("individual", "company"):
        fiscal_type_value = "individual"

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
        phone=data.phone,
        password_hash=password_hash_value,
        consent_data=consent_data,
        marketing_consent=marketing_flag,
        fiscal_type=fiscal_type_value,
        legal_name=(data.legal_name or None) if fiscal_type_value == "company" else None,
        tax_id=data.tax_id,
        billing_address=data.billing_address,
        billing_city=data.billing_city,
        billing_postal_code=data.billing_postal_code,
        billing_country=data.billing_country or "España",
    )

    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)

    from app.core.workspace_url import workspace_public_base_url
    invitation_url = f"{workspace_public_base_url(workspace)}/onboarding/invite/{token}"

    return PublicProductSignupResponse(
        invitation_token=token,
        invitation_url=invitation_url,
    )
