"""Add deleted_at to clients for soft delete

Revision ID: 036
Revises: 035
Create Date: 2026-04-10
"""
from alembic import op
import sqlalchemy as sa

revision = "036"
down_revision = "035"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_clients_deleted_at", "clients", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_clients_deleted_at", table_name="clients")
    op.drop_column("clients", "deleted_at")
