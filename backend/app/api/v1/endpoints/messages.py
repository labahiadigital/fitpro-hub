from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.database import get_db
from app.models.message import (
    Conversation, Message, ConversationType, MessageType,
    MessageSource, MessageDirection, MessageStatus
)
from app.models.client import Client
from app.middleware.auth import require_workspace, CurrentUser

router = APIRouter()


# ============ SCHEMAS ============

class ConversationCreate(BaseModel):
    name: Optional[str] = None
    conversation_type: ConversationType = ConversationType.DIRECT
    participant_ids: List[UUID] = []
    client_id: Optional[UUID] = None
    whatsapp_phone: Optional[str] = None


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
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar conversaciones del workspace.
    Incluye conversaciones de plataforma y WhatsApp unificadas.
    """
    query = select(Conversation).where(
        Conversation.workspace_id == current_user.workspace_id
    ).options(selectinload(Conversation.client))
    
    if not include_archived:
        query = query.where(Conversation.is_archived == False)
    
    result = await db.execute(query.order_by(Conversation.last_message_at.desc().nullslast()))
    conversations = result.scalars().all()
    
    # Enrich with client data
    response = []
    for conv in conversations:
        conv_dict = {
            "id": conv.id,
            "workspace_id": conv.workspace_id,
            "client_id": conv.client_id,
            "name": conv.name,
            "conversation_type": conv.conversation_type,
            "participant_ids": conv.participant_ids or [],
            "whatsapp_phone": conv.whatsapp_phone,
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
            return _conversation_to_response(existing)
        
        # Get client info
        client_result = await db.execute(
            select(Client).where(Client.id == data.client_id)
        )
        client = client_result.scalar_one_or_none()
        if client:
            data.name = client.full_name
    
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
    
    conversation = Conversation(
        workspace_id=current_user.workspace_id,
        client_id=data.client_id,
        name=data.name,
        conversation_type=data.conversation_type,
        participant_ids=participant_ids,
        whatsapp_phone=data.whatsapp_phone,
        preferred_channel=MessageSource.WHATSAPP if data.whatsapp_phone else MessageSource.PLATFORM
    )
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
    
    return _conversation_to_response(conversation)


# ============ MESSAGES ============

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def list_messages(
    conversation_id: UUID,
    limit: int = 50,
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


@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
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
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta conversación"
        )
    
    is_sent = data.scheduled_at is None or data.scheduled_at <= datetime.utcnow()
    
    # Determine which channel to use
    send_via = data.send_via
    if send_via == MessageSource.WHATSAPP and not conversation.whatsapp_phone:
        # Fallback to platform if no WhatsApp configured
        send_via = MessageSource.PLATFORM
    
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
    
    # TODO: If WhatsApp, send via WhatsApp Business API
    # This would be an async task to send the message and update external_id/status
    if send_via == MessageSource.WHATSAPP:
        # await send_whatsapp_message(message, conversation.whatsapp_phone)
        pass
    
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


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
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
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook para recibir mensajes entrantes de WhatsApp Business API.
    Este endpoint sería llamado por el proveedor de WhatsApp (Meta, Twilio, etc.)
    
    NOTA: En producción, este endpoint necesitaría:
    - Verificación de firma del webhook
    - Autenticación del proveedor
    - Manejo de diferentes tipos de eventos (message, status, etc.)
    """
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
    status: str,
    timestamp: datetime,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook para actualizaciones de estado de mensajes de WhatsApp.
    """
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
        message.external_status = status_map.get(status, MessageStatus.PENDING)
        await db.commit()
    
    return {"status": "ok"}

