"""Añade ``supplements.discount_code`` para la cesta del cliente.

Revision ID: 058
Revises: 057
Create Date: 2026-05-06

El cliente debería ver el código de descuento del producto pegado al
botón "Comprar aquí" en su cesta de suplementos. Hasta ahora sólo
guardábamos ``purchase_url`` así que añadimos una columna nueva para
el código copiable.
"""
from alembic import op
import sqlalchemy as sa


revision = "058"
down_revision = "057"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "supplements",
        sa.Column("discount_code", sa.String(length=80), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("supplements", "discount_code")
