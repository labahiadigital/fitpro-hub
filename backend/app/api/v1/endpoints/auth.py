"""
Authentication endpoints using FastAPI Security with JWT tokens.
This replaces Supabase Auth with a self-managed authentication system.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
import traceback
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    get_password_hash,
    verify_password,
    create_tokens,
    create_access_token,
    decode_refresh_token,
    generate_verification_token,
    generate_password_reset_token,
)
from app.models.user import User, UserRole, RoleType
from app.models.workspace import Workspace
from app.models.client import Client
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    Token,
    PasswordResetRequest,
    PasswordResetConfirm,
    ChangePasswordRequest,
    VerifyEmailRequest,
    ResendVerificationRequest,
    AuthResponse,
)
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from app.schemas.user import UserResponse
from app.middleware.auth import get_current_user, CurrentUser
from app.services.email import email_service, EmailTemplates

router = APIRouter()


# ===== REGISTRATION =====

@router.post("/register", response_model=Token)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user and create workspace.
    Sends email verification link.
    """
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
        # Generate email verification token
        verification_token = generate_verification_token()
        
        # Create user with hashed password
        user = User(
            email=data.email.lower(),
            full_name=data.full_name,
            password_hash=get_password_hash(data.password),
            email_verified=False,
            email_verification_token=verification_token,
            email_verification_sent_at=datetime.now(timezone.utc),
            is_active=True,
        )
        db.add(user)
        await db.flush()
        
        # Create workspace if name provided
        workspace = None
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
        
        # Send verification email
        confirmation_url = f"{settings.FRONTEND_URL}/auth/confirm?token={verification_token}&type=signup"
        html_content = EmailTemplates.email_confirmation(data.full_name, confirmation_url)
        
        try:
            await email_service.send_email(
                to_email=data.email,
                to_name=data.full_name,
                subject="Confirma tu cuenta en Trackfiz",
                html_content=html_content,
            )
            logger.info(f"Verification email sent to {data.email}")
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
            # Don't fail registration if email fails, user can request resend
        
        # Return token indicating email verification is required
        # User cannot fully login until email is verified
        return Token(
            access_token="pending_email_confirmation",
            token_type="bearer",
            expires_in=0,
            refresh_token="",
            requires_email_verification=True
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


# ===== LOGIN =====

@router.post("/login", response_model=Token)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Login with email and password.
    Returns JWT tokens if credentials are valid and email is verified.
    
    This endpoint follows OAuth2 password flow conventions.
    """
    # Define credentials exception once for consistent error handling
    # Using same message for all auth failures prevents user enumeration
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Find user by email
        result = await db.execute(
            select(User).where(User.email == data.email.lower())
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise credentials_exception
        
        # Verify password
        if not user.password_hash or not verify_password(data.password, user.password_hash):
            raise credentials_exception
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu cuenta ha sido desactivada",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if email is verified
        if not user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user's default workspace and role
        result = await db.execute(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.is_default == True
            )
        )
        default_role = result.scalar_one_or_none()
        
        workspace_id = None
        role = None
        
        if default_role:
            workspace_id = str(default_role.workspace_id)
            role = default_role.role.value
        else:
            # Get first workspace if no default
            result = await db.execute(
                select(UserRole).where(UserRole.user_id == user.id).limit(1)
            )
            first_role = result.scalar_one_or_none()
            if first_role:
                workspace_id = str(first_role.workspace_id)
                role = first_role.role.value
        
        # Create tokens
        access_token, refresh_token, expires_in = create_tokens(
            user_id=str(user.id),
            email=user.email,
            workspace_id=workspace_id,
            role=role
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=expires_in,
            refresh_token=refresh_token,
            requires_email_verification=False
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al iniciar sesión"
        )


# ===== LOGOUT =====

@router.post("/logout")
async def logout(
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Logout current user.
    Note: With JWT, we can't truly invalidate tokens server-side without a blacklist.
    The client should delete the tokens locally.
    """
    # In a production system, you might want to add the token to a blacklist
    # For now, we just return success and let the client clear the tokens
    return {"message": "Sesión cerrada correctamente"}


# ===== GET CURRENT USER =====

@router.get("/me")
async def get_me(
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Get current user information with role.
    """
    user = current_user.user
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "phone": user.phone,
        "is_active": user.is_active,
        "email_verified": user.email_verified,
        "preferences": user.preferences or {},
        "role": current_user.role.value if current_user.role else None,
        "workspace_id": str(current_user.workspace_id) if current_user.workspace_id else None,
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat(),
    }


# ===== REFRESH TOKEN =====

class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=Token)
async def refresh_token(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using refresh token.
    
    The refresh token has a longer expiration and is used to obtain
    new access tokens without requiring the user to re-authenticate.
    """
    # Define exception for consistent error handling
    token_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de refresco inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode refresh token
        payload = decode_refresh_token(data.refresh_token)
        
        if not payload:
            raise token_exception
        
        # Get user
        user_id = payload.sub
        result = await db.execute(
            select(User).where(User.id == UUID(user_id))
        )
        user = result.scalar_one_or_none()
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado o desactivado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user's default workspace and role
        result = await db.execute(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.is_default == True
            )
        )
        default_role = result.scalar_one_or_none()
        
        workspace_id = None
        role = None
        
        if default_role:
            workspace_id = str(default_role.workspace_id)
            role = default_role.role.value
        else:
            result = await db.execute(
                select(UserRole).where(UserRole.user_id == user.id).limit(1)
            )
            first_role = result.scalar_one_or_none()
            if first_role:
                workspace_id = str(first_role.workspace_id)
                role = first_role.role.value
        
        # Create new tokens
        access_token, new_refresh_token, expires_in = create_tokens(
            user_id=str(user.id),
            email=user.email,
            workspace_id=workspace_id,
            role=role
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=expires_in,
            refresh_token=new_refresh_token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}")
        raise token_exception


# ===== EMAIL VERIFICATION =====

@router.post("/verify-email", response_model=AuthResponse)
async def verify_email(
    data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify user's email with the token sent via email.
    """
    try:
        # Find user by verification token
        result = await db.execute(
            select(User).where(User.email_verification_token == data.token)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de verificación inválido"
            )
        
        # Check if token is expired (24 hours)
        if user.email_verification_sent_at:
            token_age = datetime.now(timezone.utc) - user.email_verification_sent_at.replace(tzinfo=timezone.utc)
            if token_age > timedelta(hours=24):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El enlace de verificación ha expirado. Solicita uno nuevo."
                )
        
        # Mark email as verified
        user.email_verified = True
        user.email_verification_token = None
        user.email_verification_sent_at = None
        
        await db.commit()
        
        logger.info(f"Email verified for user {user.email}")
        
        return AuthResponse(
            success=True,
            message="Email verificado correctamente. Ya puedes iniciar sesión.",
            user_id=str(user.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying email: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al verificar el email"
        )


@router.post("/resend-verification", response_model=AuthResponse)
async def resend_verification(
    data: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Resend email verification link.
    """
    try:
        # Find user
        result = await db.execute(
            select(User).where(User.email == data.email.lower())
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Don't reveal if email exists
            return AuthResponse(
                success=True,
                message="Si el email está registrado, recibirás un enlace de verificación."
            )
        
        if user.email_verified:
            return AuthResponse(
                success=True,
                message="Tu email ya está verificado. Puedes iniciar sesión."
            )
        
        # Rate limit: check last sent time
        if user.email_verification_sent_at:
            time_since_last = datetime.now(timezone.utc) - user.email_verification_sent_at.replace(tzinfo=timezone.utc)
            if time_since_last < timedelta(minutes=2):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Espera 2 minutos antes de solicitar otro email de verificación."
                )
        
        # Generate new token
        verification_token = generate_verification_token()
        user.email_verification_token = verification_token
        user.email_verification_sent_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        # Send email
        confirmation_url = f"{settings.FRONTEND_URL}/auth/confirm?token={verification_token}&type=signup"
        html_content = EmailTemplates.email_confirmation(user.full_name or user.email, confirmation_url)
        
        await email_service.send_email(
            to_email=user.email,
            to_name=user.full_name or user.email,
            subject="Confirma tu cuenta en Trackfiz",
            html_content=html_content,
        )
        
        return AuthResponse(
            success=True,
            message="Se ha enviado un nuevo enlace de verificación a tu email."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resending verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al enviar el email de verificación"
        )


# ===== PASSWORD RESET =====

@router.post("/forgot-password", response_model=AuthResponse)
async def forgot_password(
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Request password reset email.
    """
    try:
        # Find user
        result = await db.execute(
            select(User).where(User.email == data.email.lower())
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Don't reveal if email exists
            return AuthResponse(
                success=True,
                message="Si el email está registrado, recibirás instrucciones para restablecer tu contraseña."
            )
        
        # Rate limit
        if user.password_reset_sent_at:
            time_since_last = datetime.now(timezone.utc) - user.password_reset_sent_at.replace(tzinfo=timezone.utc)
            if time_since_last < timedelta(minutes=2):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Espera 2 minutos antes de solicitar otro email de recuperación."
                )
        
        # Generate reset token
        reset_token = generate_password_reset_token()
        user.password_reset_token = reset_token
        user.password_reset_sent_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        # Send email
        reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?token={reset_token}"
        html_content = EmailTemplates.password_reset(user.full_name or user.email, reset_url)
        
        await email_service.send_email(
            to_email=user.email,
            to_name=user.full_name or user.email,
            subject="Restablecer contraseña - Trackfiz",
            html_content=html_content,
        )
        
        return AuthResponse(
            success=True,
            message="Si el email está registrado, recibirás instrucciones para restablecer tu contraseña."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in forgot-password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al procesar la solicitud"
        )


@router.post("/reset-password", response_model=AuthResponse)
async def reset_password(
    data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """
    Reset password using token from email.
    """
    try:
        # Find user by reset token
        result = await db.execute(
            select(User).where(User.password_reset_token == data.token)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de recuperación inválido"
            )
        
        # Check if token is expired (1 hour)
        if user.password_reset_sent_at:
            token_age = datetime.now(timezone.utc) - user.password_reset_sent_at.replace(tzinfo=timezone.utc)
            if token_age > timedelta(hours=1):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El enlace de recuperación ha expirado. Solicita uno nuevo."
                )
        
        # Update password
        user.password_hash = get_password_hash(data.new_password)
        user.password_reset_token = None
        user.password_reset_sent_at = None
        
        await db.commit()
        
        logger.info(f"Password reset for user {user.email}")
        
        return AuthResponse(
            success=True,
            message="Tu contraseña ha sido actualizada. Ya puedes iniciar sesión.",
            user_id=str(user.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al restablecer la contraseña"
        )


# ===== CHANGE PASSWORD (authenticated) =====

@router.post("/change-password", response_model=AuthResponse)
async def change_password(
    data: ChangePasswordRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Change password for authenticated user.
    """
    try:
        user = current_user.user
        
        # Verify current password
        if not user.password_hash or not verify_password(data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña actual es incorrecta"
            )
        
        # Update password
        user.password_hash = get_password_hash(data.new_password)
        
        await db.commit()
        
        return AuthResponse(
            success=True,
            message="Tu contraseña ha sido actualizada.",
            user_id=str(user.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al cambiar la contraseña"
        )


# ===== CLIENT REGISTRATION =====

class ClientRegisterRequest(BaseModel):
    workspace_id: UUID
    email: EmailStr
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
    Register new client (user with client role in an existing workspace).
    """
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
        # Generate email verification token
        verification_token = generate_verification_token()
        full_name = f"{data.first_name} {data.last_name}"
        
        # Create user with hashed password
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
        except Exception as e:
            logger.error(f"Failed to send verification email to client: {e}")
        
        return Token(
            access_token="pending_email_confirmation",
            token_type="bearer",
            expires_in=0,
            refresh_token="",
            requires_email_verification=True
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
