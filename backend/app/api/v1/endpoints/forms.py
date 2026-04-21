from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.models.form import Form, FormSubmission
from app.models.client import Client
from app.middleware.auth import require_workspace, require_staff, require_any_role, CurrentUser

router = APIRouter()


# ============ SCHEMAS ============

class FormFieldSchema(BaseModel):
    model_config = {"extra": "allow"}

    id: str
    type: str
    label: str
    required: bool = False
    options: Optional[List[str]] = None
    placeholder: Optional[str] = None
    order: Optional[int] = None


class FormSettingsSchema(BaseModel):
    model_config = {"extra": "allow"}

    require_signature: bool = False
    send_reminder: bool = True
    reminder_days: int = 3
    allow_edit: bool = False
    send_on_onboarding: bool = False


class FormCreate(BaseModel):
    """Payload de creación/actualización de formulario.

    Acepta tanto ``fields`` (payload del frontend) como ``schema={"fields": ...}``
    (payload antiguo). Igualmente ``send_on_onboarding`` puede ir como campo
    suelto y se integra dentro de ``settings``.
    """

    model_config = {"populate_by_name": True, "extra": "ignore"}

    name: str
    description: Optional[str] = None
    form_type: str = "custom"
    fields: Optional[List[FormFieldSchema]] = None
    form_schema: Optional[dict] = Field(default=None, alias="schema")
    settings: Optional[FormSettingsSchema] = None
    is_active: Optional[bool] = None
    send_on_onboarding: Optional[bool] = None


class FormResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    workspace_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    form_type: str
    fields: List[dict] = []
    settings: dict = {}
    is_active: bool = True
    is_global: bool = False
    send_on_onboarding: bool = False
    submissions_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None


class FormSubmissionCreate(BaseModel):
    form_id: UUID
    client_id: UUID
    answers: dict = {}
    signature_data: Optional[dict] = None


class FormSubmissionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    form_id: UUID
    client_id: UUID
    answers: dict
    status: str
    submitted_at: Optional[datetime] = None
    signature_data: Optional[dict] = None
    created_at: datetime


# ============ HELPERS ============

def _serialize_form(form: Form, submissions_count: int = 0) -> FormResponse:
    """Aplana schema/settings a campos de primer nivel esperados por el frontend."""
    schema = form.schema or {}
    settings = dict(form.settings or {})
    is_active_val = form.is_active
    if isinstance(is_active_val, str):
        is_active_val = is_active_val.lower() in ("y", "true", "1")

    return FormResponse(
        id=form.id,
        workspace_id=form.workspace_id,
        name=form.name,
        description=form.description,
        form_type=form.form_type or "custom",
        fields=list(schema.get("fields") or []),
        settings=settings,
        is_active=bool(is_active_val),
        is_global=bool(getattr(form, "is_global", False)),
        send_on_onboarding=bool(settings.get("send_on_onboarding", False)),
        submissions_count=submissions_count,
        created_at=form.created_at,
        updated_at=form.updated_at,
    )


def _apply_payload(form: Form, data: FormCreate) -> None:
    """Aplica un payload de create/update al modelo, normalizando fields/schema/settings."""
    if data.name is not None:
        form.name = data.name
    if data.description is not None:
        form.description = data.description
    if data.form_type is not None:
        form.form_type = data.form_type

    # Fields → se guardan en schema JSONB
    if data.fields is not None:
        fields_dump = [f.model_dump(exclude_none=True) for f in data.fields]
        form.schema = {"fields": fields_dump}
    elif data.form_schema is not None:
        form.schema = data.form_schema

    # Settings (+ send_on_onboarding como atajo)
    current_settings = dict(form.settings or {})
    if data.settings is not None:
        current_settings.update(data.settings.model_dump())
    if data.send_on_onboarding is not None:
        current_settings["send_on_onboarding"] = data.send_on_onboarding
    form.settings = current_settings

    if data.is_active is not None:
        form.is_active = bool(data.is_active)

    # IMPORTANTE: marcar JSONB como modificado para que SQLAlchemy persista cambios
    flag_modified(form, "schema")
    flag_modified(form, "settings")


# ============ FORMS ============

@router.get("", response_model=List[FormResponse])
async def list_forms(
    form_type: Optional[str] = None,
    is_active: Optional[Any] = None,
    include_global: bool = Query(True, description="Incluir plantillas globales del sistema"),
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Listar formularios del workspace + plantillas globales del sistema."""
    conditions = [Form.workspace_id == current_user.workspace_id]
    if include_global:
        conditions.append(Form.is_global == True)  # noqa: E712

    query = select(Form).where(or_(*conditions))

    if form_type:
        query = query.where(Form.form_type == form_type)

    if is_active is not None:
        if isinstance(is_active, str):
            active_bool = is_active.lower() in ("y", "true", "1")
        else:
            active_bool = bool(is_active)
        query = query.where(Form.is_active == active_bool)

    result = await db.execute(query.order_by(Form.is_global.desc(), Form.created_at.desc()))
    forms = result.scalars().all()

    # Contar submissions por form (batch)
    form_ids = [f.id for f in forms]
    counts_by_form: dict = {}
    if form_ids:
        counts_query = (
            select(FormSubmission.form_id, func.count(FormSubmission.id))
            .where(FormSubmission.form_id.in_(form_ids))
            .group_by(FormSubmission.form_id)
        )
        counts_result = await db.execute(counts_query)
        counts_by_form = {fid: cnt for fid, cnt in counts_result.all()}

    return [_serialize_form(f, counts_by_form.get(f.id, 0)) for f in forms]


@router.post("", response_model=FormResponse, status_code=status.HTTP_201_CREATED)
async def create_form(
    data: FormCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Crear un nuevo formulario en el workspace actual."""
    form = Form(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        name=data.name,
        description=data.description,
        form_type=data.form_type or "custom",
        schema={"fields": []},
        settings={
            "require_signature": False,
            "send_reminder": True,
            "reminder_days": 3,
            "allow_edit": False,
            "send_on_onboarding": False,
        },
        is_active=True,
        is_global=False,
    )
    _apply_payload(form, data)
    db.add(form)
    await db.commit()
    await db.refresh(form)
    return _serialize_form(form)


@router.get("/{form_id}", response_model=FormResponse)
async def get_form(
    form_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Obtener detalles de un formulario (del workspace o plantilla global)."""
    result = await db.execute(
        select(Form).where(
            Form.id == form_id,
            or_(
                Form.workspace_id == current_user.workspace_id,
                Form.is_global == True,  # noqa: E712
            ),
        )
    )
    form = result.scalar_one_or_none()

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado",
        )

    return _serialize_form(form)


@router.put("/{form_id}", response_model=FormResponse)
async def update_form(
    form_id: UUID,
    data: FormCreate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Actualizar un formulario del workspace.

    Las plantillas globales del sistema no son editables.
    """
    result = await db.execute(select(Form).where(Form.id == form_id))
    form = result.scalar_one_or_none()

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado",
        )

    if form.is_global:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Las plantillas del sistema no se pueden editar. Cópialas a tu workspace para personalizarlas.",
        )

    if form.workspace_id != current_user.workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado",
        )

    _apply_payload(form, data)
    await db.commit()
    await db.refresh(form)
    return _serialize_form(form)


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_form(
    form_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Eliminar un formulario del workspace. Las plantillas globales no se pueden eliminar."""
    result = await db.execute(select(Form).where(Form.id == form_id))
    form = result.scalar_one_or_none()

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado",
        )

    if form.is_global:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Las plantillas del sistema no se pueden eliminar.",
        )

    if form.workspace_id != current_user.workspace_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado",
        )

    await db.delete(form)
    await db.commit()


@router.post(
    "/{form_id}/copy",
    response_model=FormResponse,
    status_code=status.HTTP_201_CREATED,
)
async def copy_form(
    form_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Clona un formulario (plantilla global o del workspace) como nuevo
    formulario editable dentro del workspace actual.
    """
    result = await db.execute(
        select(Form).where(
            Form.id == form_id,
            or_(
                Form.workspace_id == current_user.workspace_id,
                Form.is_global == True,  # noqa: E712
            ),
        )
    )
    source = result.scalar_one_or_none()

    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado",
        )

    clone = Form(
        workspace_id=current_user.workspace_id,
        created_by=current_user.id,
        name=f"{source.name} (copia)",
        description=source.description,
        form_type=source.form_type,
        schema=dict(source.schema or {"fields": []}),
        settings=dict(source.settings or {}),
        is_active=True,
        is_global=False,
    )
    db.add(clone)
    await db.commit()
    await db.refresh(clone)
    return _serialize_form(clone)


# ============ SUBMISSIONS ============


class FormSubmissionWithDetails(BaseModel):
    model_config = {"from_attributes": True}

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


@router.get("/submissions/", response_model=List[FormSubmissionWithDetails])
async def list_all_submissions(
    form_id: Optional[UUID] = None,
    client_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Listar todas las respuestas del workspace (clientes de este workspace)."""
    query = (
        select(
            FormSubmission,
            Client.first_name,
            Client.last_name,
            Form.name.label("form_name"),
        )
        .join(Form, FormSubmission.form_id == Form.id)
        .join(Client, FormSubmission.client_id == Client.id)
        .where(Client.workspace_id == current_user.workspace_id)
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
    db: AsyncSession = Depends(get_db),
):
    """Listar respuestas de un formulario (del workspace o plantilla global)."""
    form_check = await db.execute(
        select(Form.id).where(
            Form.id == form_id,
            or_(
                Form.workspace_id == current_user.workspace_id,
                Form.is_global == True,  # noqa: E712
            ),
        )
    )
    if not form_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Formulario no encontrado")

    query = (
        select(FormSubmission)
        .join(Client, FormSubmission.client_id == Client.id)
        .where(
            FormSubmission.form_id == form_id,
            Client.workspace_id == current_user.workspace_id,
        )
    )

    if status:
        query = query.where(FormSubmission.status == status)

    result = await db.execute(
        query.order_by(FormSubmission.created_at.desc()).limit(limit).offset(offset)
    )
    return result.scalars().all()


@router.post(
    "/submissions",
    response_model=FormSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_submission(
    data: FormSubmissionCreate,
    current_user: CurrentUser = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """Enviar respuestas a un formulario (del workspace o plantilla global)."""
    form_check = await db.execute(
        select(Form).where(
            Form.id == data.form_id,
            or_(
                Form.workspace_id == current_user.workspace_id,
                Form.is_global == True,  # noqa: E712
            ),
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
        submitted_at=datetime.utcnow(),
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission


@router.get("/submissions/{submission_id}", response_model=FormSubmissionResponse)
async def get_submission(
    submission_id: UUID,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Obtener detalles de una respuesta del workspace."""
    result = await db.execute(
        select(FormSubmission)
        .join(Client, FormSubmission.client_id == Client.id)
        .where(
            FormSubmission.id == submission_id,
            Client.workspace_id == current_user.workspace_id,
        )
    )
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Respuesta no encontrada",
        )

    return submission


class FormSubmissionUpdate(BaseModel):
    status: Optional[str] = None


@router.patch("/submissions/{submission_id}", response_model=FormSubmissionResponse)
async def update_submission(
    submission_id: UUID,
    data: FormSubmissionUpdate,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Actualizar estado de una respuesta (read, completed, pending)."""
    result = await db.execute(
        select(FormSubmission)
        .join(Client, FormSubmission.client_id == Client.id)
        .where(
            FormSubmission.id == submission_id,
            Client.workspace_id == current_user.workspace_id,
        )
    )
    sub = result.scalar_one_or_none()

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Respuesta no encontrada",
        )

    if data.status is not None:
        sub.status = data.status

    await db.commit()
    await db.refresh(sub)
    return sub
