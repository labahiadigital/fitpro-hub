"""Add is_active field to meal_plans

Revision ID: 015
Revises: 014
"""
from alembic import op
import sqlalchemy as sa

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("meal_plans", sa.Column("is_active", sa.Boolean(), server_default="false", nullable=True))


def downgrade():
    op.drop_column("meal_plans", "is_active")
