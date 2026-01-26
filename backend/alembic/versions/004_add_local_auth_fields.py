"""Add local authentication fields to users table

Revision ID: 004
Revises: 003
Create Date: 2026-01-26

This migration adds fields required for local authentication:
- password_hash: Store bcrypt hashed passwords
- email_verified: Track email verification status
- email_verification_token: Token for email verification
- email_verification_sent_at: Timestamp when verification email was sent
- password_reset_token: Token for password reset
- password_reset_sent_at: Timestamp when reset email was sent
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add local auth fields to users table
    op.add_column('users', sa.Column('password_hash', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('email_verified', sa.Boolean, server_default='false', nullable=False))
    op.add_column('users', sa.Column('email_verification_token', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('email_verification_sent_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('password_reset_token', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('password_reset_sent_at', sa.DateTime(timezone=True), nullable=True))
    
    # Create indexes for token lookups
    op.create_index('idx_users_email_verification_token', 'users', ['email_verification_token'])
    op.create_index('idx_users_password_reset_token', 'users', ['password_reset_token'])
    
    # Mark existing users as email verified (they were verified via Supabase)
    op.execute("UPDATE users SET email_verified = true WHERE auth_id IS NOT NULL")


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_users_password_reset_token', table_name='users')
    op.drop_index('idx_users_email_verification_token', table_name='users')
    
    # Remove columns
    op.drop_column('users', 'password_reset_sent_at')
    op.drop_column('users', 'password_reset_token')
    op.drop_column('users', 'email_verification_sent_at')
    op.drop_column('users', 'email_verification_token')
    op.drop_column('users', 'email_verified')
    op.drop_column('users', 'password_hash')
