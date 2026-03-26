"""Add permissions and assigned_clients to user_roles

Revision ID: 020
Revises: 019
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '020'
down_revision = '019'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user_roles', sa.Column('permissions', postgresql.JSONB, server_default='{}', nullable=False))
    op.add_column('user_roles', sa.Column('assigned_clients', postgresql.JSONB, server_default='[]', nullable=False))


def downgrade() -> None:
    op.drop_column('user_roles', 'assigned_clients')
    op.drop_column('user_roles', 'permissions')
