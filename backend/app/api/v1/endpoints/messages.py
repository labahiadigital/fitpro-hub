import hashlib
import hmac
import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.database import get_db
from app.core.config import settings
from app.core import ttl_cache
from app.models.message import (
    Conversation, Message, ConversationType, MessageType,
    MessageSource, MessageDirection, MessageStatus
)
from app.models.client import Client
from app.models.workspace import Workspace
from app.middleware.auth import require_workspace, CurrentUser
from app.services.kapso import kapso_service, KapsoError

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ SCHEMAS ============

class ConversationCreate(BaseModel):
    name: Optional[str] = None
    conversation_type: ConversationType = ConversationType.DIRECT
    participant_ids: List[UUID] = []
    client_id: Optional[UUID] = None
    whatsapp_phone: Optional[str] = None
    scope: str = "client"


class ConversationResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    client_id: Optional[UUID]
    name: Optional[str]
    conversation_type: ConversationType
    participant_ids: List[UUID]
    whatsapp_phone: Optional[str]
    whatsapp_profile_name: Optional[str]
    preferred_channel: MessageSource
    last_message_at: Optional[datetime]
    last_message_preview: Optional[str]
    last_message_source: Optional[MessageSource]
    unread_count: int
    is_archived: bool
    created_at: datetime
    
    # Computed fields for frontend
    client_name: Optional[str] = None
    client_avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    conversation_id: UUID
    message_type: MessageType = MessageType.TEXT
    content: Optional[str] = None
    media_url: Optional[str] = None
    media_metadata: Optional[dict] = None
    scheduled_at: Optional[datetime] = None
    # Allow specifying which channel to send through
    send_via: MessageSource = MessageSource.PLATFORM


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: Optional[UUID]
    source: MessageSource
    direction: MessageDirection
    message_type: MessageType
    content: Optional[str]
    media_url: Optional[str]
    media_metadata: Optional[dict]
    external_id: Optional[str]
    external_status: MessageStatus
    external_error: Optional[str] = None
    read_by: List[UUID]
    is_sent: bool
    is_deleted: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Schema for WhatsApp webhook incoming messages
class WhatsAppIncomingMessage(BaseModel):
    from_phone: str
    message_id: str
    message_type: str
    content: Optional[str] = None
    media_url: Optional[str] = None
    timestamp: datetime
    profile_name: Optional[str] = None


# ============ CONVERSATIONS ============

@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    include_archived: bool = False,
    scope: Optional[str] = Query(None, pattern="^(client|internal)$"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar conversaciones del workspace (paginadas).
    Incluye conversaciones de plataforma y WhatsApp unificadas.
    Filtrar por scope: 'client' (chats con clientes) o 'internal' (chat equipo).
    """
    try:
        query = select(Conversation).where(
            Conversation.workspace_id == current_user.workspace_id
        ).options(selectinload(Conversation.client))

        if not include_archived:
            query = query.where(Conversation.is_archived == False)

        if scope:
            query = query.where(Conversation.scope == scope)

        order = Conversation.last_message_at.desc().nullslast()
        try:
            result = await db.execute(query.order_by(order).limit(limit).offset(offset))
        except Exception:
            # Fallback: algunas instalaciones antiguas no tienen todas las
            # columnas (p.ej. scope); reintentamos con la query mínima.
            await db.rollback()
            query = select(Conversation).where(
                Conversation.workspace_id == current_user.workspace_id
            ).options(selectinload(Conversation.client))
            if not include_archived:
                query = query.where(Conversation.is_archived == False)
            result = await db.execute(query.order_by(order).limit(limit).offset(offset))

        conversations = result.scalars().all()
        
        # Enrich with client data
        response = []
        for conv in conversations:
            # Si la conversación no tiene phone pero el cliente sí, lo
            # exponemos al frontend para que muestre el selector de canal y
            # el badge sin esperar a abrir la conversación individual.
            effective_phone = conv.whatsapp_phone or (
                conv.client.phone if conv.client else None
            )
            conv_dict = {
                "id": conv.id,
                "workspace_id": conv.workspace_id,
                "client_id": conv.client_id,
                "name": conv.name,
                "conversation_type": conv.conversation_type,
                "participant_ids": conv.participant_ids or [],
                "whatsapp_phone": effective_phone,
                "whatsapp_profile_name": conv.whatsapp_profile_name,
                "preferred_channel": conv.preferred_channel,
                "last_message_at": conv.last_message_at,
                "last_message_preview": conv.last_message_preview,
                "last_message_source": conv.last_message_source,
                "unread_count": conv.unread_count or 0,
                "is_archived": conv.is_archived,
                "created_at": conv.created_at,
                "client_name": conv.client.full_name if conv.client else conv.whatsapp_profile_name or conv.name,
                "client_avatar_url": conv.client.avatar_url if conv.client else None,
            }
            response.append(ConversationResponse(**conv_dict))
        
        return response
    except Exception as e:
        logger.exception("Error listing conversations: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener conversaciones"
        )


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    data: ConversationCreate,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear una nueva conversación.
    Puede ser con un cliente existente o con un número de WhatsApp nuevo.
    """
    # Ensure current user is in participants
    participant_ids = list(set(data.participant_ids + [current_user.id]))
    
    # If client_id provided, check if conversation already exists
    if data.client_id:
        result = await db.execute(
            select(Conversation).where(
                and_(
                    Conversation.workspace_id == current_user.workspace_id,
                    Conversation.client_id == data.client_id
                )
            ).options(selectinload(Conversation.client))
        )
        existing = result.scalar_one_or_none()
        if existing:
            # Backfill lazy: si la conversación no tiene whatsapp_phone pero
            # el cliente sí, vinculamos para que el selector de canal aparezca.
            if (
                not existing.whatsapp_phone
                and existing.client
                and existing.client.phone
            ):
                existing.whatsapp_phone = existing.client.phone
                await db.commit()
                await db.refresh(existing)
            return _conversation_to_response(existing)

        # Get client info (verify workspace ownership)
        client_result = await db.execute(
            select(Client).where(
                Client.id == data.client_id,
                Client.workspace_id == current_user.workspace_id,
            )
        )
        client = client_result.scalar_one_or_none()
        if client:
            data.name = client.full_name
            # Auto-vincular phone del cliente si la petición no trae uno.
            if client.phone and not data.whatsapp_phone:
                data.whatsapp_phone = client.phone
    
    # If WhatsApp phone provided, check if conversation exists
    if data.whatsapp_phone:
        result = await db.execute(
            select(Conversation).where(
                and_(
                    Conversation.workspace_id == current_user.workspace_id,
                    Conversation.whatsapp_phone == data.whatsapp_phone
                )
            ).options(selectinload(Conversation.client))
        )
        existing = result.scalar_one_or_none()
        if existing:
            return _conversation_to_response(existing)
    
    conv_kwargs = dict(
        workspace_id=current_user.workspace_id,
        client_id=data.client_id,
        name=data.name,
        conversation_type=data.conversation_type,
        participant_ids=participant_ids,
        whatsapp_phone=data.whatsapp_phone,
        preferred_channel=MessageSource.WHATSAPP if data.whatsapp_phone else MessageSource.PLATFORM,
        scope=data.scope,
    )
    conversation = Conversation(**conv_kwargs)
    db.add(conversation)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        conv_kwargs.pop("scope", None)
        conversation = Conversation(**conv_kwargs)
        db.add(conversation)
        await db.commit()
    await db.refresh(conversation)
    
    return _conversation_to_response(conversation)


def _conversation_to_response(conv: Conversation) -> ConversationResponse:
    """Helper to convert Conversation model to response"""
    return ConversationResponse(
        id=conv.id,
        workspace_id=conv.workspace_id,
        client_id=conv.client_id,
        name=conv.name,
        conversation_type=conv.conversation_type,
        participant_ids=conv.participant_ids or [],
        whatsapp_phone=conv.whatsapp_phone,
        whatsapp_profile_name=conv.whatsapp_profile_name,
        preferred_channel=conv.preferred_channel,
        last_message_at=conv.last_message_at,
        last_message_preview=conv.last_message_preview,
        last_message_source=conv.last_message_source,
        unread_count=conv.unread_count or 0,
        is_archived=conv.is_archived,
        created_at=conv.created_at,
        client_name=conv.client.full_name if conv.client else conv.whatsapp_profile_name or conv.name,
        client_avatar_url=conv.client.avatar_url if conv.client else None,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener detalles de una conversación.
    """
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.workspace_id == current_user.workspace_id
            )
        ).options(selectinload(Conversation.client))
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada"
        )

    # Backfill lazy: si hay cliente con phone y aún no está vinculado.
    if (
        not conversation.whatsapp_phone
        and conversation.client
        and conversation.client.phone
    ):
        conversation.whatsapp_phone = conversation.client.phone
        await db.commit()
        await db.refresh(conversation)

    return _conversation_to_response(conversation)


# ============ MESSAGES ============

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def list_messages(
    conversation_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    before: Optional[datetime] = None,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar mensajes de una conversación.
    Incluye mensajes de plataforma y WhatsApp unificados.
    """
    # Verify user has access to conversation
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.workspace_id == current_user.workspace_id
            )
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta conversación"
        )
    
    query = select(Message).where(
        and_(
            Message.conversation_id == conversation_id,
            Message.is_deleted == False,
            Message.is_sent == True
        )
    )
    
    if before:
        query = query.where(Message.created_at < before)
    
    result = await db.execute(
        query.order_by(Message.created_at.desc()).limit(limit)
    )
    messages = result.scalars().all()
    
    # Mark conversation as read
    if conversation.unread_count > 0:
        conversation.unread_count = 0
        await db.commit()
    
    # Return in chronological order
    return list(reversed(messages))


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    data: MessageCreate,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Enviar un mensaje.
    Puede enviarse por plataforma o WhatsApp según el canal especificado.
    """
    # Verify user has access to conversation
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == data.conversation_id,
                Conversation.workspace_id == current_user.workspace_id
            )
        ).options(selectinload(Conversation.client))
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta conversación"
        )

    # Backfill: si no hay whatsapp_phone pero el cliente lo tiene.
    if (
        not conversation.whatsapp_phone
        and conversation.client
        and conversation.client.phone
    ):
        conversation.whatsapp_phone = conversation.client.phone

    is_sent = data.scheduled_at is None or data.scheduled_at <= datetime.utcnow()

    # Determine which channel to use
    send_via = data.send_via

    # Get workspace to check WhatsApp configuration
    workspace_result = await db.execute(
        select(Workspace).where(Workspace.id == current_user.workspace_id)
    )
    workspace = workspace_result.scalar_one_or_none()

    # Check if WhatsApp is enabled and configured
    whatsapp_config = workspace.settings.get("whatsapp", {}) if workspace and workspace.settings else {}
    whatsapp_enabled = whatsapp_config.get("enabled", False)
    phone_number_id = whatsapp_config.get("phone_number_id")

    if send_via == MessageSource.WHATSAPP:
        if not conversation.whatsapp_phone:
            # Fallback to platform if conversation has no WhatsApp
            send_via = MessageSource.PLATFORM
        elif not whatsapp_enabled or not phone_number_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="WhatsApp no está configurado. Ve a Configuración > WhatsApp para conectar tu cuenta."
            )
    
    message = Message(
        conversation_id=data.conversation_id,
        sender_id=current_user.id,
        source=send_via,
        direction=MessageDirection.OUTBOUND,
        message_type=data.message_type,
        content=data.content,
        media_url=data.media_url,
        media_metadata=data.media_metadata,
        scheduled_at=data.scheduled_at,
        is_sent=is_sent,
        read_by=[current_user.id],
        external_status=MessageStatus.PENDING if send_via == MessageSource.WHATSAPP else MessageStatus.SENT
    )
    db.add(message)
    
    # Update conversation
    if is_sent:
        conversation.last_message_at = datetime.utcnow()
        conversation.last_message_preview = data.content[:100] if data.content else "[Media]"
        conversation.last_message_source = send_via
    
    await db.commit()
    await db.refresh(message)
    
    # Send via WhatsApp if requested
    if send_via == MessageSource.WHATSAPP and is_sent:
        try:
            # Send message via Kapso
            kapso_response = await kapso_service.send_text_message(
                phone_number_id=phone_number_id,
                to=conversation.whatsapp_phone,
                body=data.content
            )
            
            # Extract message ID from response
            messages_list = kapso_response.get("messages", [])
            if messages_list:
                message.external_id = messages_list[0].get("id")
                message.external_status = MessageStatus.SENT
            
            await db.commit()
            await db.refresh(message)
            
        except KapsoError as e:
            # Log error but don't fail the request - message is saved locally
            logger.error("Error enviando WhatsApp: %s", e.message)
            message.external_status = MessageStatus.FAILED
            message.external_error = e.message
            await db.commit()
            await db.refresh(message)
        except Exception as e:
            logger.exception("Error inesperado enviando WhatsApp: %s", e)
            message.external_status = MessageStatus.FAILED
            message.external_error = str(e)
            await db.commit()
            await db.refresh(message)
    
    return message


@router.post("/conversations/{conversation_id}/read")
async def mark_conversation_read(
    conversation_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Marcar toda la conversación como leída.
    """
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.workspace_id == current_user.workspace_id
            )
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada"
        )
    
    conversation.unread_count = 0
    await db.commit()
    
    return {"status": "ok"}


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Eliminar un mensaje (soft delete).
    """
    result = await db.execute(
        select(Message).where(
            and_(
                Message.id == message_id,
                Message.sender_id == current_user.id
            )
        )
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mensaje no encontrado"
        )
    
    message.is_deleted = True
    await db.commit()


# ============ WHATSAPP WEBHOOK ============

@router.post("/webhook/whatsapp")
async def whatsapp_webhook(
    data: WhatsAppIncomingMessage,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook para recibir mensajes entrantes de WhatsApp Business API.
    Verifica la firma del webhook antes de procesar.
    """
    # Verify webhook signature from Kapso/WhatsApp provider
    webhook_secret = settings.KAPSO_WEBHOOK_SECRET or None
    if webhook_secret:

        signature = request.headers.get("x-hub-signature-256", "") or request.headers.get("x-webhook-signature", "")
        if not signature:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firma de webhook ausente")
        body_bytes = await request.body()
        expected = "sha256=" + hmac.new(
            webhook_secret.encode(), body_bytes, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firma de webhook inválida")

    # Find or create conversation by WhatsApp phone
    # First, try to find by phone number
    result = await db.execute(
        select(Conversation).where(
            Conversation.whatsapp_phone == data.from_phone
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        # Try to find a client with this phone number
        client_result = await db.execute(
            select(Client).where(Client.phone == data.from_phone)
        )
        client = client_result.scalar_one_or_none()
        
        # Create new conversation
        conversation = Conversation(
            workspace_id=client.workspace_id if client else None,  # Would need default workspace
            client_id=client.id if client else None,
            name=data.profile_name or data.from_phone,
            conversation_type=ConversationType.DIRECT,
            whatsapp_phone=data.from_phone,
            whatsapp_profile_name=data.profile_name,
            preferred_channel=MessageSource.WHATSAPP
        )
        db.add(conversation)
        await db.flush()
    
    # Check for duplicate message
    existing = await db.execute(
        select(Message).where(Message.external_id == data.message_id)
    )
    if existing.scalar_one_or_none():
        return {"status": "duplicate"}
    
    # Create incoming message
    message_type = MessageType.TEXT
    if data.message_type == "image":
        message_type = MessageType.IMAGE
    elif data.message_type == "voice":
        message_type = MessageType.VOICE
    elif data.message_type == "document":
        message_type = MessageType.FILE
    
    message = Message(
        conversation_id=conversation.id,
        sender_id=None,  # External sender
        source=MessageSource.WHATSAPP,
        direction=MessageDirection.INBOUND,
        message_type=message_type,
        content=data.content,
        media_url=data.media_url,
        external_id=data.message_id,
        external_status=MessageStatus.DELIVERED,
        is_sent=True,
        read_by=[]
    )
    db.add(message)
    
    # Update conversation
    conversation.last_message_at = data.timestamp
    conversation.last_message_preview = data.content[:100] if data.content else "[Media]"
    conversation.last_message_source = MessageSource.WHATSAPP
    conversation.unread_count = (conversation.unread_count or 0) + 1
    
    await db.commit()
    
    # TODO: Trigger real-time notification via WebSocket/Supabase Realtime
    
    return {"status": "ok", "message_id": str(message.id)}


@router.post("/webhook/whatsapp/status")
async def whatsapp_status_webhook(
    message_id: str,
    wa_status: str,
    timestamp: datetime,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook para actualizaciones de estado de mensajes de WhatsApp.
    """
    webhook_secret = settings.KAPSO_WEBHOOK_SECRET or None
    if webhook_secret:

        signature = request.headers.get("x-hub-signature-256", "") or request.headers.get("x-webhook-signature", "")
        if not signature:
            return {"status": "error", "message": "Firma ausente"}
        body_bytes = await request.body()
        expected = "sha256=" + hmac.new(
            webhook_secret.encode(), body_bytes, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            return {"status": "error", "message": "Firma inválida"}

    result = await db.execute(
        select(Message).where(Message.external_id == message_id)
    )
    message = result.scalar_one_or_none()
    
    if message:
        status_map = {
            "sent": MessageStatus.SENT,
            "delivered": MessageStatus.DELIVERED,
            "read": MessageStatus.READ,
            "failed": MessageStatus.FAILED,
        }
        message.external_status = status_map.get(wa_status, MessageStatus.PENDING)
        await db.commit()
    
    return {"status": "ok"}


# ============ UNREAD COUNT ============

@router.get("/unread-count")
async def get_total_unread_count(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Get total unread message count across all conversations for staff.
    Used to display badge in sidebar. Cached 5s to tame sidebar polling.
    """
    cache_key = f"msg:unread:ws:{current_user.workspace_id}"
    cached = ttl_cache.get(cache_key)
    if cached is not None:
        return {"unread_count": cached}

    result = await db.execute(
        select(func.coalesce(func.sum(Conversation.unread_count), 0)).where(
            and_(
                Conversation.workspace_id == current_user.workspace_id,
                Conversation.is_archived == False
            )
        )
    )
    total = int(result.scalar() or 0)
    ttl_cache.set(cache_key, total, ttl=20.0)
    return {"unread_count": total}

