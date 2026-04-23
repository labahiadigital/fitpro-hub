"""Add box_id and supplier_id to stock_items.

Revision ID: 048
Revises: 047
Create Date: 2026-04-20

Permite asignar cada artículo de stock a un box concreto (de entre los ya
creados en el workspace) y opcionalmente a un proveedor. Ambas FKs son
nullable para retrocompatibilidad.
"""
from alembic import op
import sqlalchemy as sa


revision = "048"
down_revision = "047"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "stock_items",
        sa.Column("box_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "stock_items",
        sa.Column("supplier_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_stock_items_box",
        "stock_items",
        "boxes",
        ["box_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_stock_items_supplier",
        "stock_items",
        "suppliers",
        ["supplier_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_stock_items_box_id", "stock_items", ["box_id"])
    op.create_index("ix_stock_items_supplier_id", "stock_items", ["supplier_id"])


def downgrade() -> None:
    op.drop_index("ix_stock_items_supplier_id", table_name="stock_items")
    op.drop_index("ix_stock_items_box_id", table_name="stock_items")
    op.drop_constraint("fk_stock_items_supplier", "stock_items", type_="foreignkey")
    op.drop_constraint("fk_stock_items_box", "stock_items", type_="foreignkey")
    op.drop_column("stock_items", "supplier_id")
    op.drop_column("stock_items", "box_id")
