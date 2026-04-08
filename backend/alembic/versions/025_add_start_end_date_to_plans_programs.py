"""Add start_date and end_date to meal_plans and workout_programs

Revision ID: 025
Revises: 024
"""
from alembic import op
import sqlalchemy as sa

revision = '025'
down_revision = '024'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('meal_plans', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column('meal_plans', sa.Column('end_date', sa.Date(), nullable=True))
    op.add_column('workout_programs', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column('workout_programs', sa.Column('end_date', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('workout_programs', 'end_date')
    op.drop_column('workout_programs', 'start_date')
    op.drop_column('meal_plans', 'end_date')
    op.drop_column('meal_plans', 'start_date')
