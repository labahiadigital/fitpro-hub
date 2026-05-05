from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime

from app.schemas.base import BaseSchema


class BrandingSchema(BaseSchema):
    primary_color: str = "#2D6A4F"
    secondary_color: str = "#40916C"
    accent_color: str = "#F08A5D"


class BookingPoliciesSchema(BaseSchema):
    default_duration: int = 60
    buffer_time: int = 15
    max_advance_days: int = 30
    min_advance_hours: int = 2
    cancellation_hours: int = 24
    reschedule_hours: int = 12
    allow_client_booking: bool = True
    allow_client_cancellation: bool = True
    require_payment_upfront: bool = False
    send_reminders: bool = True
    reminder_hours: int = 24


class WorkspaceContactSchema(BaseSchema):
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None


class WorkspaceSupportSchema(BaseSchema):
    """Datos públicos de soporte que se enseñan al cliente y se incluyen al
    pie de los emails. Distinto de `contact` (que es info comercial).
    """

    phone: Optional[str] = None
    email: Optional[str] = None
    email_footer: Optional[str] = None  # texto libre para el pie del email


class TimeSlotSchema(BaseSchema):
    start: str  # HH:MM
    end: str    # HH:MM


class WeeklyScheduleSchema(BaseSchema):
    monday: List[TimeSlotSchema] = []
    tuesday: List[TimeSlotSchema] = []
    wednesday: List[TimeSlotSchema] = []
    thursday: List[TimeSlotSchema] = []
    friday: List[TimeSlotSchema] = []
    saturday: List[TimeSlotSchema] = []
    sunday: List[TimeSlotSchema] = []


class WorkspaceSettingsSchema(BaseSchema):
    timezone: str = "Europe/Madrid"
    currency: str = "EUR"
    language: str = "es"
    contact: WorkspaceContactSchema = WorkspaceContactSchema()
    support: WorkspaceSupportSchema = WorkspaceSupportSchema()
    booking_policies: BookingPoliciesSchema = BookingPoliciesSchema()
    weekly_schedule: Optional[WeeklyScheduleSchema] = None


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
    branding: Dict[str, Any] = {}
    settings: Dict[str, Any] = {}
    role: str

