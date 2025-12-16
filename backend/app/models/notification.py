"""Notification models."""
from sqlalchemy import Column, String, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.models.base import BaseModel


class Notification(BaseModel):
    """In-app notification model."""
    
    __tablename__ = "notifications"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default='info')  # info, success, warning, error, reminder
    category = Column(String(50))  # booking, payment, message, client, system
    is_read = Column(Boolean, default=False)
    read_at = Column(String)
    action_url = Column(String(500))
    action_label = Column(String(100))
    extra_data = Column(JSONB, default={})
    
    # Relationships
    user = relationship("User", back_populates="notifications")


class NotificationPreference(BaseModel):
    """User notification preferences."""
    
    __tablename__ = "notification_preferences"
    
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Email notifications
    email_booking_created = Column(Boolean, default=True)
    email_booking_cancelled = Column(Boolean, default=True)
    email_booking_reminder = Column(Boolean, default=True)
    email_payment_received = Column(Boolean, default=True)
    email_payment_failed = Column(Boolean, default=True)
    email_new_message = Column(Boolean, default=True)
    email_new_client = Column(Boolean, default=True)
    email_form_submitted = Column(Boolean, default=True)
    email_marketing = Column(Boolean, default=False)
    
    # Push notifications
    push_enabled = Column(Boolean, default=True)
    push_booking_created = Column(Boolean, default=True)
    push_booking_cancelled = Column(Boolean, default=True)
    push_booking_reminder = Column(Boolean, default=True)
    push_new_message = Column(Boolean, default=True)
    
    # In-app notifications
    inapp_all = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", back_populates="notification_preferences")


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


class ScheduledNotification(BaseModel):
    """Scheduled notifications for automation."""
    
    __tablename__ = "scheduled_notifications"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    recipient_type = Column(String(20), nullable=False)  # user, client
    recipient_id = Column(UUID(as_uuid=True), nullable=False)
    channel = Column(String(20), nullable=False)  # email, push, inapp
    template_id = Column(UUID(as_uuid=True), ForeignKey('email_templates.id', ondelete='SET NULL'))
    subject = Column(String(255))
    message = Column(Text, nullable=False)
    scheduled_for = Column(String, nullable=False)
    sent_at = Column(String)
    status = Column(String(20), default='pending')  # pending, sent, failed, cancelled
    error_message = Column(Text)
    extra_data = Column(JSONB, default={})
    automation_id = Column(UUID(as_uuid=True), ForeignKey('automations.id', ondelete='SET NULL'))
    
    # Relationships
    template = relationship("EmailTemplate")
    automation = relationship("Automation")
