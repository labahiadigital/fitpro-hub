from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.models.form import Form, FormSubmission
from app.models.client import Client
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
    model_config = {"populate_by_name": True}

    name: str
    description: Optional[str] = None
    form_type: str = "custom"
    form_schema: dict = Field(default={"fields": []}, alias="schema")
    settings: Optional[FormSettingsSchema] = None


class FormResponse(BaseModel):
    model_config = {"from_attributes": True, "populate_by_name": True, "serialize_by_alias": True}

    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str]
    form_type: str
    form_schema: dict = Field(alias="schema")
    settings: dict
    is_active: str
    created_at: datetime


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
        schema=data.form_schema,
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
    form.schema = data.form_schema
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


class FormSubmissionWithDetails(BaseModel):
    id: UUID
    form_id: UUID
    client_id: UUID
    client_name: Optional[str] = None
    form_name: Optional[str] = None
    answers: dict
    status: str
    submitted_at: Optional[datetime] = None
    signature_data: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/submissions/", response_model=List[FormSubmissionWithDetails])
async def list_all_submissions(
    form_id: Optional[UUID] = None,
    client_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar todas las respuestas del workspace con nombre de cliente y formulario.
    Paginada con ``limit``/``offset`` para no devolver miles de filas.
    """
    query = (
        select(
            FormSubmission,
            Client.first_name,
            Client.last_name,
            Form.name.label("form_name"),
        )
        .join(Form, FormSubmission.form_id == Form.id)
        .outerjoin(Client, FormSubmission.client_id == Client.id)
        .where(Form.workspace_id == current_user.workspace_id)
    )

    if form_id:
        query = query.where(FormSubmission.form_id == form_id)
    if client_id:
        query = query.where(FormSubmission.client_id == client_id)
    if status_filter:
        query = query.where(FormSubmission.status == status_filter)

    result = await db.execute(
        query.order_by(FormSubmission.created_at.desc()).limit(limit).offset(offset)
    )
    rows = result.all()

    submissions = []
    for sub, first_name, last_name, form_name in rows:
        client_name = f"{first_name or ''} {last_name or ''}".strip() or None
        submissions.append(FormSubmissionWithDetails(
            id=sub.id,
            form_id=sub.form_id,
            client_id=sub.client_id,
            client_name=client_name,
            form_name=form_name,
            answers=sub.answers or {},
            status=sub.status,
            submitted_at=sub.submitted_at,
            signature_data=sub.signature_data,
            created_at=sub.created_at,
        ))

    return submissions


@router.get("/{form_id}/submissions", response_model=List[FormSubmissionResponse])
async def list_submissions(
    form_id: UUID,
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """Listar respuestas de un formulario (paginadas)."""
    form_result = await db.execute(
        select(Form.id).where(
            Form.id == form_id,
            Form.workspace_id == current_user.workspace_id,
        )
    )
    if not form_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Formulario no encontrado")

    query = select(FormSubmission).where(FormSubmission.form_id == form_id)

    if status:
        query = query.where(FormSubmission.status == status)

    result = await db.execute(
        query.order_by(FormSubmission.created_at.desc()).limit(limit).offset(offset)
    )
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
    form_check = await db.execute(
        select(Form.id).where(
            Form.id == data.form_id,
            Form.workspace_id == current_user.workspace_id,
        )
    )
    if not form_check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formulario no encontrado")

    if data.client_id:
        client_check = await db.execute(
            select(Client.id).where(
                Client.id == data.client_id,
                Client.workspace_id == current_user.workspace_id,
            )
        )
        if not client_check.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")

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
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de una respuesta.
    """
    result = await db.execute(
        select(FormSubmission)
        .join(Form, FormSubmission.form_id == Form.id)
        .where(
            FormSubmission.id == submission_id,
            Form.workspace_id == current_user.workspace_id,
        )
    )
    submission = result.scalar_one_or_none()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Respuesta no encontrada"
        )
    
    return submission


class FormSubmissionUpdate(BaseModel):
    status: Optional[str] = None


@router.patch("/submissions/{submission_id}", response_model=FormSubmissionResponse)
async def update_submission(
    submission_id: UUID,
    data: FormSubmissionUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar estado de una respuesta (read, completed, pending).
    """
    result = await db.execute(
        select(FormSubmission)
        .join(Form, FormSubmission.form_id == Form.id)
        .where(
            FormSubmission.id == submission_id,
            Form.workspace_id == current_user.workspace_id,
        )
    )
    sub = result.scalar_one_or_none()

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Respuesta no encontrada"
        )

    if data.status is not None:
        sub.status = data.status

    await db.commit()
    await db.refresh(sub)
    return sub
