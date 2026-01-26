"""Client invitation endpoints."""
import secrets
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
from app.middleware.auth import require_staff, require_workspace, CurrentUser
from app.core.security import (
    get_password_hash,
    create_tokens,
    generate_verification_token,
)
import logging
import traceback
from datetime import timezone

logger = logging.getLogger(__name__)
from app.services.email import email_service, EmailTemplates
from app.tasks.notifications import send_email_task

router = APIRouter()


# ============ Schemas ============

class InvitationCreate(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    message: Optional[str] = None
    expires_days: int = 7


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


class ValidateTokenResponse(BaseModel):
    valid: bool
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    workspace_name: Optional[str] = None
    workspace_slug: Optional[str] = None
    message: Optional[str] = None


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
    status_filter: Optional[str] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """List all invitations for the workspace."""
    query = select(ClientInvitation).where(
        ClientInvitation.workspace_id == current_user.workspace_id
    )
    
    if status_filter:
        query = query.where(ClientInvitation.status == status_filter)
    
    query = query.order_by(ClientInvitation.created_at.desc())
    
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
    
    return InvitationListResponse(items=items, total=len(items))


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
    
    background_tasks.add_task(
        send_email_task.delay,
        to_email=invitation.email,
        subject=f"Recordatorio: Invitación a {workspace.name}",
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
    
    return ValidateTokenResponse(
        valid=True,
        email=invitation.email,
        first_name=invitation.first_name,
        last_name=invitation.last_name,
        workspace_name=workspace.name,
        workspace_slug=workspace.slug,
        message=invitation.message,
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La invitación ya fue utilizada"
        )
    
    if invitation.is_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La invitación ha expirado"
        )
    
    # Check if user already exists
    result = await db.execute(
        select(User).where(User.email == data.email.lower())
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    try:
        full_name = f"{data.first_name} {data.last_name}"
        
        # Generate email verification token
        verification_token = generate_verification_token()
        
        # Create user in our database with hashed password
        user = User(
            email=data.email.lower(),
            full_name=full_name,
            phone=data.phone,
            password_hash=get_password_hash(data.password),
            email_verified=False,
            email_verification_token=verification_token,
            email_verification_sent_at=datetime.now(timezone.utc),
            is_active=True,
        )
        db.add(user)
        await db.flush()
        
        # Assign user as client role in workspace
        user_role = UserRole(
            user_id=user.id,
            workspace_id=invitation.workspace_id,
            role=RoleType.client,
            is_default=True
        )
        db.add(user_role)
        
        # Create client profile
        client = Client(
            workspace_id=invitation.workspace_id,
            user_id=user.id,
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email.lower(),
            phone=data.phone,
            birth_date=data.birth_date,
            gender=data.gender,
            height_cm=str(data.height_cm) if data.height_cm else None,
            weight_kg=str(data.weight_kg) if data.weight_kg else None,
            goals=data.goals,
            health_data=data.health_data or {},
            consents=data.consents or {},
            is_active=True
        )
        db.add(client)
        
        # Mark invitation as accepted
        invitation.status = STATUS_ACCEPTED
        invitation.accepted_at = datetime.utcnow()
        
        await db.commit()
        
        # Send verification email
        confirmation_url = f"{settings.FRONTEND_URL}/auth/confirm?token={verification_token}&type=signup"
        html_content = EmailTemplates.email_confirmation(full_name, confirmation_url)
        
        try:
            await email_service.send_email(
                to_email=data.email,
                to_name=full_name,
                subject="Confirma tu cuenta en Trackfiz",
                html_content=html_content,
            )
            logger.info(f"Verification email sent to {data.email}")
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
        
        # Return response indicating email verification is required
        return {
            "access_token": "pending_email_confirmation",
            "token_type": "bearer",
            "expires_in": 0,
            "refresh_token": "",
            "requires_email_verification": True,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name
            }
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
            detail=f"Error al completar registro: {str(e)}"
        )
