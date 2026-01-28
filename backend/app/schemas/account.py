"""
Schemas for account management operations (deletion, recovery).
"""
from typing import Optional
from datetime import datetime
from pydantic import field_validator

from app.schemas.base import BaseSchema


class AccountDeletionRequest(BaseSchema):
    """Request to schedule account deletion."""
    password: str  # Require password confirmation for security
    reason: Optional[str] = None  # Optional reason for deletion (analytics)
    
    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 1000:
            raise ValueError('La razón no puede exceder 1000 caracteres')
        return v


class AccountDeletionCancelRequest(BaseSchema):
    """Request to cancel scheduled account deletion."""
    password: str  # Require password confirmation for security


class AccountDeletionResponse(BaseSchema):
    """Response for account deletion operations."""
    success: bool
    message: str
    scheduled_deletion_at: Optional[datetime] = None
    recovery_days_remaining: Optional[int] = None


class AccountStatusResponse(BaseSchema):
    """Response with account deletion status."""
    is_pending_deletion: bool
    scheduled_deletion_at: Optional[datetime] = None
    recovery_days_remaining: Optional[int] = None
    deletion_reason: Optional[str] = None
