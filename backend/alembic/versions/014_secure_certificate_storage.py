"""Secure certificate storage: encrypted private key, certificate metadata

Revision ID: 014
Revises: 013
"""
from alembic import op
import sqlalchemy as sa

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade():
    # New encrypted storage columns
    op.add_column("invoice_settings", sa.Column("certificate_key_encrypted", sa.LargeBinary(), nullable=True))
    op.add_column("invoice_settings", sa.Column("certificate_key_iv", sa.LargeBinary(), nullable=True))

    # Certificate metadata
    op.add_column("invoice_settings", sa.Column("certificate_subject", sa.String(), nullable=True))
    op.add_column("invoice_settings", sa.Column("certificate_serial_number", sa.String(), nullable=True))
    op.add_column("invoice_settings", sa.Column("certificate_nif", sa.String(), nullable=True))
    op.add_column("invoice_settings", sa.Column("certificate_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("invoice_settings", sa.Column("certificate_uploaded_at", sa.DateTime(timezone=True), nullable=True))

    # Drop old plaintext columns
    op.drop_column("invoice_settings", "certificate_key_pem")
    op.drop_column("invoice_settings", "certificate_serial")
    op.drop_column("invoice_settings", "verifactu_api_url")
    op.drop_column("invoice_settings", "verifactu_api_key")


def downgrade():
    op.add_column("invoice_settings", sa.Column("verifactu_api_key", sa.String(), nullable=True))
    op.add_column("invoice_settings", sa.Column("verifactu_api_url", sa.String(), nullable=True))
    op.add_column("invoice_settings", sa.Column("certificate_serial", sa.String(), nullable=True))
    op.add_column("invoice_settings", sa.Column("certificate_key_pem", sa.Text(), nullable=True))

    op.drop_column("invoice_settings", "certificate_uploaded_at")
    op.drop_column("invoice_settings", "certificate_expires_at")
    op.drop_column("invoice_settings", "certificate_nif")
    op.drop_column("invoice_settings", "certificate_serial_number")
    op.drop_column("invoice_settings", "certificate_subject")
    op.drop_column("invoice_settings", "certificate_key_iv")
    op.drop_column("invoice_settings", "certificate_key_encrypted")
