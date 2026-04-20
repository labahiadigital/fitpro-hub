"""Product max_users limit (seat cap)

Revision ID: 041
Revises: 040
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa

revision = "041"
down_revision = "040"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("max_users", sa.Integer(), nullable=True),
    )
    op.execute(
        "COMMENT ON COLUMN public.products.max_users IS "
        "'Maximum number of concurrently subscribed users. NULL means unlimited.'"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_subscriptions_product_id_status "
        "ON public.subscriptions ((metadata->>'product_id'), status)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_subscriptions_product_id_status")
    op.drop_column("products", "max_users")
