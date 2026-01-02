"""
Modelos SQLAlchemy para el Sistema de Referidos Multinivel
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
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class ReferralProgram(Base):
    """Programa de Referidos"""
    __tablename__ = "referral_programs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)

    # Información del programa
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Tipo de programa
    program_type = Column(String, default="simple")  # simple, tiered, multilevel

    # Configuración de comisiones
    commission_type = Column(String, default="percentage")  # percentage, fixed
    commission_value = Column(Numeric, default=10)

    # Niveles multinivel
    levels = Column(JSONB, default=[{"level": 1, "commission": 10}, {"level": 2, "commission": 5}])
    max_levels = Column(Integer, default=2)

    # Productos aplicables
    applicable_to = Column(String, default="all")  # all, subscriptions, products, courses, supplements
    applicable_product_ids = Column(ARRAY(PG_UUID(as_uuid=True)), default=[])

    # Reglas
    min_purchase_amount = Column(Numeric, default=0)
    cookie_duration_days = Column(Integer, default=30)

    # Estado
    is_active = Column(Boolean, default=True)

    # Fechas
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Affiliate(Base):
    """Afiliado/Referidor"""
    __tablename__ = "affiliates"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)

    # Usuario afiliado
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)

    # Información del afiliado
    affiliate_code = Column(String, nullable=False, unique=True)
    display_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)

    # Afiliado padre (multinivel)
    parent_affiliate_id = Column(PG_UUID(as_uuid=True), ForeignKey("affiliates.id"), nullable=True)
    level = Column(Integer, default=1)

    # Datos de pago
    payment_method = Column(String, default="bank_transfer")
    payment_details = Column(JSONB, default={})

    # Estado
    status = Column(String, default="pending")  # pending, active, suspended, inactive
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Estadísticas
    total_referrals = Column(Integer, default=0)
    total_conversions = Column(Integer, default=0)
    total_earnings = Column(Numeric, default=0)
    pending_earnings = Column(Numeric, default=0)
    paid_earnings = Column(Numeric, default=0)

    # Términos
    accepted_terms = Column(Boolean, default=False)
    accepted_terms_at = Column(DateTime(timezone=True), nullable=True)

    # Notas
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    links = relationship("ReferralLink", back_populates="affiliate", cascade="all, delete-orphan")
    conversions = relationship("ReferralConversion", back_populates="affiliate")
    payouts = relationship("AffiliatePayout", back_populates="affiliate")
    children = relationship("Affiliate", backref="parent", remote_side=[id])


class ReferralLink(Base):
    """Enlace de Referido"""
    __tablename__ = "referral_links"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    affiliate_id = Column(PG_UUID(as_uuid=True), ForeignKey("affiliates.id", ondelete="CASCADE"), nullable=False)

    # Información del enlace
    link_code = Column(String, nullable=False, unique=True)
    destination_url = Column(String, nullable=False)

    # Programa asociado
    program_id = Column(PG_UUID(as_uuid=True), ForeignKey("referral_programs.id"), nullable=True)

    # Producto específico
    product_id = Column(PG_UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    supplement_id = Column(PG_UUID(as_uuid=True), nullable=True)
    course_id = Column(PG_UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True)

    # Estadísticas
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    revenue = Column(Numeric, default=0)

    # Estado
    is_active = Column(Boolean, default=True)

    # UTM
    utm_source = Column(String, nullable=True)
    utm_medium = Column(String, nullable=True)
    utm_campaign = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    affiliate = relationship("Affiliate", back_populates="links")
    clicks_list = relationship("ReferralClick", back_populates="link", cascade="all, delete-orphan")


class ReferralClick(Base):
    """Clic en Enlace de Referido"""
    __tablename__ = "referral_clicks"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    link_id = Column(PG_UUID(as_uuid=True), ForeignKey("referral_links.id", ondelete="CASCADE"), nullable=False)
    affiliate_id = Column(PG_UUID(as_uuid=True), ForeignKey("affiliates.id"), nullable=False)

    # Información del clic
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    referrer_url = Column(String, nullable=True)

    # Visitante
    visitor_id = Column(String, nullable=True)

    # Conversión
    converted = Column(Boolean, default=False)
    converted_at = Column(DateTime(timezone=True), nullable=True)
    conversion_id = Column(PG_UUID(as_uuid=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    link = relationship("ReferralLink", back_populates="clicks_list")


class ReferralConversion(Base):
    """Conversión/Venta de Referido"""
    __tablename__ = "referral_conversions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    affiliate_id = Column(PG_UUID(as_uuid=True), ForeignKey("affiliates.id"), nullable=False)
    link_id = Column(PG_UUID(as_uuid=True), ForeignKey("referral_links.id"), nullable=True)
    program_id = Column(PG_UUID(as_uuid=True), ForeignKey("referral_programs.id"), nullable=True)

    # Cliente convertido
    converted_client_id = Column(PG_UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    converted_user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Venta asociada
    payment_id = Column(PG_UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True)
    subscription_id = Column(PG_UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True)

    # Tipo de conversión
    conversion_type = Column(String, default="sale")  # sale, subscription, course, lead

    # Importes
    sale_amount = Column(Numeric, nullable=False)
    commission_rate = Column(Numeric, nullable=False)
    commission_amount = Column(Numeric, nullable=False)
    currency = Column(String, default="EUR")

    # Nivel multinivel
    affiliate_level = Column(Integer, default=1)

    # Estado
    status = Column(String, default="pending")  # pending, approved, rejected, paid

    # Fechas
    converted_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Notas
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    affiliate = relationship("Affiliate", back_populates="conversions")


class AffiliatePayout(Base):
    """Pago a Afiliado"""
    __tablename__ = "affiliate_payouts"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    workspace_id = Column(PG_UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    affiliate_id = Column(PG_UUID(as_uuid=True), ForeignKey("affiliates.id"), nullable=False)

    # Período
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)

    # Importes
    gross_amount = Column(Numeric, nullable=False)
    deductions = Column(Numeric, default=0)
    net_amount = Column(Numeric, nullable=False)
    currency = Column(String, default="EUR")

    # Conversiones incluidas
    conversion_ids = Column(ARRAY(PG_UUID(as_uuid=True)), default=[])
    conversions_count = Column(Integer, default=0)

    # Estado
    status = Column(String, default="pending")  # pending, processing, paid, failed, cancelled

    # Método de pago
    payment_method = Column(String, nullable=True)
    payment_reference = Column(String, nullable=True)

    # Fechas
    scheduled_date = Column(Date, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Notas
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    affiliate = relationship("Affiliate", back_populates="payouts")


class SupplementReferral(Base):
    """Suplemento con Programa de Referidos (Biblioteca Pública)"""
    __tablename__ = "supplement_referrals"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())

    # Suplemento
    supplement_name = Column(String, nullable=False)
    supplement_brand = Column(String, nullable=False)
    supplement_description = Column(Text, nullable=True)
    supplement_image_url = Column(String, nullable=True)
    supplement_url = Column(String, nullable=False)

    # Categoría
    category = Column(String, default="general")

    # Comisiones
    brand_commission_rate = Column(Numeric, default=15)  # % que paga la marca a Trackfiz
    affiliate_commission_rate = Column(Numeric, default=10)  # % que Trackfiz paga al entrenador

    # Estado
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)

    # Estadísticas globales
    total_clicks = Column(Integer, default=0)
    total_sales = Column(Integer, default=0)
    total_revenue = Column(Numeric, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AffiliateSupplementLink(Base):
    """Enlace de Suplemento por Afiliado"""
    __tablename__ = "affiliate_supplement_links"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=func.extensions.uuid_generate_v4())
    affiliate_id = Column(PG_UUID(as_uuid=True), ForeignKey("affiliates.id", ondelete="CASCADE"), nullable=False)
    supplement_referral_id = Column(PG_UUID(as_uuid=True), ForeignKey("supplement_referrals.id", ondelete="CASCADE"), nullable=False)

    # Código único
    affiliate_link_code = Column(String, nullable=False, unique=True)

    # Estadísticas
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    revenue = Column(Numeric, default=0)
    earnings = Column(Numeric, default=0)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
