"""Document management endpoints for trainers."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from app.core.database import get_db
from app.core.storage import upload_workspace_file, generate_filename
from app.middleware.auth import get_current_user, CurrentUser
from app.models.document import Document

router = APIRouter()

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


@router.post("/workspaces/{workspace_id}/clients/{client_id}", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
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

    filename = generate_filename(file.filename)

    try:
        public_url = await upload_workspace_file(
            content, workspace_id,
            "clients", str(client_id), "documents", filename,
            content_type=file.content_type or "application/octet-stream",
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Error al subir el archivo")

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


@router.get("/workspaces/{workspace_id}/clients/{client_id}", response_model=List[DocumentResponse])
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
