"""
Modelos SQLAlchemy para el módulo ERP (Facturación y Gastos)
"""

from datetime import date, datetime
from typing import Any, List, Optional
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class InvoiceSettings(Base):
    """Configuración de facturación por workspace"""
    __tablename__ = "invoice_settings"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Datos fiscales del negocio
    business_name = Column(String, nullable=False)
    tax_id = Column(String, nullable=True)  # NIF/CIF
    nif_type = Column(String, default="NIF")  # NIF, NIE, CIF, otro
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    province = Column(String, nullable=True)
    country = Column(String, default="España")
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)

    # Configuración de numeración
    invoice_prefix = Column(String, default="F")
    invoice_next_number = Column(Integer, default=1)
    invoice_number_format = Column(String, default="{prefix}{year}-{number}")
    rectificative_prefix = Column(String, default="R")
    rectificative_next_number = Column(Integer, default=1)

    # Impuestos por defecto
    default_tax_rate = Column(Numeric, default=21)
    default_tax_name = Column(String, default="IVA")

    # Configuración de pagos
    payment_terms_days = Column(Integer, default=30)
    default_payment_method = Column(String, default="transferencia")
    bank_account = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)

    # Pie de factura
    footer_text = Column(Text, nullable=True)
    terms_and_conditions = Column(Text, nullable=True)

    # Logo
    logo_url = Column(String, nullable=True)

    # VeriFactu
    verifactu_enabled = Column(Boolean, default=False)
    verifactu_mode = Column(String, default="none")  # none, direct_aeat_test, direct_aeat_prod

    # Certificate (public cert stored as text, private key encrypted at rest)
    certificate_pem = Column(Text, nullable=True)
    certificate_key_encrypted = Column(LargeBinary, nullable=True)
    certificate_key_iv = Column(LargeBinary, nullable=True)
    certificate_subject = Column(String, nullable=True)
    certificate_serial_number = Column(String, nullable=True)
    certificate_nif = Column(String, nullable=True)
    certificate_expires_at = Column(DateTime(timezone=True), nullable=True)
    certificate_uploaded_at = Column(DateTime(timezone=True), nullable=True)

    # Software informático (obligatorio AEAT)
    software_company_name = Column(String, nullable=True)
    software_company_nif = Column(String, nullable=True)
    software_name = Column(String, default="E13Fitness")
    software_id = Column(String(2), default="EF")
    software_version = Column(String, default="1.0")
    software_install_number = Column(String, default="00001")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Invoice(Base):
    """Modelo de Factura"""
    __tablename__ = "invoices"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)

    # Número y serie de factura
    invoice_number = Column(String, nullable=False)
    invoice_series = Column(String, default="F")  # F=ordinaria, R=rectificativa

    # Tipo de factura (F1=ordinaria, F2=simplificada, F3=rectificativa, R1-R5=rectificativas)
    invoice_type = Column(String, default="F1")

    # Cliente
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    client_name = Column(String, nullable=False)
    client_tax_id = Column(String, nullable=True)
    client_address = Column(Text, nullable=True)
    client_city = Column(String, nullable=True)
    client_postal_code = Column(String, nullable=True)
    client_country = Column(String, default="España")
    client_email = Column(String, nullable=True)

    # Fechas
    issue_date = Column(Date, nullable=False, default=date.today)
    due_date = Column(Date, nullable=True)
    paid_date = Column(Date, nullable=True)

    # Estado: draft, finalized, sent, paid, overdue, cancelled, rectified
    status = Column(String, default="draft")

    # Totales
    subtotal = Column(Numeric, default=0)
    tax_amount = Column(Numeric, default=0)
    discount_amount = Column(Numeric, default=0)
    total = Column(Numeric, default=0)
    currency = Column(String, default="EUR")

    # Descuento global
    discount_type = Column(String, default="percentage")
    discount_value = Column(Numeric, default=0)

    # Impuestos
    tax_rate = Column(Numeric, default=21)
    tax_name = Column(String, default="IVA")

    # Notas
    notes = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)

    # Pago
    payment_method = Column(String, nullable=True)
    payment_reference = Column(String, nullable=True)
    payment_id = Column(PG_UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True)

    # Factura relacionada (para rectificativas)
    related_invoice_id = Column(PG_UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=True)

    # PDF
    pdf_url = Column(String, nullable=True)

    # VeriFactu fields
    verifactu_hash = Column(String, nullable=True)
    verifactu_prev_hash = Column(String, nullable=True)
    verifactu_status = Column(String, default="none")  # none, pending, sent, accepted, rejected
    verifactu_response = Column(JSONB, nullable=True)
    verifactu_uuid = Column(String, nullable=True)
    verifactu_qr_data = Column(Text, nullable=True)
    verifactu_sent_at = Column(DateTime(timezone=True), nullable=True)
    verifactu_registration_datetime = Column(DateTime(timezone=True), nullable=True)

    # Metadatos
    extra_data = Column("metadata", JSONB, default={})

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    audit_logs = relationship("InvoiceAuditLog", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    """Modelo de Línea de Factura"""
    __tablename__ = "invoice_items"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    invoice_id = Column(PG_UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)

    # Descripción
    description = Column(Text, nullable=False)

    # Cantidades
    quantity = Column(Numeric, default=1)
    unit_price = Column(Numeric, nullable=False)

    # Descuento
    discount_type = Column(String, default="percentage")
    discount_value = Column(Numeric, default=0)

    # Impuesto
    tax_rate = Column(Numeric, nullable=True)
    tax_name = Column(String, nullable=True)

    # Totales
    subtotal = Column(Numeric, default=0)
    tax_amount = Column(Numeric, default=0)
    total = Column(Numeric, default=0)

    # Referencias
    product_id = Column(PG_UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    session_package_id = Column(PG_UUID(as_uuid=True), ForeignKey("session_packages.id"), nullable=True)

    # Orden
    position = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    invoice = relationship("Invoice", back_populates="items")


class Expense(Base):
    """Modelo de Gasto"""
    __tablename__ = "expenses"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)

    # Descripción
    description = Column(Text, nullable=False)
    category = Column(String, default="general")

    # Proveedor
    vendor_name = Column(String, nullable=True)
    vendor_tax_id = Column(String, nullable=True)

    # Importes
    amount = Column(Numeric, nullable=False)
    tax_amount = Column(Numeric, default=0)
    total = Column(Numeric, nullable=False)
    currency = Column(String, default="EUR")

    # Impuesto
    tax_rate = Column(Numeric, default=21)
    tax_deductible = Column(Boolean, default=True)

    # Fecha
    expense_date = Column(Date, nullable=False, default=date.today)

    # Estado
    status = Column(String, default="pending")

    # Pago
    payment_method = Column(String, nullable=True)
    payment_reference = Column(String, nullable=True)
    paid_date = Column(Date, nullable=True)

    # Documento
    receipt_url = Column(String, nullable=True)

    # Recurrencia
    is_recurring = Column(Boolean, default=False)
    recurrence_rule = Column(JSONB, nullable=True)

    # Notas
    notes = Column(Text, nullable=True)

    # Metadatos
    extra_data = Column(JSONB, default={})

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ExpenseCategory(Base):
    """Modelo de Categoría de Gasto"""
    __tablename__ = "expense_categories"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)

    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String, default="#2D6A4F")
    icon = Column(String, default="receipt")

    # Presupuesto
    monthly_budget = Column(Numeric, nullable=True)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class InvoiceAuditLog(Base):
    """Registro de auditoría para trazabilidad completa de facturas"""
    __tablename__ = "invoice_audit_logs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    invoice_id = Column(PG_UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)

    action = Column(String, nullable=False)  # created, updated, finalized, sent, paid, cancelled, rectified, email_sent, pdf_generated
    old_values = Column(JSONB, nullable=True)
    new_values = Column(JSONB, nullable=True)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_name = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    invoice = relationship("Invoice", back_populates="audit_logs")


class Quote(Base):
    """Modelo de Presupuesto/Cotización"""
    __tablename__ = "quotes"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)

    # Número
    quote_number = Column(String, nullable=False)

    # Cliente
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    client_name = Column(String, nullable=False)
    client_email = Column(String, nullable=True)

    # Fechas
    issue_date = Column(Date, nullable=False, default=date.today)
    valid_until = Column(Date, nullable=True)

    # Estado
    status = Column(String, default="draft")

    # Totales
    subtotal = Column(Numeric, default=0)
    tax_amount = Column(Numeric, default=0)
    discount_amount = Column(Numeric, default=0)
    total = Column(Numeric, default=0)
    currency = Column(String, default="EUR")

    # Notas
    notes = Column(Text, nullable=True)
    terms = Column(Text, nullable=True)

    # Conversión a factura
    converted_to_invoice_id = Column(PG_UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=True)
    converted_at = Column(DateTime(timezone=True), nullable=True)

    # PDF
    pdf_url = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")


class QuoteItem(Base):
    """Modelo de Línea de Presupuesto"""
    __tablename__ = "quote_items"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    quote_id = Column(PG_UUID(as_uuid=True), ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)

    description = Column(Text, nullable=False)
    quantity = Column(Numeric, default=1)
    unit_price = Column(Numeric, nullable=False)

    discount_type = Column(String, default="percentage")
    discount_value = Column(Numeric, default=0)

    tax_rate = Column(Numeric, nullable=True)

    subtotal = Column(Numeric, default=0)
    tax_amount = Column(Numeric, default=0)
    total = Column(Numeric, default=0)

    position = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    quote = relationship("Quote", back_populates="items")
