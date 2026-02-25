"""Add purchase_url column to supplements table

Revision ID: 009
Revises: 008
Create Date: 2026-02-24

Adds purchase_url field for supplement purchase/affiliate links.
"""
from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("supplements", sa.Column("purchase_url", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("supplements", "purchase_url")
