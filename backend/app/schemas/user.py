from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from pydantic import EmailStr, field_validator

from app.schemas.base import BaseSchema
from app.models.user import RoleType, ALL_PERMISSION_RESOURCES


class NotificationPreferences(BaseSchema):
    email_booking_created: bool = True
    email_booking_cancelled: bool = True
    email_payment_received: bool = True
    email_payment_failed: bool = True
    email_new_message: bool = True
    email_new_client: bool = True
    email_form_submitted: bool = True
    push_enabled: bool = True


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


class UserMeResponse(BaseSchema):
    """Response for /me endpoint including role information."""
    id: UUID
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    preferences: Dict[str, Any]
    role: Optional[str] = None  # Current role in workspace (owner, collaborator, client)
    workspace_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime


class UserRoleCreate(BaseSchema):
    user_id: Optional[UUID] = None
    email: Optional[EmailStr] = None
    role: RoleType = RoleType.collaborator
    permissions: Optional[Dict[str, List[str]]] = None
    assigned_clients: Optional[List[UUID]] = None


class UserRoleUpdate(BaseSchema):
    role: Optional[RoleType] = None
    permissions: Optional[Dict[str, List[str]]] = None
    assigned_clients: Optional[List[UUID]] = None

    @field_validator("permissions")
    @classmethod
    def validate_permissions(cls, v: Optional[Dict[str, List[str]]]) -> Optional[Dict[str, List[str]]]:
        if v is None:
            return v
        valid_actions = {"create", "read", "update", "delete", "send"}
        for resource, actions in v.items():
            if resource not in ALL_PERMISSION_RESOURCES:
                raise ValueError(f"Recurso desconocido: {resource}")
            for action in actions:
                if action not in valid_actions:
                    raise ValueError(f"Acción desconocida: {action}")
        return v


class UserRoleResponse(BaseSchema):
    id: UUID
    user_id: UUID
    workspace_id: UUID
    role: RoleType
    is_default: bool
    permissions: Dict[str, List[str]] = {}
    assigned_clients: List[UUID] = []
    user: Optional[UserResponse] = None
    created_at: datetime


class InviteUserRequest(BaseSchema):
    email: EmailStr
    role: RoleType = RoleType.collaborator
    send_email: bool = True
    permissions: Optional[Dict[str, List[str]]] = None
    assigned_clients: Optional[List[UUID]] = None

    @field_validator("permissions")
    @classmethod
    def validate_permissions(cls, v: Optional[Dict[str, List[str]]]) -> Optional[Dict[str, List[str]]]:
        if v is None:
            return v
        valid_actions = {"create", "read", "update", "delete", "send"}
        for resource, actions in v.items():
            if resource not in ALL_PERMISSION_RESOURCES:
                raise ValueError(f"Recurso desconocido: {resource}")
            for action in actions:
                if action not in valid_actions:
                    raise ValueError(f"Acción desconocida: {action}")
        return v


class UserWithRoleResponse(BaseSchema):
    id: UUID
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: RoleType
    is_active: bool
    permissions: Dict[str, List[str]] = {}
    assigned_clients: List[UUID] = []

