from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from pydantic import EmailStr

from app.schemas.base import BaseSchema
from app.models.user import RoleType


class NotificationPreferences(BaseSchema):
    email: bool = True
    push: bool = True
    sms: bool = False


class UserPreferences(BaseSchema):
    language: str = "es"
    timezone: str = "Europe/Madrid"
    notifications: NotificationPreferences = NotificationPreferences()


class UserCreate(BaseSchema):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[UserPreferences] = None


class UserUpdate(BaseSchema):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[UserPreferences] = None


class UserResponse(BaseSchema):
    id: UUID
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    preferences: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


class UserRoleCreate(BaseSchema):
    user_id: Optional[UUID] = None
    email: Optional[EmailStr] = None  # For inviting new users
    role: RoleType = RoleType.COLLABORATOR


class UserRoleUpdate(BaseSchema):
    role: RoleType


class UserRoleResponse(BaseSchema):
    id: UUID
    user_id: UUID
    workspace_id: UUID
    role: RoleType
    is_default: bool
    user: Optional[UserResponse] = None
    created_at: datetime


class InviteUserRequest(BaseSchema):
    email: EmailStr
    role: RoleType = RoleType.COLLABORATOR
    send_email: bool = True


class UserWithRoleResponse(BaseSchema):
    id: UUID
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: RoleType
    is_active: bool

