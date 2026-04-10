"""stock tables, multi-workspace, task team_group, roles seed

Revision ID: 035
Revises: 034
Create Date: 2026-04-10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "035"
down_revision = "034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Multi-workspace: drop unique on clients.user_id, add composite
    op.drop_constraint("clients_user_id_key", "clients", type_="unique")
    op.create_index(
        "uq_clients_workspace_user", "clients",
        ["workspace_id", "user_id"], unique=True,
        postgresql_where=sa.text("user_id IS NOT NULL"),
    )

    # 2. Add team_group_id to tasks
    op.add_column("tasks", sa.Column("team_group_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_tasks_team_group", "tasks", "team_groups", ["team_group_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_tasks_team_group_id", "tasks", ["team_group_id"])

    # 3. stock_categories
    op.create_table(
        "stock_categories",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_stock_categories_workspace", "stock_categories", ["workspace_id"])

    # 4. stock_items
    op.create_table(
        "stock_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", UUID(as_uuid=True), sa.ForeignKey("stock_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("unit", sa.String(20), nullable=False, server_default="ud"),
        sa.Column("current_stock", sa.Numeric, nullable=False, server_default="0"),
        sa.Column("min_stock", sa.Numeric, nullable=False, server_default="0"),
        sa.Column("max_stock", sa.Numeric, nullable=False, server_default="0"),
        sa.Column("price", sa.Numeric, nullable=False, server_default="0"),
        sa.Column("location", sa.String(200), nullable=True),
        sa.Column("tax_rate", sa.Numeric, nullable=False, server_default="21"),
        sa.Column("irpf_rate", sa.Numeric, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_stock_items_workspace", "stock_items", ["workspace_id"])
    op.create_index("ix_stock_items_category", "stock_items", ["category_id"])

    # 5. stock_movements
    op.create_table(
        "stock_movements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_id", UUID(as_uuid=True), sa.ForeignKey("stock_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("movement_type", sa.String(20), nullable=False),
        sa.Column("quantity", sa.Numeric, nullable=False),
        sa.Column("previous_stock", sa.Numeric, nullable=False, server_default="0"),
        sa.Column("new_stock", sa.Numeric, nullable=False, server_default="0"),
        sa.Column("reason", sa.Text, nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_stock_movements_item", "stock_movements", ["item_id"])
    op.create_index("ix_stock_movements_workspace", "stock_movements", ["workspace_id"])


def downgrade() -> None:
    op.drop_table("stock_movements")
    op.drop_table("stock_items")
    op.drop_table("stock_categories")
    op.drop_index("ix_tasks_team_group_id", "tasks")
    op.drop_constraint("fk_tasks_team_group", "tasks", type_="foreignkey")
    op.drop_column("tasks", "team_group_id")
    op.drop_index("uq_clients_workspace_user", "clients")
    op.create_unique_constraint("clients_user_id_key", "clients", ["user_id"])
