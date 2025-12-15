from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from pydantic import BaseModel

from app.core.database import get_db
from app.models.message import Conversation, Message, ConversationType, MessageType
from app.middleware.auth import require_workspace, CurrentUser

router = APIRouter()


# ============ SCHEMAS ============

class ConversationCreate(BaseModel):
    name: Optional[str] = None
    conversation_type: ConversationType = ConversationType.DIRECT
    participant_ids: List[UUID]


class ConversationResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: Optional[str]
    conversation_type: ConversationType
    participant_ids: List[UUID]
    last_message_at: Optional[datetime]
    last_message_preview: Optional[str]
    is_archived: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    conversation_id: UUID
    message_type: MessageType = MessageType.TEXT
    content: Optional[str] = None
    media_url: Optional[str] = None
    media_metadata: Optional[dict] = None
    scheduled_at: Optional[datetime] = None


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: Optional[UUID]
    message_type: MessageType
    content: Optional[str]
    media_url: Optional[str]
    media_metadata: Optional[dict]
    read_by: List[UUID]
    is_sent: bool
    is_deleted: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ CONVERSATIONS ============

@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    include_archived: bool = False,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar conversaciones del usuario.
    """
    query = select(Conversation).where(
        and_(
            Conversation.workspace_id == current_user.workspace_id,
            Conversation.participant_ids.contains([current_user.id])
        )
    )
    
    if not include_archived:
        query = query.where(Conversation.is_archived == False)
    
    result = await db.execute(query.order_by(Conversation.last_message_at.desc().nullslast()))
    return result.scalars().all()


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    data: ConversationCreate,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear una nueva conversación.
    """
    # Ensure current user is in participants
    participant_ids = list(set(data.participant_ids + [current_user.id]))
    
    # For direct messages, check if conversation already exists
    if data.conversation_type == ConversationType.DIRECT and len(participant_ids) == 2:
        result = await db.execute(
            select(Conversation).where(
                and_(
                    Conversation.workspace_id == current_user.workspace_id,
                    Conversation.conversation_type == ConversationType.DIRECT,
                    Conversation.participant_ids.contains(participant_ids)
                )
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing
    
    conversation = Conversation(
        workspace_id=current_user.workspace_id,
        name=data.name,
        conversation_type=data.conversation_type,
        participant_ids=participant_ids
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation


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
                Conversation.workspace_id == current_user.workspace_id,
                Conversation.participant_ids.contains([current_user.id])
            )
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada"
        )
    
    return conversation


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
    Listar mensajes de una conversación (polling).
    """
    # Verify user has access to conversation
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.participant_ids.contains([current_user.id])
            )
        )
    )
    if not result.scalar_one_or_none():
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
    """
    # Verify user has access to conversation
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == data.conversation_id,
                Conversation.participant_ids.contains([current_user.id])
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
    
    message = Message(
        conversation_id=data.conversation_id,
        sender_id=current_user.id,
        message_type=data.message_type,
        content=data.content,
        media_url=data.media_url,
        media_metadata=data.media_metadata,
        scheduled_at=data.scheduled_at,
        is_sent=is_sent,
        read_by=[current_user.id]
    )
    db.add(message)
    
    # Update conversation
    if is_sent:
        conversation.last_message_at = datetime.utcnow()
        conversation.last_message_preview = data.content[:100] if data.content else "[Media]"
    
    await db.commit()
    await db.refresh(message)
    return message


@router.post("/messages/{message_id}/read")
async def mark_as_read(
    message_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Marcar mensaje como leído.
    """
    result = await db.execute(
        select(Message).where(Message.id == message_id)
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mensaje no encontrado"
        )
    
    if current_user.id not in message.read_by:
        message.read_by = message.read_by + [current_user.id]
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

