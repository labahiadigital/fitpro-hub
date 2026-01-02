"""Document and progress photo management endpoints."""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.models.document import Document, ProgressPhoto
from app.middleware.auth import require_workspace, require_staff, CurrentUser

router = APIRouter()


# ============ SCHEMAS ============

class DocumentCreate(BaseModel):
    client_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    file_url: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    document_type: str = "general"
    direction: str = "outbound"


class DocumentResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    client_id: Optional[UUID]
    uploaded_by: Optional[UUID]
    name: str
    description: Optional[str]
    file_url: str
    file_type: Optional[str]
    file_size: Optional[int]
    document_type: str
    direction: str
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProgressPhotoCreate(BaseModel):
    client_id: UUID
    photo_url: str
    thumbnail_url: Optional[str] = None
    photo_type: str = "front"
    photo_date: Optional[datetime] = None
    weight_kg: Optional[str] = None
    body_fat_percentage: Optional[str] = None
    notes: Optional[str] = None
    is_private: bool = True


class ProgressPhotoResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    client_id: UUID
    uploaded_by: Optional[UUID]
    photo_url: str
    thumbnail_url: Optional[str]
    photo_type: str
    photo_date: datetime
    weight_kg: Optional[str]
    body_fat_percentage: Optional[str]
    notes: Optional[str]
    is_private: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ DOCUMENTS ============

@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    client_id: Optional[UUID] = None,
    document_type: Optional[str] = None,
    direction: Optional[str] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar documentos del workspace.
    """
    query = select(Document).where(
        Document.workspace_id == current_user.workspace_id
    )
    
    if client_id:
        query = query.where(Document.client_id == client_id)
    
    if document_type:
        query = query.where(Document.document_type == document_type)
    
    if direction:
        query = query.where(Document.direction == direction)
    
    result = await db.execute(query.order_by(Document.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    data: DocumentCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo documento.
    """
    document = Document(
        workspace_id=current_user.workspace_id,
        client_id=data.client_id,
        uploaded_by=current_user.id,
        name=data.name,
        description=data.description,
        file_url=data.file_url,
        file_type=data.file_type,
        file_size=data.file_size,
        document_type=data.document_type,
        direction=data.direction,
        is_read=False
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return document


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de un documento.
    """
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.workspace_id == current_user.workspace_id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )
    
    return document


@router.put("/{document_id}/read", response_model=DocumentResponse)
async def mark_document_read(
    document_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Marcar un documento como leído.
    """
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.workspace_id == current_user.workspace_id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )
    
    document.is_read = True
    document.read_at = datetime.utcnow()
    await db.commit()
    await db.refresh(document)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un documento.
    """
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.workspace_id == current_user.workspace_id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )
    
    await db.delete(document)
    await db.commit()


# ============ PROGRESS PHOTOS ============

@router.get("/photos/client/{client_id}", response_model=List[ProgressPhotoResponse])
async def list_client_progress_photos(
    client_id: UUID,
    photo_type: Optional[str] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar fotos de progreso de un cliente.
    """
    query = select(ProgressPhoto).where(
        ProgressPhoto.workspace_id == current_user.workspace_id,
        ProgressPhoto.client_id == client_id
    )
    
    if photo_type:
        query = query.where(ProgressPhoto.photo_type == photo_type)
    
    result = await db.execute(query.order_by(ProgressPhoto.photo_date.desc()))
    return result.scalars().all()


@router.post("/photos", response_model=ProgressPhotoResponse, status_code=status.HTTP_201_CREATED)
async def create_progress_photo(
    data: ProgressPhotoCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear una nueva foto de progreso.
    """
    photo = ProgressPhoto(
        workspace_id=current_user.workspace_id,
        client_id=data.client_id,
        uploaded_by=current_user.id,
        photo_url=data.photo_url,
        thumbnail_url=data.thumbnail_url,
        photo_type=data.photo_type,
        photo_date=data.photo_date or datetime.utcnow(),
        weight_kg=data.weight_kg,
        body_fat_percentage=data.body_fat_percentage,
        notes=data.notes,
        is_private=data.is_private
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return photo


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_progress_photo(
    photo_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar una foto de progreso.
    """
    result = await db.execute(
        select(ProgressPhoto).where(
            ProgressPhoto.id == photo_id,
            ProgressPhoto.workspace_id == current_user.workspace_id
        )
    )
    photo = result.scalar_one_or_none()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Foto no encontrada"
        )
    
    await db.delete(photo)
    await db.commit()
