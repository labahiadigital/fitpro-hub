"""Add account deletion fields to users table

Revision ID: 005
Revises: 004
Create Date: 2026-01-28

This migration adds fields required for soft delete with recovery period:
- deleted_at: Timestamp when account was soft deleted
- scheduled_deletion_at: Timestamp when permanent deletion is scheduled
- deletion_reason: Optional reason for account deletion (for analytics/improvement)
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add account deletion fields to users table
    op.add_column('users', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('scheduled_deletion_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('deletion_reason', sa.Text, nullable=True))
    
    # Create indexes for efficient queries
    op.create_index('idx_users_deleted_at', 'users', ['deleted_at'])
    op.create_index('idx_users_scheduled_deletion_at', 'users', ['scheduled_deletion_at'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_users_scheduled_deletion_at', table_name='users')
    op.drop_index('idx_users_deleted_at', table_name='users')
    
    # Remove columns
    op.drop_column('users', 'deletion_reason')
    op.drop_column('users', 'scheduled_deletion_at')
    op.drop_column('users', 'deleted_at')
