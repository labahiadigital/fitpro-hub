from typing import List, Optional, Dict
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.client import Client, ClientTag
from app.models.user import UserRole
from app.schemas.client import (
    ClientCreate, ClientUpdate, ClientResponse, ClientListResponse,
    ClientTagCreate, ClientTagUpdate, ClientTagResponse
)
from app.schemas.base import PaginatedResponse, BaseSchema
from app.middleware.auth import require_workspace, require_staff, CurrentUser, get_current_user

router = APIRouter()


# ============ TAGS ============

@router.get("/tags", response_model=List[ClientTagResponse])
async def list_tags(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar todas las etiquetas del workspace.
    """
    result = await db.execute(
        select(ClientTag).where(ClientTag.workspace_id == current_user.workspace_id)
    )
    return result.scalars().all()


@router.post("/tags", response_model=ClientTagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    data: ClientTagCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear una nueva etiqueta.
    """
    tag = ClientTag(
        workspace_id=current_user.workspace_id,
        name=data.name,
        color=data.color
    )
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar una etiqueta.
    """
    result = await db.execute(
        select(ClientTag).where(
            ClientTag.id == tag_id,
            ClientTag.workspace_id == current_user.workspace_id
        )
    )
    tag = result.scalar_one_or_none()
    
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Etiqueta no encontrada"
        )
    
    await db.delete(tag)
    await db.commit()


# ============ CLIENTS ============

@router.get("", response_model=PaginatedResponse[ClientListResponse])
async def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    tag_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar clientes del workspace con paginación y filtros.
    """
    query = select(Client).where(Client.workspace_id == current_user.workspace_id)
    count_query = select(func.count(Client.id)).where(Client.workspace_id == current_user.workspace_id)
    
    # Apply filters
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Client.first_name.ilike(search_filter)) |
            (Client.last_name.ilike(search_filter)) |
            (Client.email.ilike(search_filter))
        )
        count_query = count_query.where(
            (Client.first_name.ilike(search_filter)) |
            (Client.last_name.ilike(search_filter)) |
            (Client.email.ilike(search_filter))
        )
    
    if is_active is not None:
        query = query.where(Client.is_active == is_active)
        count_query = count_query.where(Client.is_active == is_active)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.options(selectinload(Client.tags)).offset(offset).limit(page_size).order_by(Client.created_at.desc())
    
    result = await db.execute(query)
    clients = result.scalars().all()
    
    # Convert to response model
    items = [
        ClientListResponse(
            id=c.id,
            first_name=c.first_name,
            last_name=c.last_name,
            full_name=c.full_name,
            email=c.email,
            phone=c.phone,
            avatar_url=c.avatar_url,
            is_active=c.is_active,
            tags=[ClientTagResponse(id=t.id, name=t.name, color=t.color, created_at=t.created_at) for t in c.tags],
            created_at=c.created_at
        )
        for c in clients
    ]
    
    return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    data: ClientCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo cliente.
    """
    # Check if email already exists in workspace
    result = await db.execute(
        select(Client).where(
            Client.workspace_id == current_user.workspace_id,
            Client.email == data.email
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un cliente con este email en el workspace"
        )
    
    # Create client
    client = Client(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        avatar_url=data.avatar_url,
        birth_date=data.birth_date,
        gender=data.gender,
        height_cm=data.height_cm,
        weight_kg=data.weight_kg,
        health_data=data.health_data or {},
        goals=data.goals,
        internal_notes=data.internal_notes,
        consents=data.consents.model_dump() if data.consents else {}
    )
    db.add(client)
    await db.flush()
    
    # Add tags if provided
    if data.tag_ids:
        result = await db.execute(
            select(ClientTag).where(
                ClientTag.id.in_(data.tag_ids),
                ClientTag.workspace_id == current_user.workspace_id
            )
        )
        tags = result.scalars().all()
        client.tags = list(tags)
    
    await db.commit()
    await db.refresh(client)
    
    # Load tags for response
    result = await db.execute(
        select(Client).where(Client.id == client.id).options(selectinload(Client.tags))
    )
    client = result.scalar_one()
    
    return ClientResponse(
        id=client.id,
        workspace_id=client.workspace_id,
        first_name=client.first_name,
        last_name=client.last_name,
        full_name=client.full_name,
        email=client.email,
        phone=client.phone,
        avatar_url=client.avatar_url,
        birth_date=client.birth_date,
        gender=client.gender,
        height_cm=client.height_cm,
        weight_kg=client.weight_kg,
        health_data=client.health_data,
        goals=client.goals,
        consents=client.consents,
        is_active=client.is_active,
        tags=[ClientTagResponse(id=t.id, name=t.name, color=t.color, created_at=t.created_at) for t in client.tags],
        created_at=client.created_at,
        updated_at=client.updated_at
    )


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de un cliente.
    """
    result = await db.execute(
        select(Client)
        .where(
            Client.id == client_id,
            Client.workspace_id == current_user.workspace_id
        )
        .options(selectinload(Client.tags))
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    
    return ClientResponse(
        id=client.id,
        workspace_id=client.workspace_id,
        first_name=client.first_name,
        last_name=client.last_name,
        full_name=client.full_name,
        email=client.email,
        phone=client.phone,
        avatar_url=client.avatar_url,
        birth_date=client.birth_date,
        gender=client.gender,
        height_cm=client.height_cm,
        weight_kg=client.weight_kg,
        health_data=client.health_data,
        goals=client.goals,
        consents=client.consents,
        is_active=client.is_active,
        tags=[ClientTagResponse(id=t.id, name=t.name, color=t.color, created_at=t.created_at) for t in client.tags],
        created_at=client.created_at,
        updated_at=client.updated_at
    )


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    data: ClientUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar un cliente.
    """
    result = await db.execute(
        select(Client)
        .where(
            Client.id == client_id,
            Client.workspace_id == current_user.workspace_id
        )
        .options(selectinload(Client.tags))
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True, exclude={"tag_ids"})
    for field, value in update_data.items():
        if value is not None:
            if field in ["health_data", "consents"] and isinstance(value, dict):
                current_value = getattr(client, field) or {}
                current_value.update(value)
                setattr(client, field, current_value)
            else:
                setattr(client, field, value)
    
    # Update tags if provided
    if data.tag_ids is not None:
        result = await db.execute(
            select(ClientTag).where(
                ClientTag.id.in_(data.tag_ids),
                ClientTag.workspace_id == current_user.workspace_id
            )
        )
        tags = result.scalars().all()
        client.tags = list(tags)
    
    await db.commit()
    await db.refresh(client)
    
    return ClientResponse(
        id=client.id,
        workspace_id=client.workspace_id,
        first_name=client.first_name,
        last_name=client.last_name,
        full_name=client.full_name,
        email=client.email,
        phone=client.phone,
        avatar_url=client.avatar_url,
        birth_date=client.birth_date,
        gender=client.gender,
        height_cm=client.height_cm,
        weight_kg=client.weight_kg,
        health_data=client.health_data,
        goals=client.goals,
        consents=client.consents,
        is_active=client.is_active,
        tags=[ClientTagResponse(id=t.id, name=t.name, color=t.color, created_at=t.created_at) for t in client.tags],
        created_at=client.created_at,
        updated_at=client.updated_at
    )


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un cliente (soft delete - desactivar).
    """
    result = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.workspace_id == current_user.workspace_id
        )
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    
    # Soft delete
    client.is_active = False
    await db.commit()


@router.delete("/{client_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client_permanent(
    client_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un cliente permanentemente (GDPR - derecho al olvido).
    """
    result = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.workspace_id == current_user.workspace_id
        )
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )
    
    # Hard delete
    await db.delete(client)
    await db.commit()


# ============ ONBOARDING ============

class OnboardingRequest(BaseSchema):
    """Schema for client onboarding data."""
    first_name: str
    last_name: str
    phone: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    goals: Optional[str] = None
    health_data: Optional[Dict] = None
    consents: Optional[Dict] = None


@router.post("/onboarding", response_model=ClientResponse)
async def complete_onboarding(
    data: OnboardingRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Complete client onboarding. Creates or updates client profile for the authenticated user.
    This endpoint is for users (clients) to complete their profile after registration.
    """
    # Check if user already has a client profile in any workspace
    result = await db.execute(
        select(Client).where(Client.user_id == current_user.id)
    )
    existing_client = result.scalar_one_or_none()
    
    if existing_client:
        # Update existing client profile
        existing_client.first_name = data.first_name
        existing_client.last_name = data.last_name
        existing_client.phone = data.phone
        existing_client.birth_date = data.birth_date
        existing_client.gender = data.gender
        existing_client.height_cm = str(data.height_cm) if data.height_cm else None
        existing_client.weight_kg = str(data.weight_kg) if data.weight_kg else None
        existing_client.goals = data.goals
        existing_client.health_data = data.health_data or {}
        existing_client.consents = data.consents or {}
        
        await db.commit()
        await db.refresh(existing_client)
        client = existing_client
    else:
        # Find the workspace the user belongs to (if any)
        result = await db.execute(
            select(UserRole).where(UserRole.user_id == current_user.id)
        )
        user_role = result.scalar_one_or_none()
        
        if not user_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No tienes un workspace asignado. Contacta con tu entrenador."
            )
        
        workspace_id = user_role.workspace_id
        
        # Create new client profile
        client = Client(
            workspace_id=workspace_id,
            user_id=current_user.id,
            first_name=data.first_name,
            last_name=data.last_name,
            email=current_user.email,
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
        await db.refresh(client)
    
    # Return response
    return ClientResponse(
        id=client.id,
        workspace_id=client.workspace_id,
        first_name=client.first_name,
        last_name=client.last_name,
        full_name=client.full_name,
        email=client.email,
        phone=client.phone,
        avatar_url=client.avatar_url,
        birth_date=client.birth_date,
        gender=client.gender,
        height_cm=client.height_cm,
        weight_kg=client.weight_kg,
        health_data=client.health_data or {},
        goals=client.goals,
        consents=client.consents or {},
        is_active=client.is_active,
        tags=[],
        created_at=client.created_at,
        updated_at=client.updated_at
    )

