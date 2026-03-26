"""Document management endpoints for both clients and trainers."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from supabase import acreate_client

from app.core.database import get_db
from app.core.config import settings
from app.middleware.auth import get_current_user, CurrentUser
from app.models.document import Document
from app.models.client import Client
import uuid as uuid_module

router = APIRouter()

BUCKET_NAME = "documents"
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


class DocumentResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    client_id: Optional[UUID] = None
    uploaded_by: Optional[UUID] = None
    name: str
    original_filename: str
    file_url: str
    file_size: Optional[int] = None
    content_type: Optional[str] = None
    category: str
    created_at: str

    class Config:
        from_attributes = True


# ============ CLIENT PORTAL ============

@router.post("/my/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def client_upload_document(
    file: UploadFile = File(...),
    name: Optional[str] = Query(None),
    category: str = Query("general"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Client uploads a document."""
    result = await db.execute(
        select(Client).where(
            Client.user_id == current_user.id,
            Client.workspace_id == current_user.workspace_id,
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="El archivo supera el límite de 20 MB")

    ext = file.filename.split(".")[-1] if file.filename else "bin"
    unique_id = str(uuid_module.uuid4())
    storage_path = f"{current_user.workspace_id}/{client.id}/{unique_id}.{ext}"

    try:
        supabase = await acreate_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        await supabase.storage.from_(BUCKET_NAME).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type or "application/octet-stream", "upsert": "true"},
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Error al subir el archivo")

    public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{storage_path}"

    doc = Document(
        workspace_id=current_user.workspace_id,
        client_id=client.id,
        uploaded_by=current_user.id,
        name=name or file.filename or "Documento",
        original_filename=file.filename or "file",
        file_url=public_url,
        file_size=len(content),
        content_type=file.content_type,
        category=category,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return DocumentResponse(
        id=doc.id,
        workspace_id=doc.workspace_id,
        client_id=doc.client_id,
        uploaded_by=doc.uploaded_by,
        name=doc.name,
        original_filename=doc.original_filename,
        file_url=doc.file_url,
        file_size=doc.file_size,
        content_type=doc.content_type,
        category=doc.category or "general",
        created_at=doc.created_at.isoformat(),
    )


@router.get("/my/documents", response_model=List[DocumentResponse])
async def client_list_documents(
    category: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Client lists their own documents."""
    result = await db.execute(
        select(Client).where(
            Client.user_id == current_user.id,
            Client.workspace_id == current_user.workspace_id,
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")

    query = (
        select(Document)
        .where(Document.client_id == client.id, Document.workspace_id == current_user.workspace_id)
        .order_by(desc(Document.created_at))
    )
    if category and category != "Todos":
        query = query.where(Document.category == category)

    result = await db.execute(query)
    docs = result.scalars().all()

    return [
        DocumentResponse(
            id=d.id,
            workspace_id=d.workspace_id,
            client_id=d.client_id,
            uploaded_by=d.uploaded_by,
            name=d.name,
            original_filename=d.original_filename,
            file_url=d.file_url,
            file_size=d.file_size,
            content_type=d.content_type,
            category=d.category or "general",
            created_at=d.created_at.isoformat(),
        )
        for d in docs
    ]


@router.delete("/my/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def client_delete_document(
    document_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Client deletes their own document."""
    result = await db.execute(
        select(Client).where(
            Client.user_id == current_user.id,
            Client.workspace_id == current_user.workspace_id,
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")

    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.client_id == client.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    await db.delete(doc)
    await db.commit()


# ============ TRAINER ENDPOINTS ============

@router.post("/workspaces/{workspace_id}/clients/{client_id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def trainer_upload_document(
    workspace_id: UUID,
    client_id: UUID,
    file: UploadFile = File(...),
    name: Optional[str] = Query(None),
    category: str = Query("general"),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trainer uploads a document for a client."""
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="El archivo supera el límite de 20 MB")

    ext = file.filename.split(".")[-1] if file.filename else "bin"
    unique_id = str(uuid_module.uuid4())
    storage_path = f"{workspace_id}/{client_id}/{unique_id}.{ext}"

    try:
        supabase = await acreate_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        await supabase.storage.from_(BUCKET_NAME).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type or "application/octet-stream", "upsert": "true"},
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Error al subir el archivo")

    public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{storage_path}"

    doc = Document(
        workspace_id=workspace_id,
        client_id=client_id,
        uploaded_by=current_user.id,
        name=name or file.filename or "Documento",
        original_filename=file.filename or "file",
        file_url=public_url,
        file_size=len(content),
        content_type=file.content_type,
        category=category,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return DocumentResponse(
        id=doc.id,
        workspace_id=doc.workspace_id,
        client_id=doc.client_id,
        uploaded_by=doc.uploaded_by,
        name=doc.name,
        original_filename=doc.original_filename,
        file_url=doc.file_url,
        file_size=doc.file_size,
        content_type=doc.content_type,
        category=doc.category or "general",
        created_at=doc.created_at.isoformat(),
    )


@router.get("/workspaces/{workspace_id}/clients/{client_id}/documents", response_model=List[DocumentResponse])
async def trainer_list_client_documents(
    workspace_id: UUID,
    client_id: UUID,
    category: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trainer lists documents for a specific client."""
    query = (
        select(Document)
        .where(Document.client_id == client_id, Document.workspace_id == workspace_id)
        .order_by(desc(Document.created_at))
    )
    if category and category != "Todos":
        query = query.where(Document.category == category)

    result = await db.execute(query)
    docs = result.scalars().all()

    return [
        DocumentResponse(
            id=d.id,
            workspace_id=d.workspace_id,
            client_id=d.client_id,
            uploaded_by=d.uploaded_by,
            name=d.name,
            original_filename=d.original_filename,
            file_url=d.file_url,
            file_size=d.file_size,
            content_type=d.content_type,
            category=d.category or "general",
            created_at=d.created_at.isoformat(),
        )
        for d in docs
    ]
