from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, update
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.config import settings as app_settings
from app.models.form import Form, FormSubmission
from app.models.client import Client
from app.models.workspace import Workspace
from app.models.notification import Notification
from app.middleware.auth import require_workspace, require_staff, require_any_role, CurrentUser
from app.services.notification_service import notify
from app.services.email import EmailTemplates
from app.constants.allergens import (
    ALLERGY_IDS,
    INTOLERANCE_IDS,
    id_to_label,
    label_to_id,
)

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

    # name es obligatorio al crear pero opcional al actualizar parcialmente
    # (PATCH-style). Se valida explícitamente en ``create_form`` cuando falta.
    name: Optional[str] = None
    description: Optional[str] = None
    form_type: Optional[str] = None
    fields: Optional[List[FormFieldSchema]] = None
    form_schema: Optional[dict] = Field(default=None, alias="schema")
    settings: Optional[FormSettingsSchema] = None
    is_active: Optional[bool] = None
    is_required: Optional[bool] = None
    send_on_onboarding: Optional[bool] = None
    product_ids: Optional[List[UUID]] = None


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
    is_required: bool = False
    send_on_onboarding: bool = False
    product_ids: List[UUID] = []
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

def _safe_product_ids(form: Form) -> List[UUID]:
    """Devuelve ``product_ids`` del formulario siendo tolerante con una
    posible migración 045 aún sin aplicar en el entorno destino.

    La columna está definida como ``deferred`` en el modelo, por lo que sólo
    se consulta al accederla. Si aún no existe en la BD (p. ej. durante un
    deploy en curso) atrapamos el error y devolvemos lista vacía para que
    los listados/serializaciones sigan funcionando.
    """
    try:
        return list(getattr(form, "product_ids", None) or [])
    except Exception:  # noqa: BLE001 - defensivo frente a ProgrammingError
        return []


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
        is_required=bool(getattr(form, "is_required", False)),
        send_on_onboarding=bool(settings.get("send_on_onboarding", False)),
        product_ids=_safe_product_ids(form),
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

    if data.is_required is not None:
        form.is_required = bool(data.is_required)

    if data.product_ids is not None:
        # Dedupe y normalizar: sólo UUIDs válidos (pydantic ya lo validó).
        # Tolerante con migración 045 aún no aplicada: si la columna no
        # existe la escritura simplemente se ignora.
        try:
            form.product_ids = list(dict.fromkeys(data.product_ids))
        except Exception:  # noqa: BLE001
            pass

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
    if not data.name or not data.name.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El nombre del formulario es obligatorio",
        )
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

    # Capturamos el nombre actual ANTES de aplicar el payload para
    # detectar cambios de nombre y poder propagarlos a las notificaciones
    # in-app que ya se enviaron a clientes con el nombre antiguo. Sin
    # esto, el cliente sigue viendo en su bandeja "Cuestionario X (copia)"
    # aunque el entrenador lo haya renombrado a "Cuestionario X" desde la
    # gestión de formularios.
    old_name = (form.name or "").strip()
    _apply_payload(form, data)
    new_name = (form.name or "").strip()

    if old_name and new_name and old_name != new_name:
        # Reemplazamos el nombre antiguo por el nuevo solo en
        # notificaciones del mismo workspace que mencionen "formulario"
        # (las generadas por ``form_pending``). Se restringe el filtro
        # por título para minimizar el riesgo de tocar notificaciones
        # ajenas que casualmente compartan substring.
        await db.execute(
            update(Notification)
            .where(
                Notification.workspace_id == form.workspace_id,
                Notification.title.ilike("%formulario%"),
                or_(
                    Notification.title.ilike(f"%{old_name}%"),
                    Notification.body.ilike(f"%{old_name}%"),
                ),
            )
            .values(
                title=func.replace(Notification.title, old_name, new_name),
                body=func.replace(
                    func.coalesce(Notification.body, ""), old_name, new_name
                ),
            )
            .execution_options(synchronize_session=False)
        )

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


# ============ SEND FORM TO CLIENT(S) ============


class FormSendRequest(BaseModel):
    """Payload para enviar un formulario a uno o varios clientes."""

    client_ids: List[UUID] = Field(default_factory=list)


class FormSendResponseItem(BaseModel):
    submission_id: UUID
    client_id: UUID
    status: str


@router.post("/{form_id}/send", response_model=List[FormSendResponseItem])
async def send_form_to_clients(
    form_id: UUID,
    payload: FormSendRequest,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Envía un formulario a una lista de clientes.

    Crea una ``FormSubmission`` con ``status='pending'`` por cliente si
    no existe ya otra pendiente para el mismo form/cliente. Genera una
    notificación in-app al usuario del cliente (si está vinculado).
    """
    # Sólo se pueden enviar al cliente formularios PROPIOS del workspace.
    # Las plantillas globales del sistema deben copiarse antes (POST /forms/{id}/clone)
    # y luego enviar la copia personal: ese es el flujo intencionado para que el
    # entrenador pueda editarlas y se respete su criterio.
    form_result = await db.execute(
        select(Form).where(
            Form.id == form_id,
            Form.workspace_id == current_user.workspace_id,
        )
    )
    form = form_result.scalar_one_or_none()
    if not form:
        # Distinguimos entre "no existe" y "es plantilla del sistema" para dar
        # un mensaje claro al usuario.
        global_check = await db.execute(
            select(Form.id).where(Form.id == form_id, Form.is_global == True)  # noqa: E712
        )
        if global_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "No puedes enviar plantillas del sistema directamente. "
                    "Cópialas primero a tu workspace y envía la copia."
                ),
            )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formulario no encontrado")

    if not payload.client_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes indicar al menos un cliente.",
        )

    clients_result = await db.execute(
        select(Client).where(
            Client.id.in_(payload.client_ids),
            Client.workspace_id == current_user.workspace_id,
        )
    )
    clients = clients_result.scalars().all()
    valid_client_ids = {c.id for c in clients}
    client_by_id = {c.id: c for c in clients}

    # Buscar submissions pendientes existentes para evitar duplicados
    existing_result = await db.execute(
        select(FormSubmission).where(
            FormSubmission.form_id == form_id,
            FormSubmission.client_id.in_(list(valid_client_ids)) if valid_client_ids else False,
            FormSubmission.status == "pending",
        )
    )
    existing_by_client = {s.client_id: s for s in existing_result.scalars().all()}

    out: List[FormSendResponseItem] = []
    created_submissions: List[FormSubmission] = []

    for client_id in payload.client_ids:
        if client_id not in valid_client_ids:
            continue
        if client_id in existing_by_client:
            sub = existing_by_client[client_id]
            out.append(FormSendResponseItem(submission_id=sub.id, client_id=client_id, status="already_pending"))
            continue
        sub = FormSubmission(
            form_id=form_id,
            client_id=client_id,
            answers={},
            status="pending",
        )
        db.add(sub)
        created_submissions.append(sub)

    await db.commit()
    for sub in created_submissions:
        await db.refresh(sub)
        out.append(FormSendResponseItem(submission_id=sub.id, client_id=sub.client_id, status="sent"))

    # Resolver el nombre del workspace para personalizar el email del cliente.
    workspace_name: Optional[str] = None
    try:
        ws = await db.get(Workspace, current_user.workspace_id)
        if ws and getattr(ws, "name", None):
            workspace_name = ws.name
    except Exception:  # pragma: no cover - non-critical
        pass

    frontend_url = (app_settings.FRONTEND_URL or "https://app.trackfiz.com").rstrip("/")
    form_link = f"{frontend_url}/my-forms"

    # Notificaciones (in-app + email) a los clientes con user_id vinculado.
    for sub in created_submissions:
        client = client_by_id.get(sub.client_id)
        if not client or not client.user_id:
            continue
        client_full_name = (
            f"{client.first_name or ''} {client.last_name or ''}".strip()
            or client.email
            or "cliente"
        )
        try:
            email_html = EmailTemplates.form_pending(
                client_name=client_full_name,
                form_name=form.name,
                form_url=form_link,
                workspace_name=workspace_name,
                is_required=bool(form.is_required),
                form_description=form.description,
            )
        except Exception:  # pragma: no cover - never block on template render
            email_html = None

        email_subject = (
            f"Tienes un nuevo formulario: {form.name}"
            if not form.is_required
            else f"⚠️ Formulario obligatorio pendiente: {form.name}"
        )

        try:
            await notify(
                db=db,
                event="form_pending",
                user_id=client.user_id,
                workspace_id=client.workspace_id,
                title=f"Tienes un formulario pendiente: {form.name}",
                body=(
                    f"Tu entrenador te ha enviado el formulario \"{form.name}\". "
                    + ("Es obligatorio. " if form.is_required else "")
                    + "Responde cuando puedas desde la sección Formularios."
                ),
                link="/my-forms",
                notification_type="reminder" if form.is_required else "info",
                email_subject=email_subject,
                email_html=email_html,
                email_to=client.email,
            )
        except Exception:  # pragma: no cover - best-effort
            pass

    return out


# ============ CLIENT-FACING ENDPOINTS ============


class ClientPendingFormResponse(BaseModel):
    """Formulario pendiente/completado para un cliente."""

    submission_id: UUID
    form_id: UUID
    form_name: str
    form_description: Optional[str] = None
    form_type: str
    fields: List[dict] = []
    status: str
    is_required: bool = False
    created_at: datetime
    submitted_at: Optional[datetime] = None
    # Valores pre-rellenados tomados del perfil del cliente cuando aplique
    # (p. ej. alergias ya declaradas en el onboarding). Clave = field.id.
    prefill: dict = {}
    # Respuestas ya enviadas (sólo para estado "submitted"), para que el
    # cliente pueda revisar lo que respondió.
    answers: dict = {}


def _build_prefill_for_client(form: Form, client: Client) -> dict:
    """Genera los valores pre-rellenados de un formulario a partir del
    ``health_data`` del cliente. Se aplica SOLO a los campos conocidos del
    sistema (los que empiezan por ``sys_``)."""
    schema = form.schema or {}
    fields = schema.get("fields") or []
    health = (client.health_data or {}) if isinstance(client.health_data, dict) else {}

    allergies_ids = list(
        dict.fromkeys(
            [
                *((health.get("allergens") or [])),
                *((health.get("allergies") or [])),
            ]
        )
    )
    intolerances_ids = list(health.get("intolerances") or [])

    prefill: dict = {}

    for field in fields:
        if not isinstance(field, dict):
            continue
        field_id = field.get("id")
        if field_id == "sys_nut_allergies":
            # El cuestionario unifica alergias + intolerancias en un solo
            # multiselect (ver frontend/src/constants/allergens.ts).
            all_ids = [*allergies_ids, *intolerances_ids]
            labels = [id_to_label(i) for i in all_ids if i]
            options = field.get("options") or []
            labels = [l for l in labels if l in options]
            if labels:
                prefill[field_id] = labels
    return prefill


def _sync_health_data_from_answers(
    form: Form, client: Client, answers: dict
) -> bool:
    """Si las respuestas contienen campos del sistema conocidos, actualiza
    ``client.health_data`` con los IDs correspondientes. Devuelve True si
    hubo cambios.
    """
    if not isinstance(answers, dict) or not answers:
        return False

    schema = form.schema or {}
    fields = schema.get("fields") or []
    known_ids = {f.get("id") for f in fields if isinstance(f, dict)}

    changed = False

    # ── Cuestionario alimentación (sys_nut_allergies) ──────────────────
    if "sys_nut_allergies" in known_ids:
        raw_values = answers.get("sys_nut_allergies") or []
        if isinstance(raw_values, list):
            ids = [label_to_id(v) for v in raw_values if isinstance(v, str)]
            allergies = [i for i in ids if i in ALLERGY_IDS]
            intolerances = [i for i in ids if i in INTOLERANCE_IDS]

            current = dict(client.health_data or {}) if isinstance(client.health_data, dict) else {}
            existing_allergens = list(current.get("allergens") or [])
            existing_allergies = list(current.get("allergies") or [])
            existing_intolerances = list(current.get("intolerances") or [])

            merged_allergens = list(
                dict.fromkeys([*existing_allergens, *existing_allergies, *allergies])
            )
            merged_intolerances = list(
                dict.fromkeys([*existing_intolerances, *intolerances])
            )

            if merged_allergens != existing_allergens:
                current["allergens"] = merged_allergens
                changed = True
            if merged_intolerances != existing_intolerances:
                current["intolerances"] = merged_intolerances
                changed = True
            if "allergies" in current:
                current.pop("allergies", None)
                changed = True

            if changed:
                client.health_data = current

    # ── Cuestionario inicial del Sistema (sys_init_*) ─────────────────
    # Los IDs `sys_init_*` se introdujeron en la migración 051. Volcamos
    # objetivos, salud y PAR-Q al `health_data` del cliente para que el
    # entrenador los vea en la ficha sin tener que abrir la respuesta.
    if any(k.startswith("sys_init_") for k in known_ids):
        current = dict(client.health_data or {}) if isinstance(client.health_data, dict) else {}

        # ── Objetivos / actividad ──
        mapping_simple = {
            "sys_init_primary_goal": "primary_goal",
            "sys_init_secondary_goals": "secondary_goals",
            "sys_init_target_weight": "target_weight",
            "sys_init_activity_level": "activity_level",
            "sys_init_training_days": "training_days_per_week",
            "sys_init_goals_description": "goals_description",
            # Lesiones / médico (texto libre)
            "sys_init_injuries_detail": "injuries_detail",
            "sys_init_medical_conditions_detail": "medical_conditions_detail",
            "sys_init_medications": "medications",
        }
        for ans_key, hd_key in mapping_simple.items():
            if ans_key in known_ids and ans_key in answers:
                value = answers.get(ans_key)
                if value not in (None, ""):
                    if current.get(hd_key) != value:
                        current[hd_key] = value
                        changed = True

        # Booleans tipo "Sí"/"No"
        bool_mapping = {
            "sys_init_has_injuries": "has_injuries",
            "sys_init_has_medical_conditions": "has_medical_conditions",
        }
        for ans_key, hd_key in bool_mapping.items():
            if ans_key in known_ids and ans_key in answers:
                raw = answers.get(ans_key)
                bool_val = (str(raw).strip().lower() == "sí") if raw is not None else None
                if bool_val is not None and current.get(hd_key) != bool_val:
                    current[hd_key] = bool_val
                    changed = True

        # ── PAR-Q ──
        parq_keys = [
            ("sys_init_parq_heart", "sys_init_parq_heart_detail", "heart"),
            ("sys_init_parq_chest_pain", "sys_init_parq_chest_pain_detail", "chest_pain"),
            ("sys_init_parq_dizziness", "sys_init_parq_dizziness_detail", "dizziness"),
            ("sys_init_parq_bone_joint", "sys_init_parq_bone_joint_detail", "bone_joint"),
            ("sys_init_parq_blood_pressure", "sys_init_parq_blood_pressure_detail", "blood_pressure"),
            ("sys_init_parq_other", "sys_init_parq_other_detail", "other"),
        ]
        parq_block = dict(current.get("parq") or {}) if isinstance(current.get("parq"), dict) else {}
        for radio_key, detail_key, bucket in parq_keys:
            if radio_key in answers:
                raw = answers.get(radio_key)
                bool_val = (str(raw).strip().lower() == "sí") if raw is not None else None
                if bool_val is not None and parq_block.get(bucket) != bool_val:
                    parq_block[bucket] = bool_val
                    changed = True
            if detail_key in answers:
                detail = answers.get(detail_key)
                if detail not in (None, "") and parq_block.get(f"{bucket}_detail") != detail:
                    parq_block[f"{bucket}_detail"] = detail
                    changed = True
        if parq_block:
            current["parq"] = parq_block

        # ── Alergias / intolerancias del cuestionario inicial ──
        for ans_key, hd_key in (
            ("sys_init_allergies", "allergens"),
            ("sys_init_intolerances", "intolerances"),
        ):
            if ans_key in known_ids and ans_key in answers:
                raw = answers.get(ans_key) or []
                if isinstance(raw, list):
                    cleaned = [v for v in raw if isinstance(v, str) and v.strip().lower() != "ninguna"]
                    existing = list(current.get(hd_key) or [])
                    merged = list(dict.fromkeys([*existing, *cleaned]))
                    if merged != existing:
                        current[hd_key] = merged
                        changed = True

        if changed:
            client.health_data = current

    return changed


async def _get_client_for_current_user(current_user: CurrentUser, db: AsyncSession) -> Client:
    """Devuelve el Client asociado al user actual (para endpoints de cliente)."""
    result = await db.execute(
        select(Client).where(
            Client.user_id == current_user.id,
            Client.workspace_id == current_user.workspace_id,
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    return client


@router.get("/my/pending", response_model=List[ClientPendingFormResponse])
async def list_my_forms(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: CurrentUser = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """Lista los formularios recibidos por el cliente actual (pendientes/enviados)."""
    client = await _get_client_for_current_user(current_user, db)

    query = (
        select(FormSubmission, Form)
        .join(Form, FormSubmission.form_id == Form.id)
        .where(FormSubmission.client_id == client.id)
    )
    if status_filter:
        query = query.where(FormSubmission.status == status_filter)

    result = await db.execute(query.order_by(FormSubmission.created_at.desc()))
    rows = result.all()

    out: List[ClientPendingFormResponse] = []
    for sub, form in rows:
        schema = form.schema or {}
        # Prefill con datos del cliente sólo cuando sigue pendiente
        # (una vez enviado mostramos exactamente lo respondido).
        prefill = (
            _build_prefill_for_client(form, client)
            if sub.status != "submitted"
            else {}
        )
        out.append(
            ClientPendingFormResponse(
                submission_id=sub.id,
                form_id=form.id,
                form_name=form.name,
                form_description=form.description,
                form_type=form.form_type or "custom",
                fields=list(schema.get("fields") or []),
                status=sub.status,
                is_required=bool(getattr(form, "is_required", False)),
                created_at=sub.created_at,
                submitted_at=sub.submitted_at,
                prefill=prefill,
                answers=sub.answers or {},
            )
        )
    return out


@router.get("/my/pending/count")
async def count_my_pending_required(
    current_user: CurrentUser = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """Devuelve cuántos formularios obligatorios siguen pendientes para el cliente actual."""
    client = await _get_client_for_current_user(current_user, db)
    result = await db.execute(
        select(func.count(FormSubmission.id))
        .join(Form, FormSubmission.form_id == Form.id)
        .where(
            FormSubmission.client_id == client.id,
            FormSubmission.status == "pending",
            Form.is_required == True,  # noqa: E712
        )
    )
    return {"pending_required": int(result.scalar() or 0)}


class MyFormAnswerPayload(BaseModel):
    answers: dict = Field(default_factory=dict)
    signature_data: Optional[dict] = None


@router.post("/my/submissions/{submission_id}/respond", response_model=FormSubmissionResponse)
async def respond_my_form(
    submission_id: UUID,
    payload: MyFormAnswerPayload,
    current_user: CurrentUser = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """El cliente responde un formulario que le fue enviado."""
    client = await _get_client_for_current_user(current_user, db)

    result = await db.execute(
        select(FormSubmission, Form)
        .join(Form, FormSubmission.form_id == Form.id)
        .where(
            FormSubmission.id == submission_id,
            FormSubmission.client_id == client.id,
        )
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formulario no encontrado")
    sub, form = row

    is_already_submitted = sub.status == "submitted"

    answers = payload.answers or {}
    sub.answers = answers
    if payload.signature_data is not None:
        sub.signature_data = payload.signature_data
    sub.status = "submitted"
    sub.submitted_at = datetime.utcnow()
    flag_modified(sub, "answers")

    # Sincronizar health_data con las respuestas conocidas del sistema
    # (p. ej. alergias declaradas en el Cuestionario alimentación o el
    # Cuestionario Inicial Trackfiz).
    if _sync_health_data_from_answers(form, client, answers):
        flag_modified(client, "health_data")

    await db.commit()
    await db.refresh(sub)

    # ── Email 2: tras completar el Formulario del Sistema ─────────────
    # Sólo en la primera vez que se envía (no en edits posteriores) y
    # sólo si es el cuestionario inicial (form_type='system' is_global).
    is_system_form = bool(getattr(form, "is_global", False)) and form.form_type == "system"
    if is_system_form and not is_already_submitted:
        try:
            from app.tasks.notifications import send_email_task

            workspace = await db.get(Workspace, client.workspace_id)
            ws_settings = (workspace.settings if workspace and workspace.settings else {}) or {}
            ws_support = ws_settings.get("support", {}) if isinstance(ws_settings, dict) else {}
            support_phone = ws_support.get("phone") if isinstance(ws_support, dict) else None
            support_email = ws_support.get("email") if isinstance(ws_support, dict) else None
            email_footer = ws_support.get("email_footer") if isinstance(ws_support, dict) else None
            ws_name = workspace.name if workspace else None

            full_name = (
                f"{client.first_name or ''} {client.last_name or ''}".strip()
                or client.email
                or "atleta"
            )
            portal_url = (app_settings.FRONTEND_URL or "https://app.trackfiz.com").rstrip("/") + "/my-dashboard"

            send_email_task.delay(
                to_email=client.email,
                subject="🚀 Necesito saber un poco más de ti. Tus próximos pasos",
                html_content=EmailTemplates.client_welcome_after_onboarding(
                    full_name,
                    portal_url,
                    workspace_name=ws_name,
                    support_phone=support_phone,
                    support_email=support_email,
                    email_footer=email_footer,
                ),
            )
        except Exception:  # pragma: no cover - best-effort
            pass

    return sub
