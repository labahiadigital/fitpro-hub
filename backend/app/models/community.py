"""Modelos de la sección "Comunidad" del entrenador.

Por ahora exponemos un único modelo: :class:`CommunityBenefit`. Lo
introducimos como respuesta a la petición del entrenador de poder
compartir códigos de descuento y URLs (con título) con sus clientes.
Esos beneficios se ven en ``/community/benefits`` (entrenador) y en
``/my-community`` (cliente).

La tabla la define la migración 057. No mezclamos los Beneficios con la
Gamificación existente: la Gamificación tiene su propio set de modelos
en ``app/models/feedback.py`` u otros, y cada subsección tiene su
endpoint independiente.
"""
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class CommunityBenefit(BaseModel):
    """Beneficio (descuento/URL) que el entrenador comparte con clientes."""

    __tablename__ = "community_benefits"

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    brand = Column(String(120), nullable=True)
    url = Column(String(500), nullable=True)
    discount_code = Column(String(80), nullable=True)
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
