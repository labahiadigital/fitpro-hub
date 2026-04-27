"""Add multi-box distribution table for stock items.

Revision ID: 049
Revises: 048
Create Date: 2026-04-27

Permite que cada artículo de inventario se reparta entre varios boxes con
unidades específicas por box (StockItemBox). Mantiene retrocompatibilidad:
si la tabla nueva está vacía para un item, se sigue usando
``stock_items.current_stock`` y, opcionalmente, ``stock_items.box_id``.

También añade ``stock_movements.box_id`` opcional para rastrear movimientos
asociados a un box concreto.
"""
from alembic import op
import sqlalchemy as sa


revision = "049"
down_revision = "048"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "stock_item_boxes",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("stock_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("box_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("boxes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("current_stock", sa.Numeric(), nullable=False, server_default="0"),
        sa.Column("min_stock", sa.Numeric(), nullable=False, server_default="0"),
        sa.Column("max_stock", sa.Numeric(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("item_id", "box_id", name="uq_stock_item_box"),
    )
    op.create_index("ix_stock_item_boxes_workspace_id", "stock_item_boxes", ["workspace_id"])
    op.create_index("ix_stock_item_boxes_item_id", "stock_item_boxes", ["item_id"])
    op.create_index("ix_stock_item_boxes_box_id", "stock_item_boxes", ["box_id"])

    op.add_column(
        "stock_movements",
        sa.Column("box_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_stock_movements_box",
        "stock_movements",
        "boxes",
        ["box_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_stock_movements_box_id", "stock_movements", ["box_id"])


def downgrade() -> None:
    op.drop_index("ix_stock_movements_box_id", table_name="stock_movements")
    op.drop_constraint("fk_stock_movements_box", "stock_movements", type_="foreignkey")
    op.drop_column("stock_movements", "box_id")
    op.drop_index("ix_stock_item_boxes_box_id", table_name="stock_item_boxes")
    op.drop_index("ix_stock_item_boxes_item_id", table_name="stock_item_boxes")
    op.drop_index("ix_stock_item_boxes_workspace_id", table_name="stock_item_boxes")
    op.drop_table("stock_item_boxes")
