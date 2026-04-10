"""create beverages table

Revision ID: 032
Revises: 031
Create Date: 2026-04-10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "032"
down_revision = "031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "beverages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("category", sa.String(200), nullable=True),
        sa.Column("serving_size_ml", sa.Numeric, server_default="250"),
        sa.Column("reference_ml", sa.Numeric, server_default="100"),
        sa.Column("calories", sa.Numeric, server_default="0"),
        sa.Column("protein", sa.Numeric, server_default="0"),
        sa.Column("fat", sa.Numeric, server_default="0"),
        sa.Column("carbs", sa.Numeric, server_default="0"),
        sa.Column("is_global", sa.Boolean, server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_beverages_workspace_id", "beverages", ["workspace_id"])
    op.create_index("ix_beverages_is_global", "beverages", ["is_global"])
    op.create_index("ix_beverages_category", "beverages", ["category"])


def downgrade() -> None:
    op.drop_table("beverages")
