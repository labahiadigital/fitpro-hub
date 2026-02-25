from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from pydantic import EmailStr

from app.schemas.base import BaseSchema


class ConsentSchema(BaseSchema):
    data_processing: bool = False
    marketing: bool = False
    health_data: bool = False
    consent_date: Optional[datetime] = None


class ClientTagCreate(BaseSchema):
    name: str
    color: str = "#2D6A4F"


class ClientTagUpdate(BaseSchema):
    name: Optional[str] = None
    color: Optional[str] = None


class ClientTagResponse(BaseSchema):
    id: UUID
    name: str
    color: str
    created_at: datetime


class ClientCreate(BaseSchema):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    height_cm: Optional[str] = None
    weight_kg: Optional[str] = None
    health_data: Optional[Dict[str, Any]] = None
    goals: Optional[str] = None
    internal_notes: Optional[str] = None
    consents: Optional[ConsentSchema] = None
    tag_ids: Optional[List[UUID]] = None
    tax_id: Optional[str] = None
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_postal_code: Optional[str] = None
    billing_country: Optional[str] = None


class ClientUpdate(BaseSchema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    height_cm: Optional[str] = None
    weight_kg: Optional[str] = None
    health_data: Optional[Dict[str, Any]] = None
    goals: Optional[str] = None
    internal_notes: Optional[str] = None
    consents: Optional[ConsentSchema] = None
    tag_ids: Optional[List[UUID]] = None
    is_active: Optional[bool] = None
    tax_id: Optional[str] = None
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_postal_code: Optional[str] = None
    billing_country: Optional[str] = None


class ClientResponse(BaseSchema):
    id: UUID
    workspace_id: UUID
    first_name: str
    last_name: str
    full_name: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    height_cm: Optional[str] = None
    weight_kg: Optional[str] = None
    health_data: Dict[str, Any]
    goals: Optional[str] = None
    consents: Dict[str, Any]
    is_active: bool
    tags: List[ClientTagResponse] = []
    tax_id: Optional[str] = None
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_postal_code: Optional[str] = None
    billing_country: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ClientListResponse(BaseSchema):
    id: UUID
    first_name: str
    last_name: str
    full_name: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    has_user_account: bool = False
    tags: List[ClientTagResponse] = []
    created_at: datetime


class ClientInviteRequest(BaseSchema):
    send_email: bool = True
    create_user_account: bool = True

