from enum import Enum as PyEnum
from sqlalchemy import Column, String, Boolean, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class RoleType(str, PyEnum):
    OWNER = "owner"
    COLLABORATOR = "collaborator"
    CLIENT = "client"


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


class UserRole(BaseModel):
    __tablename__ = "user_roles"
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(RoleType), nullable=False, default=RoleType.COLLABORATOR)
    is_default = Column(Boolean, default=False)  # Default workspace for user
    
    # Relationships
    user = relationship("User", back_populates="workspace_roles")
    workspace = relationship("Workspace", back_populates="users")
    
    def __repr__(self):
        return f"<UserRole {self.user_id} - {self.role} in {self.workspace_id}>"

