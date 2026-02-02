"""Add Google Calendar integration tables

Revision ID: 006
Revises: 005
Create Date: 2026-02-02

This migration creates tables for Google Calendar integration:
- google_calendar_tokens: OAuth tokens and sync configuration
- calendar_sync_mappings: Mapping between bookings and Google Calendar events
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create google_calendar_tokens table
    op.create_table(
        'google_calendar_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        
        # OAuth tokens
        sa.Column('access_token', sa.Text, nullable=False),
        sa.Column('refresh_token', sa.Text, nullable=False),
        sa.Column('token_expiry', sa.DateTime(timezone=True), nullable=False),
        
        # Calendar info
        sa.Column('calendar_id', sa.String(255), server_default='primary', nullable=True),
        sa.Column('calendar_name', sa.String(255), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        
        # Sync settings
        sa.Column('sync_enabled', sa.Boolean, server_default='true', nullable=False),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sync_token', sa.String(500), nullable=True),
        
        # Push notifications
        sa.Column('channel_id', sa.String(255), nullable=True),
        sa.Column('channel_resource_id', sa.String(255), nullable=True),
        sa.Column('channel_expiry', sa.DateTime(timezone=True), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        
        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'workspace_id', name='uq_google_calendar_tokens_user_workspace'),
    )
    
    # Create indexes for google_calendar_tokens
    op.create_index('idx_google_calendar_tokens_user_id', 'google_calendar_tokens', ['user_id'])
    op.create_index('idx_google_calendar_tokens_workspace_id', 'google_calendar_tokens', ['workspace_id'])
    
    # Create calendar_sync_mappings table
    op.create_table(
        'calendar_sync_mappings',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        
        # Google Calendar event info
        sa.Column('google_event_id', sa.String(255), nullable=False),
        sa.Column('google_calendar_id', sa.String(255), nullable=False),
        
        # Sync tracking
        sa.Column('last_synced_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.Column('sync_direction', sa.String(50), server_default='trackfiz_to_google', nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        
        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('booking_id', 'user_id', name='uq_calendar_sync_mappings_booking_user'),
    )
    
    # Create indexes for calendar_sync_mappings
    op.create_index('idx_calendar_sync_mappings_booking_id', 'calendar_sync_mappings', ['booking_id'])
    op.create_index('idx_calendar_sync_mappings_user_id', 'calendar_sync_mappings', ['user_id'])
    op.create_index('idx_calendar_sync_mappings_google_event_id', 'calendar_sync_mappings', ['google_event_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_calendar_sync_mappings_google_event_id', table_name='calendar_sync_mappings')
    op.drop_index('idx_calendar_sync_mappings_user_id', table_name='calendar_sync_mappings')
    op.drop_index('idx_calendar_sync_mappings_booking_id', table_name='calendar_sync_mappings')
    op.drop_index('idx_google_calendar_tokens_workspace_id', table_name='google_calendar_tokens')
    op.drop_index('idx_google_calendar_tokens_user_id', table_name='google_calendar_tokens')
    
    # Drop tables
    op.drop_table('calendar_sync_mappings')
    op.drop_table('google_calendar_tokens')
