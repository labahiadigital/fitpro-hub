from typing import Optional, Dict, Any, List, Union
from uuid import UUID
from datetime import datetime
from pydantic import EmailStr, field_validator

from app.schemas.base import BaseSchema


# Histórico: en la base de datos ``height_cm`` y ``weight_kg`` se almacenan
# como ``VARCHAR(10)`` (decisión heredada). Sin embargo los formularios del
# frontend (Mantine ``NumberInput``) envían números reales. Para evitar el
# error 422 "Input should be a valid string" aceptamos ``int``/``float``/``str``
# en la entrada y normalizamos a ``str`` antes de persistir.
def _coerce_numeric_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        v = value.strip()
        return v or None
    if isinstance(value, bool):
        # Evita que ``True``/``False`` se cuele como "1"/"0".
        raise ValueError("Valor numérico inválido")
    if isinstance(value, (int, float)):
        # ``57.5`` → ``"57.5"``; ``160`` → ``"160"``.
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(value)
    raise ValueError("Valor numérico inválido")


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
    height_cm: Optional[Union[int, float, str]] = None
    weight_kg: Optional[Union[int, float, str]] = None
    health_data: Optional[Dict[str, Any]] = None
    goals: Optional[str] = None
    internal_notes: Optional[str] = None
    consents: Optional[ConsentSchema] = None
    tag_ids: Optional[List[UUID]] = None
    fiscal_type: Optional[str] = None
    legal_name: Optional[str] = None
    tax_id: Optional[str] = None
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_postal_code: Optional[str] = None
    billing_country: Optional[str] = None

    @field_validator("height_cm", "weight_kg", mode="before")
    @classmethod
    def _normalize_numeric_strings(cls, v: Any) -> Optional[str]:
        return _coerce_numeric_str(v)


class ClientUpdate(BaseSchema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    height_cm: Optional[Union[int, float, str]] = None
    weight_kg: Optional[Union[int, float, str]] = None
    health_data: Optional[Dict[str, Any]] = None
    goals: Optional[str] = None
    internal_notes: Optional[str] = None
    consents: Optional[ConsentSchema] = None
    tag_ids: Optional[List[UUID]] = None
    is_active: Optional[bool] = None
    chat_enabled: Optional[bool] = None
    fiscal_type: Optional[str] = None
    legal_name: Optional[str] = None
    tax_id: Optional[str] = None
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_postal_code: Optional[str] = None
    billing_country: Optional[str] = None

    @field_validator("height_cm", "weight_kg", mode="before")
    @classmethod
    def _normalize_numeric_strings(cls, v: Any) -> Optional[str]:
        return _coerce_numeric_str(v)


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
    chat_enabled: bool = False
    tags: List[ClientTagResponse] = []
    fiscal_type: Optional[str] = None
    legal_name: Optional[str] = None
    tax_id: Optional[str] = None
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_postal_code: Optional[str] = None
    billing_country: Optional[str] = None
    deleted_at: Optional[datetime] = None
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
    deleted_at: Optional[datetime] = None
    created_at: datetime


class ClientInviteRequest(BaseSchema):
    send_email: bool = True
    create_user_account: bool = True

