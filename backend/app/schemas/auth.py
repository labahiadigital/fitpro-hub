from typing import Optional
from uuid import UUID
from pydantic import EmailStr

from app.schemas.base import BaseSchema


class LoginRequest(BaseSchema):
    email: EmailStr
    password: str


class RegisterRequest(BaseSchema):
    email: EmailStr
    password: str
    full_name: str
    workspace_name: Optional[str] = None


class Token(BaseSchema):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None


class TokenPayload(BaseSchema):
    sub: str  # user_id
    workspace_id: Optional[UUID] = None
    role: Optional[str] = None
    exp: Optional[int] = None
    iat: Optional[int] = None


class PasswordResetRequest(BaseSchema):
    email: EmailStr


class PasswordResetConfirm(BaseSchema):
    token: str
    new_password: str


class ChangePasswordRequest(BaseSchema):
    current_password: str
    new_password: str

