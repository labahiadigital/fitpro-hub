from enum import Enum as PyEnum
from sqlalchemy import Column, String, Text, Boolean, Enum, ForeignKey, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, ENUM as PG_ENUM
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
    TEMPLATE = "template"  # WhatsApp template messages


class MessageSource(str, PyEnum):
    """Source of the message - platform or external channels"""
    PLATFORM = "platform"  # Internal platform chat
    WHATSAPP = "whatsapp"  # WhatsApp Business API
    # Future: SMS = "sms", TELEGRAM = "telegram", etc.


class MessageDirection(str, PyEnum):
    """Direction of the message"""
    INBOUND = "inbound"    # Received from client
    OUTBOUND = "outbound"  # Sent by trainer/system


class MessageStatus(str, PyEnum):
    """Delivery status for external messages"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


# Create PostgreSQL ENUMs that use the Python enum values (lowercase)
ConversationTypeEnum = PG_ENUM(
    'direct', 'group', 'broadcast',
    name='conversationtype',
    create_type=False
)

MessageTypeEnum = PG_ENUM(
    'text', 'image', 'voice', 'file', 'template',
    name='messagetype',
    create_type=False
)

MessageSourceEnum = PG_ENUM(
    'platform', 'whatsapp',
    name='messagesource',
    create_type=False
)

MessageDirectionEnum = PG_ENUM(
    'inbound', 'outbound',
    name='messagedirection',
    create_type=False
)

MessageStatusEnum = PG_ENUM(
    'pending', 'sent', 'delivered', 'read', 'failed',
    name='messagestatus',
    create_type=False
)


class Conversation(BaseModel):
    __tablename__ = "conversations"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Link to client (if applicable)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Conversation details
    name = Column(String(255), nullable=True)  # For group chats or client name
    conversation_type = Column(ConversationTypeEnum, default='direct')
    
    # Participants (user IDs - for internal platform users)
    participant_ids = Column(ARRAY(UUID(as_uuid=True)), default=[])
    
    # External channel info (WhatsApp, etc.)
    whatsapp_phone = Column(String(50), nullable=True, index=True)  # Client's WhatsApp number
    whatsapp_profile_name = Column(String(255), nullable=True)  # WhatsApp display name
    
    # Preferred channel for this conversation
    preferred_channel = Column(MessageSourceEnum, default='platform')
    
    # Last message info (for listing)
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    last_message_preview = Column(String(255), nullable=True)
    last_message_source = Column(MessageSourceEnum, nullable=True)  # Source of last message
    
    # Unread counts
    unread_count = Column(Integer, default=0)
    
    # Settings
    is_archived = Column(Boolean, default=False)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="conversations")
    client = relationship("Client", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Conversation {self.id}>"


class Message(BaseModel):
    __tablename__ = "messages"
    
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Message source and direction
    source = Column(MessageSourceEnum, default='platform', nullable=False)
    direction = Column(MessageDirectionEnum, default='outbound', nullable=False)
    
    # Message content
    message_type = Column(MessageTypeEnum, default='text')
    content = Column(Text, nullable=True)
    
    # Media (for images, voice notes, files)
    media_url = Column(String(500), nullable=True)
    media_metadata = Column(JSONB, nullable=True)  # duration, size, mime_type, etc.
    
    # External message tracking (WhatsApp, etc.)
    external_id = Column(String(255), nullable=True, index=True)  # WhatsApp message ID
    external_status = Column(MessageStatusEnum, default='pending')
    external_error = Column(Text, nullable=True)  # Error message if failed
    
    # WhatsApp specific
    whatsapp_template_name = Column(String(255), nullable=True)  # For template messages
    whatsapp_template_params = Column(JSONB, nullable=True)  # Template parameters
    
    # Read status (for platform messages)
    read_by = Column(ARRAY(UUID(as_uuid=True)), default=[])
    
    # Scheduling (for scheduled messages)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    is_sent = Column(Boolean, default=True)
    
    # Soft delete
    is_deleted = Column(Boolean, default=False)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    
    def __repr__(self):
        return f"<Message {self.id} [{self.source}]>"

