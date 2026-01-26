from typing import Optional
from uuid import UUID
from pydantic import EmailStr, field_validator

from app.schemas.base import BaseSchema


class LoginRequest(BaseSchema):
    email: EmailStr
    password: str


class RegisterRequest(BaseSchema):
    email: EmailStr
    password: str
    full_name: str
    workspace_name: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        return v


class Token(BaseSchema):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    requires_email_verification: bool = False


class TokenPayload(BaseSchema):
    sub: str  # user_id (UUID as string)
    email: Optional[str] = None
    workspace_id: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None
    iat: Optional[int] = None
    type: str = "access"  # "access" or "refresh"


class PasswordResetRequest(BaseSchema):
    email: EmailStr


class PasswordResetConfirm(BaseSchema):
    token: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        return v


class ChangePasswordRequest(BaseSchema):
    current_password: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        return v


class VerifyEmailRequest(BaseSchema):
    token: str


class ResendVerificationRequest(BaseSchema):
    email: EmailStr


class AuthResponse(BaseSchema):
    """Response for authentication operations"""
    success: bool
    message: str
    user_id: Optional[str] = None

