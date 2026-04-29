"""
Authentication endpoints using FastAPI Security with JWT tokens.
This replaces Supabase Auth with a self-managed authentication system.
"""
from fastapi import APIRouter, Depends, HTTPException, Response, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone, timedelta
import traceback
import logging

logger = logging.getLogger(__name__)

from app.core.limiter import limiter

from app.core.config import settings
from app.core.cookies import set_refresh_cookie, clear_refresh_cookie, read_refresh_cookie
from app.core import ttl_cache
from app.core.database import get_db
from app.core.storage import resolve_url
from app.core.security import (
    get_password_hash,
    verify_password,
    create_tokens,
    create_access_token,
    decode_refresh_token,
    generate_verification_token,
    generate_password_reset_token,
    validate_password_strength,
)
from app.models.user import User, UserRole, RoleType
from app.models.workspace import Workspace, generate_slug, check_slug_available
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
from app.middleware.auth import get_current_user, oauth2_scheme, CurrentUser
from app.services.email import email_service, EmailTemplates
from app.services.onboarding import (
    attach_onboarding_progress_photo,
    enrich_onboarding_health_data,
)

router = APIRouter()


# ===== REGISTRATION =====

@router.post("/register", response_model=Token)
@limiter.limit("5/minute")
async def register(
    request: Request,
    response: Response,
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
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
            slug = generate_slug(data.workspace_name)
            
            if not await check_slug_available(db, slug):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Ya existe un espacio con un nombre similar ('{slug}'). Elige otro nombre para tu gimnasio virtual."
                )
            
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
        workspace_name_for_email = workspace.name if workspace else None
        html_content = EmailTemplates.email_confirmation(
            data.full_name,
            confirmation_url,
            workspace_name=workspace_name_for_email,
        )
        subject_brand = workspace_name_for_email or "Trackfiz"

        try:
            await email_service.send_email(
                to_email=data.email,
                to_name=data.full_name,
                subject=f"Confirma tu cuenta en {subject_brand}",
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
            detail="Error al registrar usuario"
        )


# ===== LOGIN =====

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
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

        # SECURITY: Refresh token travels in an httpOnly cookie going forward.
        # The body field is kept populated for backwards-compatibility with
        # older clients but new clients should stop persisting it.
        set_refresh_cookie(response, refresh_token)

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
    response: Response,
    token: str = Depends(oauth2_scheme),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Logout current user and invalidate the httpOnly refresh cookie.

    With stateless JWT we cannot revoke the access token without a blacklist,
    but clearing the refresh cookie guarantees the client cannot renew. We
    also drop the in-process CurrentUser cache so any in-flight request
    after logout refetches fresh auth state.
    """
    clear_refresh_cookie(response)
    try:
        from app.middleware.auth import invalidate_auth_cache
        invalidate_auth_cache(token)
    except Exception:  # best-effort
        pass
    return {"message": "Sesión cerrada correctamente"}


# ===== GET CURRENT USER =====

@router.get("/me")
async def get_me(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user information with role and all available workspaces.

    Response is memoised for 15 s per (user, workspace) pair. ``/me`` is hit on
    every page load and workspace-switch so shaving the DB round-trip + S3
    presign off that path noticeably smoothes the UX without risking stale
    role/permission data (TTL is short enough).
    """
    user = current_user.user
    cache_key = f"auth:me:{user.id}:{current_user.workspace_id}"
    cached = ttl_cache.get(cache_key)
    if cached is not None:
        return cached

    result = await db.execute(
        select(UserRole, Workspace)
        .join(Workspace, UserRole.workspace_id == Workspace.id)
        .where(UserRole.user_id == user.id)
    )
    workspaces = []
    for ur, ws in result.all():
        workspaces.append({
            "id": str(ws.id),
            "name": ws.name,
            "slug": ws.slug,
            "logo_url": ws.logo_url,
            "role": ur.role.value,
        })

    payload = {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "avatar_url": await resolve_url(user.avatar_url),
        "phone": user.phone,
        "is_active": user.is_active,
        "email_verified": user.email_verified,
        "preferences": user.preferences or {},
        "role": current_user.role.value if current_user.role else None,
        "workspace_id": str(current_user.workspace_id) if current_user.workspace_id else None,
        "permissions": current_user.get_permissions(),
        "assigned_clients": current_user.get_assigned_clients(),
        "workspaces": workspaces,
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat(),
    }
    ttl_cache.set(cache_key, payload, ttl=15.0)
    return payload


# ===== SWITCH WORKSPACE =====

class SwitchWorkspaceRequest(BaseModel):
    workspace_id: str

@router.post("/switch-workspace", response_model=Token)
async def switch_workspace(
    response: Response,
    data: SwitchWorkspaceRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Switch to a different workspace. Issues new tokens scoped to the target workspace.
    The user must have a role in the target workspace.
    """
    try:
        target_ws_id = UUID(data.workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="workspace_id inválido")

    result = await db.execute(
        select(UserRole).where(
            UserRole.user_id == current_user.id,
            UserRole.workspace_id == target_ws_id,
        )
    )
    user_role = result.scalar_one_or_none()

    if not user_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este workspace",
        )

    access_token, refresh_token, expires_in = create_tokens(
        user_id=str(current_user.id),
        email=current_user.email,
        workspace_id=str(target_ws_id),
        role=user_role.role.value,
    )

    set_refresh_cookie(response, refresh_token)

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        refresh_token=refresh_token,
        requires_email_verification=False,
    )


# ===== REFRESH TOKEN =====

class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None
    workspace_id: Optional[str] = None


@router.post("/refresh", response_model=Token)
@limiter.limit("30/minute")
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    data: Optional[RefreshTokenRequest] = Body(default=None),
):
    """
    Refresh access token using refresh token.

    Accepts the refresh token from either the httpOnly cookie (preferred) or the
    request body (legacy path kept for backwards-compatibility).  Optionally
    takes a workspace_id to preserve workspace context across refreshes.
    """
    token_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de refresco inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Prefer cookie-based refresh; fall back to body for legacy SPA builds.
    cookie_token = read_refresh_cookie(request)
    body_token = data.refresh_token if data else None
    refresh_value = cookie_token or body_token
    workspace_from_body = data.workspace_id if data else None

    if not refresh_value:
        raise token_exception

    try:
        payload = decode_refresh_token(refresh_value)

        if not payload:
            raise token_exception
        
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
        
        workspace_id = None
        role = None

        # Try to preserve the workspace from the request
        if workspace_from_body:
            try:
                requested_ws = UUID(workspace_from_body)
                result = await db.execute(
                    select(UserRole).where(
                        UserRole.user_id == user.id,
                        UserRole.workspace_id == requested_ws,
                    )
                )
                requested_role = result.scalar_one_or_none()
                if requested_role:
                    workspace_id = str(requested_ws)
                    role = requested_role.role.value
            except (ValueError, TypeError):
                pass

        # Fallback: default workspace
        if not workspace_id:
            result = await db.execute(
                select(UserRole).where(
                    UserRole.user_id == user.id,
                    UserRole.is_default == True
                )
            )
            default_role = result.scalar_one_or_none()
            
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
        
        access_token, new_refresh_token, expires_in = create_tokens(
            user_id=str(user.id),
            email=user.email,
            workspace_id=workspace_id,
            role=role
        )

        # Rotate the refresh cookie as well
        set_refresh_cookie(response, new_refresh_token)

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
        
        # Staff invite placeholder users (no password) must use /users/accept-invite instead
        if not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta cuenta fue creada por invitación. Usa el enlace del email para completar tu registro."
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
@limiter.limit("3/minute")
async def resend_verification(
    request: Request,
    response: Response,
    data: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
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
        
        # Send email (lookup user's default workspace so the email shows the right brand)
        ws_lookup = await db.execute(
            select(Workspace)
            .join(UserRole, UserRole.workspace_id == Workspace.id)
            .where(UserRole.user_id == user.id)
            .order_by(UserRole.is_default.desc())
            .limit(1)
        )
        ws_for_user = ws_lookup.scalar_one_or_none()
        ws_name_for_email = ws_for_user.name if ws_for_user else None

        confirmation_url = f"{settings.FRONTEND_URL}/auth/confirm?token={verification_token}&type=signup"
        html_content = EmailTemplates.email_confirmation(
            user.full_name or user.email,
            confirmation_url,
            workspace_name=ws_name_for_email,
        )
        subject_brand = ws_name_for_email or "Trackfiz"

        await email_service.send_email(
            to_email=user.email,
            to_name=user.full_name or user.email,
            subject=f"Confirma tu cuenta en {subject_brand}",
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
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    response: Response,
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
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
        
        # Send email (si el envío falla no bloqueamos la respuesta al cliente:
        # registramos el error para observabilidad y devolvemos éxito genérico
        # para no filtrar información sobre la cuenta).
        reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?token={reset_token}"
        html_content = EmailTemplates.password_reset(user.full_name or user.email, reset_url)

        try:
            await email_service.send_email(
                to_email=user.email,
                to_name=user.full_name or user.email,
                subject="Restablecer contraseña - Trackfiz",
                html_content=html_content,
            )
        except Exception as mail_err:  # noqa: BLE001
            logger.error(
                f"Failed to send password reset email to {user.email}: {mail_err}"
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
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    response: Response,
    data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
):
    """
    Reset password using token from email.
    """
    try:
        is_strong, strength_error = validate_password_strength(data.new_password)
        if not is_strong:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=strength_error,
            )

        # Cargamos sólo los campos que necesitamos. Evitamos materializar la
        # entidad ``User`` completa con sus relaciones cargadas en lazy mode,
        # que durante un ``commit`` async puede disparar greenlet/cascade
        # errors (workspace_roles + notifications con delete-orphan).
        result = await db.execute(
            select(User.id, User.email, User.password_reset_sent_at).where(
                User.password_reset_token == data.token
            )
        )
        row = result.first()

        if row is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de recuperación inválido",
            )

        user_id, user_email, sent_at = row

        if sent_at is not None:
            if sent_at.tzinfo is None:
                sent_at = sent_at.replace(tzinfo=timezone.utc)
            token_age = datetime.now(timezone.utc) - sent_at
            if token_age > timedelta(hours=1):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El enlace de recuperación ha expirado. Solicita uno nuevo.",
                )

        try:
            new_hash = get_password_hash(data.new_password)
        except ValueError as ve:
            logger.warning("reset_password: contraseña inválida para bcrypt: %s", ve)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña no es válida. Prueba con una más corta o sin caracteres especiales raros.",
            ) from ve

        try:
            # Al completar el reset-password damos por hecho que el usuario
            # tiene control real del buzón (ha podido abrir el enlace que le
            # enviamos), así que aprovechamos para marcar el email como
            # verificado. Esto evita el bucle "no puedo entrar porque mi
            # email no está verificado" cuando el correo de verificación
            # original se perdió o nunca llegó.
            await db.execute(
                update(User)
                .where(User.id == user_id)
                .values(
                    password_hash=new_hash,
                    password_reset_token=None,
                    password_reset_sent_at=None,
                    email_verified=True,
                    email_verification_token=None,
                    email_verification_sent_at=None,
                )
                .execution_options(synchronize_session=False)
            )
            await db.commit()
        except Exception as commit_err:  # noqa: BLE001
            try:
                await db.rollback()
            except Exception:  # noqa: BLE001
                pass
            logger.exception(
                "reset_password: fallo al actualizar contraseña para %s: %r",
                user_email,
                commit_err,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo actualizar la contraseña. Inténtalo de nuevo.",
            ) from commit_err

        logger.info("Password reset for user %s", user_email)

        return AuthResponse(
            success=True,
            message="Tu contraseña ha sido actualizada. Ya puedes iniciar sesión.",
            user_id=str(user_id),
        )

    except HTTPException:
        raise
    except Exception as e:
        try:
            await db.rollback()
        except Exception:  # noqa: BLE001
            pass
        logger.exception("Error resetting password: %r", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al restablecer la contraseña",
        ) from e


# ===== CHANGE EMAIL (authenticated) =====

class ChangeEmailRequest(BaseModel):
    new_email: EmailStr
    password: str  # require current password for security


@router.post("/change-email")
async def change_email(
    data: ChangeEmailRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Change user email. Requires password confirmation.
    Updates email immediately (in a real production system, you'd want to verify the new email first).
    """
    # Get user
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verify password
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Contraseña incorrecta")
    
    # Check if new email is already in use
    result = await db.execute(select(User).where(User.email == data.new_email.lower()))
    existing = result.scalar_one_or_none()
    if existing and existing.id != user.id:
        raise HTTPException(status_code=400, detail="Este email ya está en uso")
    
    # Update email
    old_email = user.email
    user.email = data.new_email.lower()
    
    # Also update the client profile if exists
    result = await db.execute(select(Client).where(Client.user_id == user.id))
    client = result.scalar_one_or_none()
    if client:
        client.email = data.new_email.lower()
    
    await db.commit()
    
    return {"message": "Email actualizado correctamente", "old_email": old_email, "new_email": data.new_email}


# ===== CHANGE PASSWORD (authenticated) =====

@router.post("/change-password", response_model=AuthResponse)
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    response: Response,
    data: ChangePasswordRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
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
    progress_photo_data_url: Optional[str] = None
    progress_photo_type: Optional[str] = "front"


@router.post("/register-client", response_model=Token)
@limiter.limit("5/minute")
async def register_client(
    request: Request,
    response: Response,
    data: ClientRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Register new client (user with client role in an existing workspace).

    Permite multi-workspace: si el email ya está registrado pero la
    contraseña proporcionada coincide con la del usuario existente,
    sólo añadimos el nuevo `UserRole` + perfil `Client` en este
    workspace, sin crear un usuario nuevo. Así el cliente puede ser
    cliente de varios entrenadores con la misma cuenta.
    """
    email_lc = data.email.lower()

    # Verify workspace exists primero (para errores claros)
    result = await db.execute(
        select(Workspace).where(Workspace.id == data.workspace_id)
    )
    workspace = result.scalar_one_or_none()

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace no encontrado"
        )

    # Check if user already exists
    result = await db.execute(
        select(User).where(User.email == email_lc)
    )
    existing_user = result.scalar_one_or_none()

    full_name = f"{data.first_name} {data.last_name}"
    enriched_health_data = enrich_onboarding_health_data(
        health_data=data.health_data,
        birth_date=data.birth_date,
        gender=data.gender,
        height_cm=data.height_cm,
        weight_kg=data.weight_kg,
    )

    try:
        if existing_user:
            # Caso 1: el email ya tiene cuenta -> intentamos reutilizarla
            # para registrar al usuario en otro workspace.
            if not existing_user.is_active or existing_user.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Esta cuenta no está disponible. Contacta con soporte.",
                )

            if not existing_user.password_hash or not verify_password(
                data.password, existing_user.password_hash
            ):
                # Email correcto pero password incorrecto -> el usuario está
                # tratando de "robar" un email ajeno o se ha equivocado.
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Ese email ya tiene cuenta en Trackfiz. "
                        "Usa la misma contraseña que ya tenías para vincular "
                        "este perfil al nuevo entrenador, o inicia sesión "
                        "y completa el alta desde tu cuenta."
                    ),
                )

            # Comprobar si ya tiene rol/cliente en este workspace
            result = await db.execute(
                select(UserRole).where(
                    UserRole.user_id == existing_user.id,
                    UserRole.workspace_id == data.workspace_id,
                )
            )
            existing_role = result.scalar_one_or_none()
            result = await db.execute(
                select(Client).where(
                    Client.workspace_id == data.workspace_id,
                    Client.email == email_lc,
                )
            )
            existing_client = result.scalar_one_or_none()

            if existing_role and existing_client and existing_client.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Ya estás registrado en este workspace. "
                        "Inicia sesión con tu email y contraseña."
                    ),
                )

            # Crear UserRole si no existe
            if not existing_role:
                db.add(UserRole(
                    user_id=existing_user.id,
                    workspace_id=data.workspace_id,
                    role=RoleType.client,
                    is_default=False,
                ))

            # Crear Client si no existe (o reactivarlo)
            if existing_client:
                existing_client.user_id = existing_user.id
                existing_client.first_name = data.first_name
                existing_client.last_name = data.last_name
                existing_client.phone = data.phone or existing_client.phone
                existing_client.birth_date = data.birth_date or existing_client.birth_date
                existing_client.gender = data.gender or existing_client.gender
                if data.height_cm is not None:
                    existing_client.height_cm = str(data.height_cm)
                if data.weight_kg is not None:
                    existing_client.weight_kg = str(data.weight_kg)
                if data.goals:
                    existing_client.goals = data.goals
                if enriched_health_data:
                    existing_client.health_data = enriched_health_data
                if data.consents:
                    existing_client.consents = data.consents
                existing_client.is_active = True
                existing_client.deleted_at = None
                await attach_onboarding_progress_photo(
                    db=db,
                    client=existing_client,
                    data_url=data.progress_photo_data_url,
                    photo_type=data.progress_photo_type or "front",
                )
            else:
                client = Client(
                    workspace_id=data.workspace_id,
                    user_id=existing_user.id,
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

            # Si el email aún no estaba verificado, lo verificamos: la
            # persona ha demostrado conocer la contraseña del usuario, así
            # que es legítima.
            if not existing_user.email_verified:
                existing_user.email_verified = True
                existing_user.email_verification_token = None
                existing_user.email_verification_sent_at = None

            await db.commit()

            # Login automático: el usuario ya está vinculado al nuevo
            # workspace y puede entrar.
            access_token, refresh_token = create_tokens(
                {"sub": str(existing_user.id), "email": existing_user.email}
            )
            set_refresh_cookie(response, refresh_token)

            try:
                await email_service.send_email(
                    to_email=data.email,
                    to_name=full_name,
                    subject=f"Bienvenido a {workspace.name if workspace else 'Trackfiz'}",
                    html_content=EmailTemplates.client_welcome_after_onboarding(
                        full_name,
                        f"{settings.FRONTEND_URL}/my-dashboard",
                        workspace_name=workspace.name if workspace else None,
                    ),
                )
            except Exception as e:
                logger.error(f"Failed to send welcome email to client: {e}")

            return Token(
                access_token=access_token,
                token_type="bearer",
                expires_in=settings.access_token_expire_minutes * 60,
                refresh_token=refresh_token,
                requires_email_verification=False,
            )

        # Caso 2: usuario nuevo -> creación normal con verificación de email
        verification_token = generate_verification_token()

        user = User(
            email=email_lc,
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

        db.add(UserRole(
            user_id=user.id,
            workspace_id=data.workspace_id,
            role=RoleType.client,
            is_default=True,
        ))

        client = Client(
            workspace_id=data.workspace_id,
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

        await db.commit()

        confirmation_url = f"{settings.FRONTEND_URL}/auth/confirm?token={verification_token}&type=signup"
        ws_name_for_email = workspace.name if workspace else None
        html_content = EmailTemplates.email_confirmation(
            full_name,
            confirmation_url,
            workspace_name=ws_name_for_email,
        )
        subject_brand = ws_name_for_email or "Trackfiz"

        try:
            await email_service.send_email(
                to_email=data.email,
                to_name=full_name,
                subject=f"Confirma tu cuenta en {subject_brand}",
                html_content=html_content,
            )
        except Exception as e:
            logger.error(f"Failed to send verification email to client: {e}")

        try:
            await email_service.send_email(
                to_email=data.email,
                to_name=full_name,
                subject=f"Bienvenido a {subject_brand}",
                html_content=EmailTemplates.client_welcome_after_onboarding(
                    full_name,
                    f"{settings.FRONTEND_URL}/my-dashboard",
                    workspace_name=ws_name_for_email,
                ),
            )
        except Exception as e:
            logger.error(f"Failed to send welcome email to client: {e}")

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
            detail="Error al registrar cliente"
        )
