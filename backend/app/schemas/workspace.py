from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from app.schemas.base import BaseSchema


class BrandingSchema(BaseSchema):
    primary_color: str = "#2D6A4F"
    secondary_color: str = "#40916C"
    accent_color: str = "#F08A5D"


class BookingPoliciesSchema(BaseSchema):
    cancellation_hours: int = 24
    reschedule_hours: int = 12
    max_advance_days: int = 30


class WorkspaceSettingsSchema(BaseSchema):
    timezone: str = "Europe/Madrid"
    currency: str = "EUR"
    language: str = "es"
    booking_policies: BookingPoliciesSchema = BookingPoliciesSchema()


class WorkspaceCreate(BaseSchema):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    branding: Optional[BrandingSchema] = None
    settings: Optional[WorkspaceSettingsSchema] = None


class WorkspaceUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    branding: Optional[BrandingSchema] = None
    settings: Optional[WorkspaceSettingsSchema] = None


class WorkspaceResponse(BaseSchema):
    id: UUID
    name: str
    slug: str
    domain: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    branding: Dict[str, Any]
    settings: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


class WorkspaceListResponse(BaseSchema):
    id: UUID
    name: str
    slug: str
    logo_url: Optional[str] = None
    role: str

