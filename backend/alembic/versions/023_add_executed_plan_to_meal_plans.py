"""Add executed_plan column to meal_plans

Revision ID: 023
Revises: 022
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = '023'
down_revision = '022'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('meal_plans', sa.Column('executed_plan', JSONB, nullable=True))
    conn = op.get_bind()
    conn.execute(sa.text(
        "UPDATE meal_plans SET executed_plan = plan WHERE is_template = false AND plan IS NOT NULL"
    ))


def downgrade() -> None:
    op.drop_column('meal_plans', 'executed_plan')
