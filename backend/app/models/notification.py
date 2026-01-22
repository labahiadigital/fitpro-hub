"""Notification models."""
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.models.base import BaseModel


class Notification(BaseModel):
    """In-app notification model - matches Supabase schema."""
    
    __tablename__ = "notifications"
    
    # DB columns: id, user_id, workspace_id, title, body, type, link, is_read, read_at, created_at
    workspace_id = Column(UUID(as_uuid=True), ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(Text, nullable=False)
    body = Column(Text, nullable=True)
    type = Column(Text, nullable=True)  # info, success, warning, error, reminder
    link = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False)
    read_at = Column(String, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="notifications")


# NOTE: NotificationPreference table does not exist in DB
# class NotificationPreference(BaseModel):
#     """User notification preferences."""
#     __tablename__ = "notification_preferences"
#     ... (table not in current schema)


class EmailTemplate(BaseModel):
    """Custom email templates for workspace."""
    
    __tablename__ = "email_templates"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False)  # welcome, booking_confirmation, payment_receipt, etc.
    subject = Column(String(255), nullable=False)
    body_html = Column(Text, nullable=False)
    body_text = Column(Text)
    variables = Column(JSONB, default=[])  # Available template variables
    is_active = Column(Boolean, default=True)


# NOTE: ScheduledNotification table does not exist in DB
# class ScheduledNotification(BaseModel):
#     """Scheduled notifications for automation."""
#     __tablename__ = "scheduled_notifications"
#     ... (table not in current schema)


class ReminderSetting(BaseModel):
    """Recurring reminder settings for trainers and clients."""
    
    __tablename__ = "reminder_settings"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)  # For trainers
    client_id = Column(UUID(as_uuid=True), ForeignKey('clients.id', ondelete='CASCADE'), nullable=True, index=True)  # For clients
    
    # Reminder configuration
    reminder_type = Column(String(50), nullable=False)  # 'workout', 'nutrition', 'supplement', 'check_in', 'measurement'
    frequency_days = Column(Integer, nullable=False, default=15)  # Every N days
    last_sent = Column(String, nullable=True)
    next_scheduled = Column(String, nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    custom_message = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<ReminderSetting {self.reminder_type} every {self.frequency_days} days>"