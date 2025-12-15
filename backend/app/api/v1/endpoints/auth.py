from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from supabase import create_client, Client as SupabaseClient

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole, RoleType
from app.models.workspace import Workspace
from app.schemas.auth import LoginRequest, RegisterRequest, Token
from app.schemas.user import UserResponse
from app.middleware.auth import get_current_user, CurrentUser

router = APIRouter()


def get_supabase_client() -> SupabaseClient:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


@router.post("/register", response_model=Token)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Registrar nuevo usuario y crear workspace.
    """
    supabase = get_supabase_client()
    
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
        auth_response = supabase.auth.sign_up({
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
                role=RoleType.OWNER,
                is_default=True
            )
            db.add(user_role)
        
        await db.commit()
        
        # Return tokens
        return Token(
            access_token=auth_response.session.access_token,
            token_type="bearer",
            expires_in=auth_response.session.expires_in or 3600,
            refresh_token=auth_response.session.refresh_token
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar usuario: {str(e)}"
        )


@router.post("/login", response_model=Token)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Iniciar sesión con email y contraseña.
    """
    supabase = get_supabase_client()
    
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas"
            )
        
        # Check if user exists in our database
        result = await db.execute(
            select(User).where(User.auth_id == auth_response.user.id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Create user if doesn't exist (for existing Supabase users)
            user = User(
                email=data.email,
                auth_id=auth_response.user.id,
                full_name=auth_response.user.user_metadata.get("full_name")
            )
            db.add(user)
            await db.commit()
        
        return Token(
            access_token=auth_response.session.access_token,
            token_type="bearer",
            expires_in=auth_response.session.expires_in or 3600,
            refresh_token=auth_response.session.refresh_token
        )
        
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
    supabase = get_supabase_client()
    
    try:
        supabase.auth.sign_out()
        return {"message": "Sesión cerrada correctamente"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cerrar sesión: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Obtener información del usuario actual.
    """
    return current_user.user


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str
):
    """
    Refrescar token de acceso.
    """
    supabase = get_supabase_client()
    
    try:
        auth_response = supabase.auth.refresh_session(refresh_token)
        
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

