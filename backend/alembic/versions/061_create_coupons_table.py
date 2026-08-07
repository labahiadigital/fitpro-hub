"""Create coupons table.

Revision ID: 061
Revises: 060
Create Date: 2026-08-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


revision = "061"
down_revision = "060"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("SELECT 1")  # ensure connection
    conn = op.get_bind()
    has_table = conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupons')"
        )
    ).scalar()

    if not has_table:
        op.create_table(
            "coupons",
            sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("code", sa.String(50), nullable=False),
            sa.Column("description", sa.Text),
            sa.Column("discount_type", sa.String(20), nullable=False, server_default="percentage"),
            sa.Column("discount_value", sa.Numeric(10, 2), nullable=False),
            sa.Column("max_uses", sa.Integer),
            sa.Column("current_uses", sa.Integer, nullable=False, server_default="0"),
            sa.Column("applicable_product_ids", JSONB, server_default="[]"),
            sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        )
    else:
        # Table already exists — ensure schema is up to date
        cols = [
            r[0]
            for r in conn.execute(
                sa.text(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = 'coupons'"
                )
            ).fetchall()
        ]

        if "applicable_product_ids" not in cols:
            op.add_column("coupons", sa.Column("applicable_product_ids", JSONB, server_default="[]"))

        # Remove legacy columns that are no longer in the model
        for old_col in ("valid_from", "valid_until", "applicable_products"):
            if old_col in cols:
                op.drop_column("coupons", old_col)


def downgrade() -> None:
    op.drop_table("coupons")
