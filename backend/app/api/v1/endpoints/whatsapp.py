"""
WhatsApp Integration Endpoints

Endpoints para integración con WhatsApp Business via Kapso:
- Conexión/desconexión de WhatsApp
- Webhooks para recibir mensajes y actualizaciones de estado

Updated: 2026-02-02
"""
from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel

from app.core.database import get_db
from app.core.config import settings
from app.models.workspace import Workspace
from app.models.message import (
    Conversation, Message, ConversationType, MessageType,
    MessageSource, MessageDirection, MessageStatus
)
from app.models.client import Client
from app.middleware.auth import require_workspace, CurrentUser
from app.services.kapso import kapso_service, KapsoError

router = APIRouter()


# ============ SCHEMAS ============

class WhatsAppSetupResponse(BaseModel):
    """Respuesta al solicitar setup link"""
    setup_url: str
    expires_at: Optional[str] = None


class WhatsAppStatusResponse(BaseModel):
    """Estado de la conexión de WhatsApp"""
    connected: bool
    phone_number_id: Optional[str] = None
    display_phone_number: Optional[str] = None
    business_account_id: Optional[str] = None
    connected_at: Optional[datetime] = None
    kapso_customer_id: Optional[str] = None


class WhatsAppDisconnectResponse(BaseModel):
    """Respuesta al desconectar WhatsApp"""
    success: bool
    message: str


# Schemas para webhooks de Kapso
class KapsoWebhookPhoneNumberCreated(BaseModel):
    """Payload del evento whatsapp.phone_number.created"""
    phone_number_id: str
    business_account_id: Optional[str] = None
    display_phone_number: Optional[str] = None
    project: Optional[dict] = None
    customer: Optional[dict] = None


class KapsoWebhookMessageReceived(BaseModel):
    """Payload del evento whatsapp.message.received"""
    message_id: str
    phone_number_id: str
    conversation_id: Optional[str] = None
    from_phone: str  # Número del remitente
    profile_name: Optional[str] = None
    message_type: str  # text, image, audio, video, document
    content: Optional[str] = None
    media_url: Optional[str] = None
    timestamp: datetime


class KapsoWebhookMessageStatus(BaseModel):
    """Payload del evento whatsapp.message.status_updated"""
    message_id: str
    status: str  # sent, delivered, read, failed
    timestamp: datetime
    error_code: Optional[str] = None
    error_message: Optional[str] = None


# ============ ENDPOINTS ============

@router.get("/status", response_model=WhatsAppStatusResponse)
async def get_whatsapp_status(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener estado de la conexión de WhatsApp del workspace.
    """
    # Obtener workspace
    result = await db.execute(
        select(Workspace).where(Workspace.id == current_user.workspace_id)
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace no encontrado"
        )
    
    # Obtener configuración de WhatsApp
    whatsapp_config = workspace.settings.get("whatsapp", {}) if workspace.settings else {}
    
    return WhatsAppStatusResponse(
        connected=whatsapp_config.get("enabled", False),
        phone_number_id=whatsapp_config.get("phone_number_id"),
        display_phone_number=whatsapp_config.get("display_phone_number"),
        business_account_id=whatsapp_config.get("business_account_id"),
        connected_at=whatsapp_config.get("connected_at"),
        kapso_customer_id=whatsapp_config.get("kapso_customer_id")
    )


@router.post("/setup", response_model=WhatsAppSetupResponse)
async def setup_whatsapp(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Iniciar proceso de conexión de WhatsApp.
    Genera un setup link de Kapso para que el usuario conecte su cuenta.
    """
    if not settings.KAPSO_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Integración con Kapso no configurada. Contacta al administrador."
        )
    
    # Obtener workspace
    result = await db.execute(
        select(Workspace).where(Workspace.id == current_user.workspace_id)
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace no encontrado"
        )
    
    # Verificar si ya tiene WhatsApp conectado
    whatsapp_config = workspace.settings.get("whatsapp", {}) if workspace.settings else {}
    if whatsapp_config.get("enabled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="WhatsApp ya está conectado. Desconecta primero para reconectar."
        )
    
    try:
        # Crear o reusar customer en Kapso
        kapso_customer_id = whatsapp_config.get("kapso_customer_id")
        
        if not kapso_customer_id:
            # Crear nuevo customer
            customer = await kapso_service.create_customer(
                workspace_id=str(workspace.id),
                workspace_name=workspace.name
            )
            kapso_customer_id = customer["id"]
            
            # Guardar customer_id en workspace
            new_settings = dict(workspace.settings) if workspace.settings else {}
            new_settings["whatsapp"] = {
                **whatsapp_config,
                "kapso_customer_id": kapso_customer_id
            }
            workspace.settings = new_settings
            await db.commit()
        
        # Generar setup link
        success_url = f"{settings.FRONTEND_URL}/settings?tab=whatsapp&setup=success"
        failure_url = f"{settings.FRONTEND_URL}/settings?tab=whatsapp&setup=failed"
        
        # Obtener colores del branding del workspace
        branding = workspace.branding or {}
        theme_config = None
        if branding.get("primary_color"):
            theme_config = {
                "primary_color": branding.get("primary_color", "#2D6A4F"),
                "background_color": "#ffffff",
                "text_color": "#1f2937"
            }
        
        setup_link = await kapso_service.generate_setup_link(
            customer_id=kapso_customer_id,
            success_redirect_url=success_url,
            failure_redirect_url=failure_url,
            language="es",
            allowed_connection_types=["coexistence", "dedicated"],
            theme_config=theme_config
        )
        
        return WhatsAppSetupResponse(
            setup_url=setup_link["url"],
            expires_at=setup_link.get("expires_at")
        )
        
    except KapsoError as e:
        raise HTTPException(
            status_code=e.status_code or status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al configurar WhatsApp: {e.message}"
        )


@router.post("/disconnect", response_model=WhatsAppDisconnectResponse)
async def disconnect_whatsapp(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Desconectar WhatsApp del workspace.
    """
    # Obtener workspace
    result = await db.execute(
        select(Workspace).where(Workspace.id == current_user.workspace_id)
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace no encontrado"
        )
    
    # Verificar que hay WhatsApp conectado
    whatsapp_config = workspace.settings.get("whatsapp", {}) if workspace.settings else {}
    if not whatsapp_config.get("enabled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay WhatsApp conectado"
        )
    
    # Desconectar (mantener kapso_customer_id para reconexión fácil)
    new_settings = dict(workspace.settings) if workspace.settings else {}
    new_settings["whatsapp"] = {
        "enabled": False,
        "kapso_customer_id": whatsapp_config.get("kapso_customer_id"),
        "phone_number_id": None,
        "business_account_id": None,
        "display_phone_number": None,
        "connected_at": None,
        "webhook_secret": None
    }
    workspace.settings = new_settings
    await db.commit()
    
    return WhatsAppDisconnectResponse(
        success=True,
        message="WhatsApp desconectado correctamente"
    )


# ============ WEBHOOKS ============

@router.post("/webhook")
async def kapso_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook para recibir eventos de Kapso.
    
    Eventos soportados:
    - whatsapp.phone_number.created: Cuando se conecta un número
    - whatsapp.message.received: Mensaje entrante
    - whatsapp.message.status_updated: Actualización de estado de mensaje
    """
    # Obtener payload raw para verificación de firma
    payload = await request.body()
    
    # Verificar firma si está configurado
    signature = request.headers.get("X-Webhook-Signature", "")
    if settings.KAPSO_WEBHOOK_SECRET:
        if not kapso_service.verify_webhook_signature(payload, signature):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Firma de webhook inválida"
            )
    
    # Parsear payload
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload JSON inválido"
        )
    
    event_type = request.headers.get("X-Webhook-Event", data.get("event", ""))
    event_data = data.get("data", data)
    
    print(f"[WhatsApp Webhook] Evento recibido: {event_type}")
    
    # Procesar según tipo de evento
    if event_type == "whatsapp.phone_number.created":
        await handle_phone_number_created(event_data, db)
    elif event_type == "whatsapp.message.received":
        await handle_message_received(event_data, db)
    elif event_type == "whatsapp.message.status_updated":
        await handle_message_status_updated(event_data, db)
    else:
        print(f"[WhatsApp Webhook] Evento no manejado: {event_type}")
    
    return {"status": "ok"}


async def handle_phone_number_created(data: dict, db: AsyncSession):
    """
    Procesar evento de número de WhatsApp conectado.
    Actualiza el workspace con los datos de la conexión.
    """
    customer_info = data.get("customer", {})
    customer_id = customer_info.get("id")
    
    if not customer_id:
        print("[WhatsApp Webhook] phone_number.created sin customer_id")
        return
    
    # Buscar workspace por kapso_customer_id
    # Necesitamos buscar en el JSONB settings
    result = await db.execute(
        select(Workspace).where(
            Workspace.settings["whatsapp"]["kapso_customer_id"].astext == customer_id
        )
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        print(f"[WhatsApp Webhook] No se encontró workspace para customer_id: {customer_id}")
        return
    
    # Actualizar configuración de WhatsApp
    phone_number_id = data.get("phone_number_id")
    business_account_id = data.get("business_account_id")
    display_phone_number = data.get("display_phone_number", "")
    
    # Decodificar número si está URL encoded
    if display_phone_number and "%2B" in display_phone_number:
        from urllib.parse import unquote
        display_phone_number = unquote(display_phone_number)
    
    new_settings = dict(workspace.settings) if workspace.settings else {}
    whatsapp_config = new_settings.get("whatsapp", {})
    
    new_settings["whatsapp"] = {
        **whatsapp_config,
        "enabled": True,
        "phone_number_id": phone_number_id,
        "business_account_id": business_account_id,
        "display_phone_number": display_phone_number,
        "connected_at": datetime.utcnow().isoformat()
    }
    
    workspace.settings = new_settings
    await db.commit()
    
    print(f"[WhatsApp Webhook] Workspace {workspace.id} conectado con número {display_phone_number}")
    
    # TODO: Crear webhook para este phone_number para recibir mensajes
    # Esto requiere conocer la URL pública del backend


async def handle_message_received(data: dict, db: AsyncSession):
    """
    Procesar mensaje entrante de WhatsApp.
    Crea o actualiza la conversación y guarda el mensaje.
    """
    phone_number_id = data.get("phone_number_id")
    from_phone = data.get("from_phone", data.get("from", ""))
    message_id = data.get("message_id")
    profile_name = data.get("profile_name")
    message_type_str = data.get("message_type", "text")
    content = data.get("content", data.get("text", {}).get("body", ""))
    media_url = data.get("media_url")
    timestamp = data.get("timestamp")
    
    if isinstance(timestamp, str):
        timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    elif not timestamp:
        timestamp = datetime.utcnow()
    
    # Buscar workspace por phone_number_id
    result = await db.execute(
        select(Workspace).where(
            Workspace.settings["whatsapp"]["phone_number_id"].astext == phone_number_id
        )
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        print(f"[WhatsApp Webhook] No se encontró workspace para phone_number_id: {phone_number_id}")
        return
    
    # Buscar o crear conversación por número de WhatsApp
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.workspace_id == workspace.id,
                Conversation.whatsapp_phone == from_phone
            )
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        # Intentar vincular con cliente existente por teléfono
        client_result = await db.execute(
            select(Client).where(
                and_(
                    Client.workspace_id == workspace.id,
                    Client.phone == from_phone
                )
            )
        )
        client = client_result.scalar_one_or_none()
        
        # Crear nueva conversación
        conversation = Conversation(
            workspace_id=workspace.id,
            client_id=client.id if client else None,
            name=profile_name or from_phone,
            conversation_type=ConversationType.DIRECT,
            whatsapp_phone=from_phone,
            whatsapp_profile_name=profile_name,
            preferred_channel=MessageSource.WHATSAPP,
            participant_ids=[]
        )
        db.add(conversation)
        await db.flush()
        
        print(f"[WhatsApp Webhook] Nueva conversación creada: {conversation.id}")
    
    # Verificar mensaje duplicado
    existing = await db.execute(
        select(Message).where(Message.external_id == message_id)
    )
    if existing.scalar_one_or_none():
        print(f"[WhatsApp Webhook] Mensaje duplicado ignorado: {message_id}")
        return
    
    # Mapear tipo de mensaje
    type_map = {
        "text": MessageType.TEXT,
        "image": MessageType.IMAGE,
        "audio": MessageType.VOICE,
        "voice": MessageType.VOICE,
        "video": MessageType.IMAGE,  # Tratamos video como imagen
        "document": MessageType.FILE
    }
    message_type = type_map.get(message_type_str, MessageType.TEXT)
    
    # Crear mensaje
    message = Message(
        conversation_id=conversation.id,
        sender_id=None,  # Mensaje externo
        source=MessageSource.WHATSAPP,
        direction=MessageDirection.INBOUND,
        message_type=message_type,
        content=content,
        media_url=media_url,
        external_id=message_id,
        external_status=MessageStatus.DELIVERED,
        is_sent=True,
        read_by=[]
    )
    db.add(message)
    
    # Actualizar conversación
    conversation.last_message_at = timestamp
    conversation.last_message_preview = content[:100] if content else "[Media]"
    conversation.last_message_source = MessageSource.WHATSAPP
    conversation.unread_count = (conversation.unread_count or 0) + 1
    
    # Actualizar profile name si cambió
    if profile_name and profile_name != conversation.whatsapp_profile_name:
        conversation.whatsapp_profile_name = profile_name
        if not conversation.name or conversation.name == conversation.whatsapp_phone:
            conversation.name = profile_name
    
    await db.commit()
    
    print(f"[WhatsApp Webhook] Mensaje guardado: {message.id} en conversación {conversation.id}")


async def handle_message_status_updated(data: dict, db: AsyncSession):
    """
    Procesar actualización de estado de mensaje enviado.
    """
    message_id = data.get("message_id")
    status_str = data.get("status", "")
    
    if not message_id:
        return
    
    # Buscar mensaje por external_id
    result = await db.execute(
        select(Message).where(Message.external_id == message_id)
    )
    message = result.scalar_one_or_none()
    
    if not message:
        print(f"[WhatsApp Webhook] Mensaje no encontrado para status update: {message_id}")
        return
    
    # Mapear estado
    status_map = {
        "sent": MessageStatus.SENT,
        "delivered": MessageStatus.DELIVERED,
        "read": MessageStatus.READ,
        "failed": MessageStatus.FAILED
    }
    
    new_status = status_map.get(status_str)
    if new_status:
        message.external_status = new_status
        
        if new_status == MessageStatus.FAILED:
            message.external_error = data.get("error_message", data.get("error_code", "Error desconocido"))
        
        await db.commit()
        print(f"[WhatsApp Webhook] Estado actualizado: {message_id} -> {status_str}")
