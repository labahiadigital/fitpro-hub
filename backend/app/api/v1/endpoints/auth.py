from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from supabase import create_client, Client as SupabaseClient, acreate_client
import traceback
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

from app.core.config import settings
from app.core.database import get_db, AsyncSessionLocal
from app.models.user import User, UserRole, RoleType
from app.models.workspace import Workspace
from app.models.client import Client
from app.schemas.auth import LoginRequest, RegisterRequest, Token
from pydantic import BaseModel
from typing import Optional, Any
from uuid import UUID
from app.schemas.user import UserResponse
from app.middleware.auth import get_current_user, CurrentUser

router = APIRouter()


async def get_supabase_async_client():
    """Create a new async Supabase client for each request."""
    logger.info(f"Creating Supabase async client with URL: {settings.SUPABASE_URL[:30]}...")
    return await acreate_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def get_supabase_client() -> SupabaseClient:
    """Create a sync Supabase client (not recommended for async endpoints)."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


@router.post("/register", response_model=Token)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Registrar nuevo usuario y crear workspace.
    """
    supabase = await get_supabase_async_client()
    
    # Check if user already exists
    result = await db.execute(
        select(User).where(User.email == data.email)
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    try:
        # Create user in Supabase Auth
        auth_response = await supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {
                    "full_name": data.full_name
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al crear usuario en autenticación"
            )
        
        # Create user in our database
        user = User(
            email=data.email,
            full_name=data.full_name,
            auth_id=auth_response.user.id
        )
        db.add(user)
        await db.flush()
        
        # Create workspace if name provided
        if data.workspace_name:
            # Generate slug from workspace name
            slug = data.workspace_name.lower().replace(" ", "-")
            
            workspace = Workspace(
                name=data.workspace_name,
                slug=slug
            )
            db.add(workspace)
            await db.flush()
            
            # Assign user as owner
            user_role = UserRole(
                user_id=user.id,
                workspace_id=workspace.id,
                role=RoleType.owner,
                is_default=True
            )
            db.add(user_role)
        
        await db.commit()
        
        # Return tokens (session may be None if email confirmation is required)
        if auth_response.session:
            return Token(
                access_token=auth_response.session.access_token,
                token_type="bearer",
                expires_in=auth_response.session.expires_in or 3600,
                refresh_token=auth_response.session.refresh_token
            )
        else:
            # Email confirmation required - user needs to confirm before logging in
            # Return a placeholder response indicating pending confirmation
            return Token(
                access_token="pending_email_confirmation",
                token_type="bearer",
                expires_in=0,
                refresh_token=""
            )
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error registering user: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar usuario: {str(e)}"
        )


@router.post("/login", response_model=Token)
async def login(data: LoginRequest):
    """
    Iniciar sesión con email y contraseña.
    """
    try:
        supabase = await get_supabase_async_client()
        
        auth_response = await supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas"
            )
        
        return Token(
            access_token=auth_response.session.access_token,
            token_type="bearer",
            expires_in=auth_response.session.expires_in or 3600,
            refresh_token=auth_response.session.refresh_token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        if "Invalid login credentials" in str(e):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al iniciar sesión: {str(e)}"
        )


@router.post("/logout")
async def logout(
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Cerrar sesión.
    """
    supabase = await get_supabase_async_client()
    
    try:
        await supabase.auth.sign_out()
        return {"message": "Sesión cerrada correctamente"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cerrar sesión: {str(e)}"
        )


@router.get("/me")
async def get_me(
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Obtener información del usuario actual con su rol.
    """
    user = current_user.user
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "phone": user.phone,
        "is_active": user.is_active,
        "preferences": user.preferences or {},
        "role": current_user.role.value if current_user.role else None,
        "workspace_id": str(current_user.workspace_id) if current_user.workspace_id else None,
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat(),
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str
):
    """
    Refrescar token de acceso.
    """
    supabase = await get_supabase_async_client()
    
    try:
        auth_response = await supabase.auth.refresh_session(refresh_token)
        
        if not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de refresco inválido"
            )
        
        return Token(
            access_token=auth_response.session.access_token,
            token_type="bearer",
            expires_in=auth_response.session.expires_in or 3600,
            refresh_token=auth_response.session.refresh_token
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de refresco inválido o expirado"
        )


# Schema for client registration
class ClientRegisterRequest(BaseModel):
    workspace_id: UUID
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


@router.post("/register-client", response_model=Token)
async def register_client(
    data: ClientRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Registrar nuevo cliente (usuario con rol cliente en un workspace existente).
    """
    supabase = await get_supabase_async_client()
    
    # Check if user already exists
    result = await db.execute(
        select(User).where(User.email == data.email)
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Verify workspace exists
    result = await db.execute(
        select(Workspace).where(Workspace.id == data.workspace_id)
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace no encontrado"
        )
    
    try:
        # Create user in Supabase Auth
        auth_response = await supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {
                    "full_name": f"{data.first_name} {data.last_name}"
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al crear usuario en autenticación"
            )
        
        # Create user in our database
        user = User(
            email=data.email,
            full_name=f"{data.first_name} {data.last_name}",
            auth_id=auth_response.user.id
        )
        db.add(user)
        await db.flush()
        
        # Assign user as client role in workspace
        user_role = UserRole(
            user_id=user.id,
            workspace_id=data.workspace_id,
            role=RoleType.client,
            is_default=True
        )
        db.add(user_role)
        
        # Create client profile
        client = Client(
            workspace_id=data.workspace_id,
            user_id=user.id,
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
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
        
        await db.commit()
        
        # Return tokens
        if auth_response.session:
            return Token(
                access_token=auth_response.session.access_token,
                token_type="bearer",
                expires_in=auth_response.session.expires_in or 3600,
                refresh_token=auth_response.session.refresh_token
            )
        else:
            # If no session (email confirmation required), return a placeholder response
            return Token(
                access_token="pending_confirmation",
                token_type="bearer",
                expires_in=0,
                refresh_token=""
            )
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error registering client: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar cliente: {str(e)}"
        )


# ===== SUPABASE AUTH EMAIL WEBHOOK =====
# This endpoint receives email requests from Supabase Auth hooks
# and sends branded emails using our email service

class SendEmailRequest(BaseModel):
    """Request body for Supabase Auth send-email hook"""
    user: dict  # Contains id, email, user_metadata, etc.
    email_data: dict  # Contains token, token_hash, redirect_to, email_action_type, etc.


class SendEmailResponse(BaseModel):
    """Response for Supabase Auth send-email hook"""
    success: bool


@router.post("/hooks/send-email", response_model=SendEmailResponse)
async def supabase_send_email_hook(
    request: SendEmailRequest,
):
    """
    Webhook endpoint for Supabase Auth to send custom branded emails.
    
    This replaces Supabase's default email sending with our own branded emails.
    Configure this in Supabase Dashboard > Authentication > Hooks > Send Email.
    
    Supported email types:
    - signup: Email confirmation after registration
    - recovery: Password reset email
    - magiclink: Magic link login email
    - invite: User invitation email
    - email_change: Email change confirmation
    """
    from app.services.email import email_service, EmailTemplates
    
    try:
        user = request.user
        email_data = request.email_data
        
        email = user.get("email", "")
        user_metadata = user.get("user_metadata", {})
        name = user_metadata.get("full_name", email.split("@")[0])
        
        email_action_type = email_data.get("email_action_type", "")
        token = email_data.get("token", "")
        token_hash = email_data.get("token_hash", "")
        redirect_to = email_data.get("redirect_to", settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else "https://app.trackfiz.com")
        
        # Build confirmation URL based on email type
        # The URL structure depends on your frontend routing
        base_url = redirect_to.rstrip("/")
        
        if email_action_type == "signup":
            # Email confirmation after signup
            confirmation_url = f"{base_url}/auth/confirm?token_hash={token_hash}&type=signup"
            html_content = EmailTemplates.email_confirmation(name, confirmation_url)
            subject = "Confirma tu cuenta en Trackfiz"
            
        elif email_action_type == "recovery":
            # Password reset
            reset_url = f"{base_url}/auth/reset-password?token_hash={token_hash}&type=recovery"
            html_content = EmailTemplates.password_reset(name, reset_url)
            subject = "Restablecer contraseña - Trackfiz"
            
        elif email_action_type == "magiclink":
            # Magic link login
            magic_url = f"{base_url}/auth/confirm?token_hash={token_hash}&type=magiclink"
            html_content = EmailTemplates.magic_link(name, magic_url)
            subject = "Tu enlace de acceso a Trackfiz"
            
        elif email_action_type == "invite":
            # User invitation
            invite_url = f"{base_url}/auth/confirm?token_hash={token_hash}&type=invite"
            inviter_name = email_data.get("inviter_name", "El equipo de Trackfiz")
            workspace_name = email_data.get("workspace_name", "Trackfiz")
            html_content = EmailTemplates.invitation_email(inviter_name, workspace_name, invite_url)
            subject = f"Has sido invitado a {workspace_name}"
            
        elif email_action_type == "email_change":
            # Email change confirmation
            confirmation_url = f"{base_url}/auth/confirm?token_hash={token_hash}&type=email_change"
            html_content = EmailTemplates.email_confirmation(name, confirmation_url)
            subject = "Confirma tu nuevo email en Trackfiz"
            
        else:
            logger.warning(f"Unknown email action type: {email_action_type}")
            # Default fallback
            confirmation_url = f"{base_url}/auth/confirm?token_hash={token_hash}&type={email_action_type}"
            html_content = EmailTemplates.email_confirmation(name, confirmation_url)
            subject = "Trackfiz - Acción requerida"
        
        # Send the email using our email service
        success = await email_service.send_email(
            to_email=email,
            to_name=name,
            subject=subject,
            html_content=html_content,
        )
        
        if success:
            logger.info(f"Successfully sent {email_action_type} email to {email}")
        else:
            logger.error(f"Failed to send {email_action_type} email to {email}")
        
        return SendEmailResponse(success=success)
        
    except Exception as e:
        logger.error(f"Error in send-email hook: {str(e)}")
        logger.error(traceback.format_exc())
        # Return success=false but don't raise exception
        # so Supabase can handle the fallback
        return SendEmailResponse(success=False)

