"""Add kind column to products (service | product).

Revision ID: 047
Revises: 046
Create Date: 2026-04-20

Separa productos y servicios en el catálogo. Todos los productos existentes
quedan como ``service`` (mantienen su comportamiento: pueden vincularse a
boxes, máquinas y miembros del equipo). Los nuevos ``product`` son artículos
sin recursos asignables.
"""
from alembic import op
import sqlalchemy as sa


revision = "047"
down_revision = "046"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column(
            "kind",
            sa.String(length=20),
            nullable=False,
            server_default="service",
        ),
    )
    op.create_index("ix_products_kind", "products", ["kind"])


def downgrade() -> None:
    op.drop_index("ix_products_kind", table_name="products")
    op.drop_column("products", "kind")
