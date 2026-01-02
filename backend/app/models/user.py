from enum import Enum as PyEnum
from sqlalchemy import Column, String, Boolean, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class RoleType(str, PyEnum):
    OWNER = "owner"
    ADMIN = "admin"
    TRAINER = "trainer"
    NUTRITIONIST = "nutritionist"
    COLLABORATOR = "collaborator"
    CLIENT = "client"


# Default permissions for each role type
DEFAULT_ROLE_PERMISSIONS = {
    RoleType.OWNER: {
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
    RoleType.ADMIN: {
        "clients": ["create", "read", "update", "delete"],
        "workouts": ["create", "read", "update", "delete"],
        "nutrition": ["create", "read", "update", "delete"],
        "calendar": ["create", "read", "update", "delete"],
        "payments": ["read", "update"],
        "team": ["read", "update"],
        "settings": ["read"],
        "reports": ["read"],
        "chat": ["read", "send"],
        "automations": ["create", "read", "update", "delete"],
    },
    RoleType.TRAINER: {
        "clients": ["create", "read", "update"],
        "workouts": ["create", "read", "update", "delete"],
        "nutrition": ["read"],
        "calendar": ["create", "read", "update", "delete"],
        "payments": ["read"],
        "team": [],
        "settings": [],
        "reports": ["read"],
        "chat": ["read", "send"],
        "automations": ["read"],
    },
    RoleType.NUTRITIONIST: {
        "clients": ["read", "update"],
        "workouts": ["read"],
        "nutrition": ["create", "read", "update", "delete"],
        "calendar": ["create", "read", "update"],
        "payments": ["read"],
        "team": [],
        "settings": [],
        "reports": ["read"],
        "chat": ["read", "send"],
        "automations": ["read"],
    },
    RoleType.COLLABORATOR: {
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
    RoleType.CLIENT: {
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
    
    # Supabase Auth ID
    auth_id = Column(String(255), unique=True, nullable=True, index=True)
    
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
    
    def __repr__(self):
        return f"<User {self.email}>"


class CustomRole(BaseModel):
    """Custom roles defined by workspace owners."""
    
    __tablename__ = "custom_roles"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), default="#2D6A4F")
    
    # Custom permissions (override defaults)
    permissions = Column(JSONB, default={})
    
    # Base role type (for fallback permissions)
    base_role = Column(Enum(RoleType), default=RoleType.COLLABORATOR)
    
    # Is this role active
    is_active = Column(Boolean, default=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="custom_roles")
    
    def get_permissions(self):
        """Get effective permissions (custom + base role defaults)."""
        base_perms = DEFAULT_ROLE_PERMISSIONS.get(self.base_role, {}).copy()
        if self.permissions:
            base_perms.update(self.permissions)
        return base_perms
    
    def __repr__(self):
        return f"<CustomRole {self.name}>"


class UserRole(BaseModel):
    __tablename__ = "user_roles"
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(RoleType), nullable=False, default=RoleType.COLLABORATOR)
    custom_role_id = Column(UUID(as_uuid=True), ForeignKey("custom_roles.id", ondelete="SET NULL"), nullable=True)
    is_default = Column(Boolean, default=False)  # Default workspace for user
    
    # Custom permissions override (for fine-grained control)
    custom_permissions = Column(JSONB, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="workspace_roles")
    workspace = relationship("Workspace", back_populates="users")
    custom_role = relationship("CustomRole")
    
    def get_permissions(self):
        """Get effective permissions for this user role."""
        # Start with base role permissions
        perms = DEFAULT_ROLE_PERMISSIONS.get(self.role, {}).copy()
        
        # Override with custom role permissions if set
        if self.custom_role:
            perms = self.custom_role.get_permissions()
        
        # Override with user-specific permissions if set
        if self.custom_permissions:
            perms.update(self.custom_permissions)
        
        return perms
    
    def has_permission(self, resource: str, action: str) -> bool:
        """Check if user has a specific permission."""
        perms = self.get_permissions()
        resource_perms = perms.get(resource, [])
        return action in resource_perms
    
    def __repr__(self):
        return f"<UserRole {self.user_id} - {self.role} in {self.workspace_id}>"

