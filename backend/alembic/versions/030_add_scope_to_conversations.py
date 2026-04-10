"""Add scope column to conversations

Revision ID: 030
Revises: 029
Create Date: 2026-04-10
"""
from alembic import op
import sqlalchemy as sa

revision = "030"
down_revision = "029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("conversations", sa.Column("scope", sa.String(20), nullable=False, server_default="client"))
    op.create_index("ix_conversations_workspace_scope", "conversations", ["workspace_id", "scope"])


def downgrade() -> None:
    op.drop_index("ix_conversations_workspace_scope", table_name="conversations")
    op.drop_column("conversations", "scope")
