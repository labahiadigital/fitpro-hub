from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from sqlalchemy.orm.attributes import flag_modified

from app.core.database import get_db
from app.core.security import create_tokens
from app.core.storage import upload_workspace_file, generate_filename, resolve_url
from app.models.user import User, UserRole, RoleType
from app.models.workspace import Workspace, generate_slug, check_slug_available, is_valid_slug
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse, WorkspaceListResponse
from app.middleware.auth import get_current_user, require_workspace, require_owner, CurrentUser

router = APIRouter()


@router.get("", response_model=List[WorkspaceListResponse])
async def list_workspaces(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar todos los workspaces del usuario actual.
    """
    result = await db.execute(
        select(UserRole, Workspace)
        .join(Workspace, UserRole.workspace_id == Workspace.id)
        .where(UserRole.user_id == current_user.id)
    )
    
    workspaces = []
    for user_role, workspace in result.all():
        workspaces.append(WorkspaceListResponse(
            id=workspace.id,
            name=workspace.name,
            slug=workspace.slug,
            domain=workspace.domain,
            logo_url=await resolve_url(workspace.logo_url),
            branding=workspace.branding or {},
            settings=workspace.settings or {},
            role=user_role.role.value
        ))
    
    return workspaces


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: WorkspaceCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo workspace.
    """
    slug = data.slug or generate_slug(data.name)
    
    if not await check_slug_available(db, slug):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un espacio con ese nombre. Elige otro nombre."
        )
    
    # Create workspace
    workspace = Workspace(
        name=data.name,
        slug=slug,
        description=data.description,
        logo_url=data.logo_url,
        branding=data.branding.model_dump() if data.branding else {},
        settings=data.settings.model_dump() if data.settings else {}
    )
    db.add(workspace)
    await db.flush()
    
    # Assign current user as owner
    user_role = UserRole(
        user_id=current_user.id,
        workspace_id=workspace.id,
        role=RoleType.owner,
        is_default=True
    )
    db.add(user_role)
    await db.commit()
    await db.refresh(workspace)
    
    return workspace


@router.get("/by-slug/{slug}")
async def get_workspace_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de un workspace por su slug.
    Este endpoint es público (usado para onboarding de clientes).
    """
    result = await db.execute(
        select(Workspace).where(Workspace.slug == slug)
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace no encontrado"
        )
    
    return {
        "id": str(workspace.id),
        "name": workspace.name,
        "slug": workspace.slug,
        "domain": workspace.domain,
        "logo_url": await resolve_url(workspace.logo_url),
        "branding": workspace.branding or {},
    }


@router.get("/by-domain/{domain}")
async def get_workspace_by_domain(
    domain: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Resolver workspace por dominio personalizado (white-label).
    Público: el frontend lo usa al cargar en un host distinto al de Trackfiz.
    """
    from app.core.workspace_url import normalize_hostname

    host = normalize_hostname(domain)
    if not host:
        raise HTTPException(status_code=400, detail="Dominio inválido")

    result = await db.execute(
        select(Workspace).where(Workspace.domain == host)
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay workspace asociado a este dominio",
        )

    return {
        "id": str(workspace.id),
        "name": workspace.name,
        "slug": workspace.slug,
        "domain": workspace.domain,
        "logo_url": await resolve_url(workspace.logo_url),
        "branding": workspace.branding or {},
    }


@router.get("/members", response_model=List[dict])
async def list_workspace_members(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar todos los miembros del equipo del workspace actual.
    Excluye a los usuarios con rol 'client' - estos se muestran en la sección de clientes.
    Solo devuelve owners y collaborators (miembros del equipo).
    """
    result = await db.execute(
        select(UserRole, User)
        .join(User, UserRole.user_id == User.id)
        .where(
            UserRole.workspace_id == current_user.workspace_id,
            # Excluir clientes - solo mostrar miembros del equipo (owner, collaborator)
            UserRole.role != RoleType.client
        )
    )
    
    members = []
    for user_role, user in result.all():
        effective_permissions = user_role.get_permissions()
        members.append({
            "id": str(user_role.id),
            "user_id": str(user.id),
            "workspace_id": str(user_role.workspace_id),
            "name": user.full_name,
            "full_name": user.full_name,
            "email": user.email,
            "role": user_role.role.value,
            "avatar_url": user.avatar_url,
            "is_active": user.is_active,
            "permissions": effective_permissions,
            "custom_permissions": user_role.permissions or {},
            "assigned_clients": user_role.assigned_clients or [],
            "created_at": user_role.created_at.isoformat() if user_role.created_at else None
        })

    return members


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de un workspace.
    """
    # Check if user has access to this workspace
    result = await db.execute(
        select(UserRole).where(
            UserRole.user_id == current_user.id,
            UserRole.workspace_id == workspace_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este workspace"
        )
    
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace no encontrado"
        )

    response = WorkspaceResponse.model_validate(workspace)
    response.logo_url = await resolve_url(workspace.logo_url)
    return response


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: UUID,
    data: WorkspaceUpdate,
    current_user: CurrentUser = Depends(require_owner),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar un workspace (solo propietario).
    """
    if current_user.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar este workspace"
        )
    
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace no encontrado"
        )
    
    update_data = data.model_dump(exclude_unset=True)

    if "slug" in update_data and update_data["slug"] is not None:
        new_slug = generate_slug(update_data["slug"])
        if not is_valid_slug(new_slug):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Slug inválido. Usa solo minúsculas, números y guiones.",
            )
        if new_slug != workspace.slug and not await check_slug_available(
            db, new_slug, exclude_id=workspace.id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ese slug ya está en uso. Elige otro.",
            )
        update_data["slug"] = new_slug

    if "domain" in update_data:
        domain = update_data["domain"]
        if domain is not None:
            domain = domain.strip().lower().removeprefix("https://").removeprefix("http://").rstrip("/")
            if not domain:
                domain = None
            elif " " in domain or "/" in domain:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Dominio inválido. Usa solo el hostname (ej. app.micentro.com).",
                )
            else:
                existing = await db.execute(
                    select(Workspace.id).where(
                        Workspace.domain == domain,
                        Workspace.id != workspace.id,
                    )
                )
                if existing.scalar_one_or_none():
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Ese dominio ya está asignado a otro workspace.",
                    )
        update_data["domain"] = domain
        # Refresh CORS allow-list so the new domain works immediately.
        from app.core.cors_origins import refresh_workspace_domain_cache
        await refresh_workspace_domain_cache()

    for field, value in update_data.items():
        if value is not None or field in ("domain", "description", "logo_url"):
            if field in ["branding", "settings"] and isinstance(value, dict):
                current_value = dict(getattr(workspace, field) or {})
                current_value.update(value)
                setattr(workspace, field, current_value)
                flag_modified(workspace, field)
            else:
                setattr(workspace, field, value)

    await db.commit()
    await db.refresh(workspace)

    # Return resolved logo so the client can display it immediately
    response = WorkspaceResponse.model_validate(workspace)
    response.logo_url = await resolve_url(workspace.logo_url)
    return response


@router.post("/{workspace_id}/logo")
async def upload_workspace_logo(
    workspace_id: UUID,
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """Upload a logo/photo for the workspace."""
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.id == current_user.workspace_id,
        )
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace no encontrado")

    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Usa JPEG, PNG o WebP.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Máximo 5 MB")

    filename = generate_filename(file.filename)
    try:
        public_url = await upload_workspace_file(
            content, str(workspace_id),
            "workspace", "logo", filename,
            content_type=file.content_type or "image/jpeg",
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Error al subir la imagen")

    workspace.logo_url = public_url
    await db.commit()
    presigned = await resolve_url(public_url)
    return {"logo_url": presigned}


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: UUID,
    current_user: CurrentUser = Depends(require_owner),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un workspace (solo propietario).
    """
    if current_user.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar este workspace"
        )
    
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace no encontrado"
        )
    
    await db.delete(workspace)
    await db.commit()


@router.post("/{workspace_id}/switch")
async def switch_workspace(
    workspace_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cambiar al workspace especificado.
    Retorna información necesaria para actualizar el contexto del cliente.
    """
    # Check if user has access to this workspace
    result = await db.execute(
        select(UserRole).where(
            UserRole.user_id == current_user.id,
            UserRole.workspace_id == workspace_id
        )
    )
    user_role = result.scalar_one_or_none()
    
    if not user_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este workspace"
        )
    
    # Get workspace details
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    workspace = result.scalar_one_or_none()
    
    access_token, refresh_token, expires_in = create_tokens(
        user_id=str(current_user.id),
        email=current_user.email,
        workspace_id=str(workspace_id),
        role=user_role.role.value,
    )

    return {
        "workspace_id": str(workspace_id),
        "workspace_name": workspace.name,
        "role": user_role.role.value,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": expires_in,
        "message": "Workspace cambiado correctamente"
    }
