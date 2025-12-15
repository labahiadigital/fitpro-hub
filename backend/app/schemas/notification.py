"""Notification schemas."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

from .base import BaseSchema


# Notification schemas
class NotificationBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    notification_type: str = Field(default='info')
    category: Optional[str] = None
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class NotificationCreate(NotificationBase):
    workspace_id: UUID
    user_id: UUID


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None
    read_at: Optional[datetime] = None


class NotificationResponse(NotificationBase, BaseSchema):
    id: UUID
    workspace_id: UUID
    user_id: UUID
    is_read: bool = False
    read_at: Optional[datetime] = None


class NotificationList(BaseModel):
    items: List[NotificationResponse]
    total: int
    unread_count: int
    page: int
    size: int


class NotificationMarkRead(BaseModel):
    notification_ids: List[UUID]


class NotificationMarkAllRead(BaseModel):
    category: Optional[str] = None


# Notification Preference schemas
class NotificationPreferenceBase(BaseModel):
    email_booking_created: bool = True
    email_booking_cancelled: bool = True
    email_booking_reminder: bool = True
    email_payment_received: bool = True
    email_payment_failed: bool = True
    email_new_message: bool = True
    email_new_client: bool = True
    email_form_submitted: bool = True
    email_marketing: bool = False
    push_enabled: bool = True
    push_booking_created: bool = True
    push_booking_cancelled: bool = True
    push_booking_reminder: bool = True
    push_new_message: bool = True
    inapp_all: bool = True


class NotificationPreferenceUpdate(BaseModel):
    email_booking_created: Optional[bool] = None
    email_booking_cancelled: Optional[bool] = None
    email_booking_reminder: Optional[bool] = None
    email_payment_received: Optional[bool] = None
    email_payment_failed: Optional[bool] = None
    email_new_message: Optional[bool] = None
    email_new_client: Optional[bool] = None
    email_form_submitted: Optional[bool] = None
    email_marketing: Optional[bool] = None
    push_enabled: Optional[bool] = None
    push_booking_created: Optional[bool] = None
    push_booking_cancelled: Optional[bool] = None
    push_booking_reminder: Optional[bool] = None
    push_new_message: Optional[bool] = None
    inapp_all: Optional[bool] = None


class NotificationPreferenceResponse(NotificationPreferenceBase, BaseSchema):
    id: UUID
    user_id: UUID


# Email Template schemas
class EmailTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    subject: str = Field(..., min_length=1, max_length=255)
    body_html: str = Field(..., min_length=1)
    body_text: Optional[str] = None
    variables: List[str] = Field(default_factory=list)
    is_active: bool = True


class EmailTemplateCreate(EmailTemplateBase):
    workspace_id: UUID


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    subject: Optional[str] = Field(None, min_length=1, max_length=255)
    body_html: Optional[str] = Field(None, min_length=1)
    body_text: Optional[str] = None
    variables: Optional[List[str]] = None
    is_active: Optional[bool] = None


class EmailTemplateResponse(EmailTemplateBase, BaseSchema):
    id: UUID
    workspace_id: UUID


class EmailTemplateList(BaseModel):
    items: List[EmailTemplateResponse]
    total: int


# Scheduled Notification schemas
class ScheduledNotificationBase(BaseModel):
    recipient_type: str = Field(..., pattern='^(user|client)$')
    recipient_id: UUID
    channel: str = Field(..., pattern='^(email|push|inapp)$')
    subject: Optional[str] = None
    message: str = Field(..., min_length=1)
    scheduled_for: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ScheduledNotificationCreate(ScheduledNotificationBase):
    workspace_id: UUID
    template_id: Optional[UUID] = None
    automation_id: Optional[UUID] = None


class ScheduledNotificationUpdate(BaseModel):
    subject: Optional[str] = None
    message: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    status: Optional[str] = None


class ScheduledNotificationResponse(ScheduledNotificationBase, BaseSchema):
    id: UUID
    workspace_id: UUID
    template_id: Optional[UUID] = None
    automation_id: Optional[UUID] = None
    sent_at: Optional[datetime] = None
    status: str = 'pending'
    error_message: Optional[str] = None


class ScheduledNotificationList(BaseModel):
    items: List[ScheduledNotificationResponse]
    total: int
    page: int
    size: int

