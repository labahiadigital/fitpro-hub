from enum import Enum as PyEnum
from sqlalchemy import Column, String, Boolean, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class RoleType(str, PyEnum):
    """Role types matching Supabase user_role_type enum (lowercase values)."""
    # NOTE: Supabase only has owner, collaborator, client in the enum
    owner = "owner"
    collaborator = "collaborator" 
    client = "client"


# Default permissions for each role type (using lowercase enum values)
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
    },
    RoleType.collaborator: {
        "clients": ["read"],
        "workouts": ["read"],
        "nutrition": ["read"],
        "calendar": ["read"],
        "payments": [],
        "team": [],
        "settings": [],
        "reports": [],
        "chat": ["read", "send"],
        "automations": [],
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
    },
}


class User(BaseModel):
    __tablename__ = "users"
    
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Supabase Auth ID (UUID from Supabase Auth)
    auth_id = Column(UUID(as_uuid=True), unique=True, nullable=True, index=True)
    
    # Preferences
    preferences = Column(JSONB, default={
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
    
    def __repr__(self):
        return f"<User {self.email}>"


# NOTE: CustomRole table does not exist in current Supabase schema
# Commented out to match actual database schema
# class CustomRole(BaseModel):
#     """Custom roles defined by workspace owners."""
#     __tablename__ = "custom_roles"
#     ... (table not in current schema)


class UserRole(BaseModel):
    """User role in a workspace - matches Supabase schema."""
    __tablename__ = "user_roles"
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(RoleType, name="user_role_type", create_type=False), nullable=False, default=RoleType.collaborator)
    is_default = Column(Boolean, default=False)  # Default workspace for user
    
    # Relationships
    user = relationship("User", back_populates="workspace_roles")
    workspace = relationship("Workspace", back_populates="users")
    
    def get_permissions(self):
        """Get effective permissions for this user role."""
        return DEFAULT_ROLE_PERMISSIONS.get(self.role, {}).copy()
    
    def has_permission(self, resource: str, action: str) -> bool:
        """Check if user has a specific permission."""
        perms = self.get_permissions()
        resource_perms = perms.get(resource, [])
        return action in resource_perms
    
    def __repr__(self):
        return f"<UserRole {self.user_id} - {self.role} in {self.workspace_id}>"

