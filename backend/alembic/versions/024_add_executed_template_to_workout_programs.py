"""Add executed_template column to workout_programs

Revision ID: 024
Revises: 023
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = '024'
down_revision = '023'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('workout_programs', sa.Column('executed_template', JSONB, nullable=True))
    conn = op.get_bind()
    conn.execute(sa.text(
        "UPDATE workout_programs SET executed_template = template WHERE is_template = false AND template IS NOT NULL"
    ))


def downgrade() -> None:
    op.drop_column('workout_programs', 'executed_template')
