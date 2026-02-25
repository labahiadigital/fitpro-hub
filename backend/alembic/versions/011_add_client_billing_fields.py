"""Add billing fields to clients table for auto-invoicing

Revision ID: 011_client_billing
Revises: 010_verifactu
Create Date: 2026-02-24
"""

from alembic import op
import sqlalchemy as sa

revision = "011_client_billing"
down_revision = "010_verifactu"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("tax_id", sa.String(25), nullable=True))
    op.add_column("clients", sa.Column("billing_address", sa.Text(), nullable=True))
    op.add_column("clients", sa.Column("billing_city", sa.String(100), nullable=True))
    op.add_column("clients", sa.Column("billing_postal_code", sa.String(10), nullable=True))
    op.add_column("clients", sa.Column("billing_country", sa.String(50), server_default="España", nullable=True))


def downgrade() -> None:
    op.drop_column("clients", "billing_country")
    op.drop_column("clients", "billing_postal_code")
    op.drop_column("clients", "billing_city")
    op.drop_column("clients", "billing_address")
    op.drop_column("clients", "tax_id")
