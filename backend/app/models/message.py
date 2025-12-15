from enum import Enum as PyEnum
from sqlalchemy import Column, String, Text, Boolean, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ConversationType(str, PyEnum):
    DIRECT = "direct"
    GROUP = "group"
    BROADCAST = "broadcast"


class MessageType(str, PyEnum):
    TEXT = "text"
    IMAGE = "image"
    VOICE = "voice"
    FILE = "file"


class Conversation(BaseModel):
    __tablename__ = "conversations"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Conversation details
    name = Column(String(255), nullable=True)  # For group chats
    conversation_type = Column(Enum(ConversationType), default=ConversationType.DIRECT)
    
    # Participants (user IDs)
    participant_ids = Column(ARRAY(UUID(as_uuid=True)), default=[])
    
    # Last message info (for listing)
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    last_message_preview = Column(String(255), nullable=True)
    
    # Settings
    is_archived = Column(Boolean, default=False)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Conversation {self.id}>"


class Message(BaseModel):
    __tablename__ = "messages"
    
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Message content
    message_type = Column(Enum(MessageType), default=MessageType.TEXT)
    content = Column(Text, nullable=True)
    
    # Media (for images, voice notes, files)
    media_url = Column(String(500), nullable=True)
    media_metadata = Column(JSONB, nullable=True)  # duration, size, mime_type, etc.
    
    # Read status
    read_by = Column(ARRAY(UUID(as_uuid=True)), default=[])
    
    # Scheduling (for scheduled messages)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    is_sent = Column(Boolean, default=True)
    
    # Soft delete
    is_deleted = Column(Boolean, default=False)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    
    def __repr__(self):
        return f"<Message {self.id}>"

