from enum import Enum as PyEnum
from sqlalchemy import Column, String, Boolean, Enum, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime

from app.models.base import BaseModel


class RoleType(str, PyEnum):
    """Role types matching user_role_type enum (lowercase values)."""
    owner = "owner"
    collaborator = "collaborator"
    client = "client"


ALL_PERMISSION_RESOURCES = [
    "clients",
    "workouts",
    "nutrition",
    "calendar",
    "payments",
    "team",
    "settings",
    "reports",
    "chat",
    "automations",
    "forms",
    "documents",
    "catalog",
    "billing",
    "community",
    "lms",
    "live_classes",
    "tasks",
]

DEFAULT_ROLE_PERMISSIONS = {
    RoleType.owner: {
        "clients": ["create", "read", "update", "delete"],
        "workouts": ["create", "read", "update", "delete"],
        "nutrition": ["create", "read", "update", "delete"],
        "calendar": ["create", "read", "update", "delete"],
        "payments": ["create", "read", "update", "delete"],
        "team": ["create", "read", "update", "delete"],
        "settings": ["read", "update"],
        "reports": ["read"],
        "chat": ["read", "send"],
        "automations": ["create", "read", "update", "delete"],
        "forms": ["create", "read", "update", "delete"],
        "documents": ["create", "read", "update", "delete"],
        "catalog": ["create", "read", "update", "delete"],
        "billing": ["create", "read", "update", "delete"],
        "community": ["create", "read", "update", "delete"],
        "lms": ["create", "read", "update", "delete"],
        "live_classes": ["create", "read", "update", "delete"],
        "tasks": ["create", "read", "update", "delete"],
    },
    RoleType.collaborator: {
        "clients": ["create", "read", "update"],
        "workouts": ["create", "read", "update"],
        "nutrition": ["create", "read", "update"],
        "calendar": ["create", "read", "update", "delete"],
        "payments": ["read"],
        "team": ["read"],
        "settings": ["read"],
        "reports": ["read"],
        "chat": ["read", "send"],
        "automations": ["read"],
        "forms": ["read"],
        "documents": ["read"],
        "catalog": ["read"],
        "billing": [],
        "community": ["read"],
        "lms": ["read"],
        "live_classes": ["read"],
        "tasks": ["create", "read", "update"],
    },
    RoleType.client: {
        "clients": [],
        "workouts": ["read"],
        "nutrition": ["read"],
        "calendar": ["read"],
        "payments": ["read"],
        "team": [],
        "settings": [],
        "reports": [],
        "chat": ["read", "send"],
        "automations": [],
        "forms": ["read"],
        "documents": ["read"],
        "catalog": ["read"],
        "billing": [],
        "community": ["read"],
        "lms": ["read"],
        "live_classes": ["read"],
        "tasks": [],
    },
}


class User(BaseModel):
    __tablename__ = "users"
    
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Password hash for local authentication (replaces Supabase Auth)
    password_hash = Column(String(255), nullable=True)
    
    # Email verification
    email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(255), nullable=True, index=True)
    email_verification_sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Password reset
    password_reset_token = Column(String(255), nullable=True, index=True)
    password_reset_sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Account deletion (soft delete with recovery period)
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)
    scheduled_deletion_at = Column(DateTime(timezone=True), nullable=True, index=True)
    deletion_reason = Column(Text, nullable=True)
    
    # Legacy: Supabase Auth ID (kept for migration, will be deprecated)
    auth_id = Column(UUID(as_uuid=True), unique=True, nullable=True, index=True)
    
    # Preferences
    preferences = Column(JSONB, default=lambda: {
        "language": "es",
        "timezone": "Europe/Madrid",
        "notifications": {
            "email": True,
            "push": True,
            "sms": False
        }
    })
    
    # Relationships
    workspace_roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    
    @property
    def is_pending_deletion(self) -> bool:
        """Check if account is scheduled for deletion."""
        return self.scheduled_deletion_at is not None and self.deleted_at is None
    
    @property
    def is_deleted(self) -> bool:
        """Check if account has been soft deleted."""
        return self.deleted_at is not None
    
    def __repr__(self):
        return f"<User {self.email}>"


# NOTE: CustomRole table does not exist in current Supabase schema
# Commented out to match actual database schema
# class CustomRole(BaseModel):
#     """Custom roles defined by workspace owners."""
#     __tablename__ = "custom_roles"
#     ... (table not in current schema)


class UserRole(BaseModel):
    """User role in a workspace."""
    __tablename__ = "user_roles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(RoleType, name="user_role_type", create_type=False), nullable=False, default=RoleType.collaborator)
    is_default = Column(Boolean, default=False)

    permissions = Column(JSONB, nullable=False, default=dict, server_default="{}")
    assigned_clients = Column(JSONB, nullable=False, default=list, server_default="[]")

    user = relationship("User", back_populates="workspace_roles")
    workspace = relationship("Workspace", back_populates="users")

    def get_permissions(self) -> dict:
        """Return effective permissions: custom overrides merged over role defaults.
        If ``self.permissions`` is non-empty, it fully replaces the defaults for
        every resource key it contains while keeping defaults for unlisted resources.
        Owner always gets full permissions regardless of overrides."""
        defaults = DEFAULT_ROLE_PERMISSIONS.get(self.role, {}).copy()
        if self.role == RoleType.owner:
            return defaults
        custom = self.permissions or {}
        if custom:
            defaults.update(custom)
        return defaults

    def has_permission(self, resource: str, action: str) -> bool:
        perms = self.get_permissions()
        return action in perms.get(resource, [])

    def get_assigned_clients(self) -> list:
        """Return list of client UUIDs this user can access. Empty = all."""
        return self.assigned_clients or []

    def __repr__(self):
        return f"<UserRole {self.user_id} - {self.role} in {self.workspace_id}>"

