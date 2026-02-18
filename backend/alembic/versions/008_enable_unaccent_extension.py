"""Enable unaccent extension for accent-insensitive search

Revision ID: 008
Revises: 007
Create Date: 2026-02-17

Enables PostgreSQL unaccent extension for accent-insensitive search
across clients, exercises, and foods.
"""
from alembic import op

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "unaccent"')


def downgrade() -> None:
    op.execute('DROP EXTENSION IF EXISTS "unaccent"')
