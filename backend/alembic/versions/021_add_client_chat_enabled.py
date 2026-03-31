"""Add chat_enabled column to clients

Revision ID: 021
Revises: 020
"""
from alembic import op
import sqlalchemy as sa

revision = '021'
down_revision = '020'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('clients', sa.Column('chat_enabled', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('clients', 'chat_enabled')
