from typing import List, Optional, Dict
from uuid import UUID
from datetime import datetime, timedelta, timezone
import secrets
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.config import settings
from app.models.client import Client, ClientTag
from app.models.exercise import ClientMeasurement
from app.models.user import UserRole, User
from app.models.invitation import ClientInvitation
from app.models.workspace import Workspace
from app.schemas.client import (
    ClientCreate, ClientUpdate, ClientResponse, ClientListResponse,
    ClientTagCreate, ClientTagUpdate, ClientTagResponse
)
from app.schemas.base import PaginatedResponse, BaseSchema
from app.middleware.auth import require_workspace, require_staff, CurrentUser, get_current_user

router = APIRouter()


# Schemas para medidas (usados por el entrenador)
class ClientMeasurementResponse(BaseModel):
    id: UUID
    client_id: UUID
    measured_at: Optional[datetime] = None
    weight_kg: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    muscle_mass_kg: Optional[float] = None
    measurements: dict = {}
    photos: List[dict] = []
    notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ClientPhotoResponse(BaseModel):
    url: str
    type: str
    notes: Optional[str] = None
    uploaded_at: str
    measurement_date: Optional[str] = None


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


# ============ CLIENT MEASUREMENTS (Staff access) ============

@router.get("/{client_id}/measurements", response_model=List[ClientMeasurementResponse])
async def get_client_measurements(
    client_id: UUID,
    limit: int = Query(50, le=200),
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all measurements for a specific client (staff only).
    Returns measurements ordered by date (newest first).
    """
    # Verify client exists and belongs to workspace
    client = await db.get(Client, client_id)
    if not client or client.workspace_id != current_user.workspace_id:
        raise HTTPException(status_code=404, detail="Client not found")
    
    result = await db.execute(
        select(ClientMeasurement)
        .where(ClientMeasurement.client_id == client_id)
        .order_by(desc(ClientMeasurement.measured_at))
        .limit(limit)
    )
    measurements = result.scalars().all()
    
    return [
        ClientMeasurementResponse(
            id=m.id,
            client_id=m.client_id,
            measured_at=m.measured_at,
            weight_kg=float(m.weight_kg) if m.weight_kg else None,
            body_fat_percentage=float(m.body_fat_percentage) if m.body_fat_percentage else None,
            muscle_mass_kg=float(m.muscle_mass_kg) if m.muscle_mass_kg else None,
            measurements=m.measurements or {},
            photos=m.photos or [],
            notes=m.notes,
            created_at=m.created_at
        )
        for m in measurements
    ]


@router.get("/{client_id}/photos", response_model=List[ClientPhotoResponse])
async def get_client_photos(
    client_id: UUID,
    limit: int = Query(50, le=200),
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all progress photos for a specific client (staff only).
    Returns photos from all measurements ordered by date (newest first).
    """
    # Verify client exists and belongs to workspace
    client = await db.get(Client, client_id)
    if not client or client.workspace_id != current_user.workspace_id:
        raise HTTPException(status_code=404, detail="Client not found")
    
    result = await db.execute(
        select(ClientMeasurement)
        .where(ClientMeasurement.client_id == client_id)
        .order_by(desc(ClientMeasurement.measured_at))
        .limit(limit)
    )
    measurements = result.scalars().all()
    
    # Flatten all photos with their dates (filter out empty arrays)
    all_photos = []
    for m in measurements:
        if m.photos and len(m.photos) > 0:
            for photo in m.photos:
                if photo.get("url"):  # Only include photos with valid URLs
                    all_photos.append(ClientPhotoResponse(
                        url=photo.get("url", ""),
                        type=photo.get("type", "unknown"),
                        notes=photo.get("notes"),
                        uploaded_at=photo.get("uploaded_at", ""),
                        measurement_date=m.measured_at.isoformat() if m.measured_at else None
                    ))
    
    return all_photos


@router.get("/{client_id}/progress-summary")
async def get_client_progress_summary(
    client_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Get progress summary for a specific client (staff only).
    Returns current stats, starting stats, and trends.
    """
    # Verify client exists and belongs to workspace
    client = await db.get(Client, client_id)
    if not client or client.workspace_id != current_user.workspace_id:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get all measurements
    result = await db.execute(
        select(ClientMeasurement)
        .where(ClientMeasurement.client_id == client_id)
        .order_by(desc(ClientMeasurement.measured_at))
    )
    measurements = result.scalars().all()
    
    latest = measurements[0] if measurements else None
    first = measurements[-1] if measurements else None
    
    return {
        "current_stats": {
            "weight": float(latest.weight_kg) if latest and latest.weight_kg else float(client.weight_kg or 0),
            "body_fat": float(latest.body_fat_percentage) if latest and latest.body_fat_percentage else None,
            "muscle_mass": float(latest.muscle_mass_kg) if latest and latest.muscle_mass_kg else None,
        },
        "start_stats": {
            "weight": float(first.weight_kg) if first and first.weight_kg else float(client.weight_kg or 0),
            "body_fat": float(first.body_fat_percentage) if first and first.body_fat_percentage else None,
            "muscle_mass": float(first.muscle_mass_kg) if first and first.muscle_mass_kg else None,
        },
        "target_stats": {
            "weight": client.health_data.get("goal_weight_kg") if client.health_data else None,
            "body_fat": client.health_data.get("goal_body_fat") if client.health_data else None,
            "muscle_mass": client.health_data.get("goal_muscle_mass") if client.health_data else None,
        },
        "measurements_count": len(measurements),
        "goals": client.goals,
        "weight_history": [
            {
                "date": m.measured_at.isoformat() if m.measured_at else None,
                "weight": float(m.weight_kg) if m.weight_kg else None,
                "body_fat": float(m.body_fat_percentage) if m.body_fat_percentage else None,
                "muscle_mass": float(m.muscle_mass_kg) if m.muscle_mass_kg else None,
            }
            for m in reversed(measurements[-20:])  # Last 20, oldest first
        ]
    }


# ============ CLIENT INVITATIONS ============

class InvitationCreate(BaseModel):
    """Schema for creating a client invitation."""
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    message: Optional[str] = None


class InvitationResponse(BaseModel):
    """Schema for invitation response."""
    id: UUID
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    status: str
    expires_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


async def send_invitation_email(
    email: str,
    invite_link: str,
    workspace_name: str,
    trainer_name: str,
    first_name: Optional[str] = None,
    message: Optional[str] = None,
) -> bool:
    """Send invitation email using Brevo API."""
    if not settings.BREVO_API_KEY:
        print("[WARNING] BREVO_API_KEY not configured, skipping email send")
        return False
    
    greeting = f"Hola {first_name}" if first_name else "Hola"
    custom_message = f'<p style="color: #666; font-size: 16px; background: #f0f0f0; padding: 15px; border-radius: 8px; font-style: italic;">"{message}"</p>' if message else ""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'DM Sans', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2A2822 0%, #3D3A32 100%); padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
                <div style="display: inline-block; width: 50px; height: 50px; background: #E7E247; border-radius: 12px; line-height: 50px; font-size: 24px; font-weight: bold; color: #2A2822; margin-bottom: 15px;">T</div>
                <h1 style="color: white; margin: 10px 0 5px 0; font-size: 24px;">¡Te han invitado a Trackfiz!</h1>
                <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 14px;">{workspace_name}</p>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <p style="color: #333; font-size: 18px; margin-bottom: 5px;">{greeting},</p>
                <p style="color: #666; font-size: 16px;">
                    <strong>{trainer_name}</strong> te ha invitado a unirte a <strong>{workspace_name}</strong> en Trackfiz.
                </p>
                {custom_message}
                <p style="color: #666; font-size: 16px;">
                    Con Trackfiz podrás:
                </p>
                <ul style="color: #666; font-size: 15px; padding-left: 20px;">
                    <li>📊 Ver tu plan de entrenamiento personalizado</li>
                    <li>🥗 Seguir tu plan de nutrición</li>
                    <li>📈 Registrar tu progreso y medidas</li>
                    <li>📅 Gestionar tus citas y sesiones</li>
                    <li>💬 Comunicarte directamente con tu entrenador</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{invite_link}" style="display: inline-block; background: linear-gradient(135deg, #E7E247 0%, #D4CF3D 100%); color: #2A2822; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(231,226,71,0.3);">
                        Crear mi cuenta
                    </a>
                </div>
                <p style="color: #999; font-size: 13px; text-align: center;">
                    Este enlace expira en 7 días. Si no has solicitado esta invitación, puedes ignorar este email.
                </p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                <p>© 2026 Trackfiz by E13 Fitness. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        headers = {
            "api-key": settings.BREVO_API_KEY,
            "Content-Type": "application/json",
        }
        
        payload = {
            "sender": {
                "name": settings.FROM_NAME,
                "email": settings.FROM_EMAIL,
            },
            "to": [{"email": email, "name": first_name or ""}],
            "subject": f"🎯 {trainer_name} te invita a unirte a {workspace_name}",
            "htmlContent": html_content,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers=headers,
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
        
        print(f"[OK] Invitation email sent to {email}")
        return True
        
    except Exception as e:
        print(f"[ERROR] Failed to send invitation email to {email}: {e}")
        return False


@router.post("/invitations", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def create_invitation(
    data: InvitationCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Create and send an invitation to a new client.
    The client will receive an email with a link to complete their registration.
    """
    # Check if there's already a pending invitation for this email
    result = await db.execute(
        select(ClientInvitation).where(
            and_(
                ClientInvitation.workspace_id == current_user.workspace_id,
                ClientInvitation.email == data.email,
                ClientInvitation.status == "pending"
            )
        )
    )
    existing_invitation = result.scalar_one_or_none()
    
    if existing_invitation and not existing_invitation.is_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una invitación pendiente para este email"
        )
    
    # Check if client already exists with this email
    result = await db.execute(
        select(Client).where(
            and_(
                Client.workspace_id == current_user.workspace_id,
                Client.email == data.email
            )
        )
    )
    existing_client = result.scalar_one_or_none()
    
    if existing_client and existing_client.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un cliente registrado con este email"
        )
    
    # Get workspace info
    result = await db.execute(
        select(Workspace).where(Workspace.id == current_user.workspace_id)
    )
    workspace = result.scalar_one_or_none()
    workspace_name = workspace.name if workspace else "Trackfiz"
    
    # Get trainer name
    result = await db.execute(
        select(User).where(User.id == current_user.id)
    )
    user = result.scalar_one_or_none()
    trainer_name = user.full_name if user else "Tu entrenador"
    
    # Generate unique token
    token = secrets.token_urlsafe(32)
    
    # Create invitation
    invitation = ClientInvitation(
        workspace_id=current_user.workspace_id,
        invited_by=current_user.id,
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        token=token,
        status="pending",
        expires_at=datetime.utcnow() + timedelta(days=7),
        message=data.message,
        client_id=existing_client.id if existing_client else None
    )
    
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)
    
    # Build invitation link
    invite_link = f"{settings.FRONTEND_URL}/onboarding/invite/{token}"
    
    # Send email
    email_sent = await send_invitation_email(
        email=data.email,
        invite_link=invite_link,
        workspace_name=workspace_name,
        trainer_name=trainer_name,
        first_name=data.first_name,
        message=data.message
    )
    
    if not email_sent:
        # Log warning but don't fail - invitation is created
        print(f"[WARNING] Invitation created but email not sent for {data.email}")
    
    return InvitationResponse(
        id=invitation.id,
        email=invitation.email,
        first_name=invitation.first_name,
        last_name=invitation.last_name,
        status=invitation.status,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at
    )


@router.get("/invitations", response_model=List[InvitationResponse])
async def list_invitations(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    List all invitations for the workspace.
    """
    query = select(ClientInvitation).where(
        ClientInvitation.workspace_id == current_user.workspace_id
    )
    
    if status_filter:
        query = query.where(ClientInvitation.status == status_filter)
    
    query = query.order_by(desc(ClientInvitation.created_at))
    
    result = await db.execute(query)
    invitations = result.scalars().all()
    
    return [
        InvitationResponse(
            id=inv.id,
            email=inv.email,
            first_name=inv.first_name,
            last_name=inv.last_name,
            status=inv.status if not inv.is_expired else "expired",
            expires_at=inv.expires_at,
            created_at=inv.created_at
        )
        for inv in invitations
    ]


@router.post("/invitations/{invitation_id}/resend")
async def resend_invitation(
    invitation_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Resend an invitation email. Also extends the expiration date.
    """
    result = await db.execute(
        select(ClientInvitation).where(
            and_(
                ClientInvitation.id == invitation_id,
                ClientInvitation.workspace_id == current_user.workspace_id
            )
        )
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitación no encontrada")
    
    if invitation.status != "pending":
        raise HTTPException(status_code=400, detail="Solo se pueden reenviar invitaciones pendientes")
    
    # Get workspace and trainer info
    result = await db.execute(
        select(Workspace).where(Workspace.id == current_user.workspace_id)
    )
    workspace = result.scalar_one_or_none()
    workspace_name = workspace.name if workspace else "Trackfiz"
    
    result = await db.execute(
        select(User).where(User.id == current_user.id)
    )
    user = result.scalar_one_or_none()
    trainer_name = user.full_name if user else "Tu entrenador"
    
    # Extend expiration
    invitation.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.commit()
    
    # Build invitation link
    invite_link = f"{settings.FRONTEND_URL}/onboarding/invite/{invitation.token}"
    
    # Send email
    email_sent = await send_invitation_email(
        email=invitation.email,
        invite_link=invite_link,
        workspace_name=workspace_name,
        trainer_name=trainer_name,
        first_name=invitation.first_name,
        message=invitation.message
    )
    
    return {
        "success": email_sent,
        "message": "Invitación reenviada" if email_sent else "Error al enviar el email",
        "expires_at": invitation.expires_at.isoformat()
    }


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_invitation(
    invitation_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel a pending invitation.
    """
    result = await db.execute(
        select(ClientInvitation).where(
            and_(
                ClientInvitation.id == invitation_id,
                ClientInvitation.workspace_id == current_user.workspace_id
            )
        )
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitación no encontrada")
    
    invitation.status = "cancelled"
    await db.commit()

