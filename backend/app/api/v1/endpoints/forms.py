from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.models.form import Form, FormSubmission
from app.middleware.auth import require_workspace, require_staff, require_any_role, CurrentUser

router = APIRouter()


# ============ SCHEMAS ============

class FormFieldSchema(BaseModel):
    id: str
    type: str  # text, textarea, number, date, select, checkbox, file
    label: str
    required: bool = False
    options: Optional[List[str]] = None
    placeholder: Optional[str] = None


class FormSettingsSchema(BaseModel):
    require_signature: bool = False
    send_reminder: bool = True
    reminder_days: int = 3
    allow_edit: bool = False


class FormCreate(BaseModel):
    name: str
    description: Optional[str] = None
    form_type: str = "custom"
    schema: dict = {"fields": []}
    settings: Optional[FormSettingsSchema] = None


class FormResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str]
    form_type: str
    schema: dict
    settings: dict
    is_active: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class FormSubmissionCreate(BaseModel):
    form_id: UUID
    client_id: UUID
    answers: dict = {}
    signature_data: Optional[dict] = None


class FormSubmissionResponse(BaseModel):
    id: UUID
    form_id: UUID
    client_id: UUID
    answers: dict
    status: str
    submitted_at: Optional[datetime]
    signature_data: Optional[dict]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ FORMS ============

@router.get("", response_model=List[FormResponse])
async def list_forms(
    form_type: Optional[str] = None,
    is_active: Optional[str] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar formularios del workspace.
    """
    query = select(Form).where(Form.workspace_id == current_user.workspace_id)
    
    if form_type:
        query = query.where(Form.form_type == form_type)
    
    if is_active:
        query = query.where(Form.is_active == is_active)
    
    result = await db.execute(query.order_by(Form.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=FormResponse, status_code=status.HTTP_201_CREATED)
async def create_form(
    data: FormCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear un nuevo formulario.
    """
    form = Form(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        name=data.name,
        description=data.description,
        form_type=data.form_type,
        schema=data.schema,
        settings=data.settings.model_dump() if data.settings else {}
    )
    db.add(form)
    await db.commit()
    await db.refresh(form)
    return form


@router.get("/{form_id}", response_model=FormResponse)
async def get_form(
    form_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de un formulario.
    """
    result = await db.execute(
        select(Form).where(
            Form.id == form_id,
            Form.workspace_id == current_user.workspace_id
        )
    )
    form = result.scalar_one_or_none()
    
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado"
        )
    
    return form


@router.put("/{form_id}", response_model=FormResponse)
async def update_form(
    form_id: UUID,
    data: FormCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar un formulario.
    """
    result = await db.execute(
        select(Form).where(
            Form.id == form_id,
            Form.workspace_id == current_user.workspace_id
        )
    )
    form = result.scalar_one_or_none()
    
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado"
        )
    
    form.name = data.name
    form.description = data.description
    form.form_type = data.form_type
    form.schema = data.schema
    if data.settings:
        form.settings = data.settings.model_dump()
    
    await db.commit()
    await db.refresh(form)
    return form


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_form(
    form_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un formulario.
    """
    result = await db.execute(
        select(Form).where(
            Form.id == form_id,
            Form.workspace_id == current_user.workspace_id
        )
    )
    form = result.scalar_one_or_none()
    
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado"
        )
    
    await db.delete(form)
    await db.commit()


# ============ SUBMISSIONS ============

@router.get("/{form_id}/submissions", response_model=List[FormSubmissionResponse])
async def list_submissions(
    form_id: UUID,
    status: Optional[str] = None,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar respuestas de un formulario.
    """
    query = select(FormSubmission).where(FormSubmission.form_id == form_id)
    
    if status:
        query = query.where(FormSubmission.status == status)
    
    result = await db.execute(query.order_by(FormSubmission.created_at.desc()))
    return result.scalars().all()


@router.post("/submissions", response_model=FormSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    data: FormSubmissionCreate,
    current_user: CurrentUser = Depends(require_any_role),
    db: AsyncSession = Depends(get_db)
):
    """
    Enviar respuestas a un formulario.
    """
    submission = FormSubmission(
        form_id=data.form_id,
        client_id=data.client_id,
        answers=data.answers,
        signature_data=data.signature_data,
        status="submitted",
        submitted_at=datetime.utcnow()
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission


@router.get("/submissions/{submission_id}", response_model=FormSubmissionResponse)
async def get_submission(
    submission_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de una respuesta.
    """
    result = await db.execute(
        select(FormSubmission).where(FormSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Respuesta no encontrada"
        )
    
    return submission

