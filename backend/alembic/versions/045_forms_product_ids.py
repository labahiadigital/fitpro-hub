"""Add product_ids array to forms.

Revision ID: 045
Revises: 044
Create Date: 2026-04-20

Permite vincular un formulario a uno o varios productos del workspace.
Cuando un cliente compre/contrate un producto asociado podremos enviar
automáticamente los formularios que correspondan (lógica futura). Por
ahora solo persistimos la relación.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "045"
down_revision = "044"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "forms",
        sa.Column(
            "product_ids",
            postgresql.ARRAY(postgresql.UUID(as_uuid=True)),
            nullable=False,
            server_default="{}",
        ),
    )
    op.create_index(
        "ix_forms_product_ids",
        "forms",
        ["product_ids"],
        postgresql_using="gin",
    )


def downgrade() -> None:
    op.drop_index("ix_forms_product_ids", table_name="forms")
    op.drop_column("forms", "product_ids")
