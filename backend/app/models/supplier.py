"""Supplier (proveedor) model.

Permite gestionar proveedores de stock por workspace. Los proveedores
contienen datos fiscales, dirección, cuentas bancarias (JSONB), datos de
contacto y campos personalizados. Se vincularán desde ``stock_items`` a
través de ``supplier_id`` (FK en la tabla de stock).
"""
from sqlalchemy import Column, String, Text, ForeignKey, Boolean, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Supplier(BaseModel):
    __tablename__ = "suppliers"

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Datos de facturación
    tax_id = Column(String(50), nullable=True, index=True)
    legal_name = Column(String(255), nullable=False)

    # Dirección
    address = Column(String(500), nullable=True)
    postal_code = Column(String(20), nullable=True)
    city = Column(String(150), nullable=True)
    province = Column(String(150), nullable=True)
    country = Column(String(100), nullable=False, server_default="España")

    # Ubicación
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)

    # Descuento por defecto a aplicar (porcentaje 0-100).
    default_discount_pct = Column(Numeric(5, 2), nullable=True)

    # Cuentas bancarias como lista de dicts:
    # [{"iban": "...", "bic": "...", "notes": "...", "is_default": true}]
    bank_accounts = Column(JSONB, nullable=False, server_default="[]")

    # Contacto
    phone = Column(String(50), nullable=True)
    mobile = Column(String(50), nullable=True)
    fax = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    url = Column(String(500), nullable=True)

    # Otros
    custom_field_1 = Column(String(255), nullable=True)
    custom_field_2 = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(ARRAY(String), nullable=False, server_default="{}")

    is_active = Column(Boolean, nullable=False, server_default="true")

    workspace = relationship("Workspace", lazy="selectin")

    def __repr__(self) -> str:  # pragma: no cover - debug
        return f"<Supplier {self.legal_name}>"
