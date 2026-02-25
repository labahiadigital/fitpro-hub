"""Add certificate PEM and software info fields for direct AEAT VeriFactu

Revision ID: 013
Revises: 012_check_constraints
"""
from alembic import op
import sqlalchemy as sa

revision = "013"
down_revision = "012_check_constraints"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("invoice_settings", sa.Column("certificate_pem", sa.Text(), nullable=True))
    op.add_column("invoice_settings", sa.Column("certificate_key_pem", sa.Text(), nullable=True))
    op.add_column("invoice_settings", sa.Column("software_company_name", sa.String(), nullable=True))
    op.add_column("invoice_settings", sa.Column("software_company_nif", sa.String(), nullable=True))
    op.add_column("invoice_settings", sa.Column("software_name", sa.String(), server_default="E13Fitness", nullable=True))
    op.add_column("invoice_settings", sa.Column("software_id", sa.String(2), server_default="EF", nullable=True))
    op.add_column("invoice_settings", sa.Column("software_version", sa.String(), server_default="1.0", nullable=True))
    op.add_column("invoice_settings", sa.Column("software_install_number", sa.String(), server_default="00001", nullable=True))


def downgrade():
    op.drop_column("invoice_settings", "software_install_number")
    op.drop_column("invoice_settings", "software_version")
    op.drop_column("invoice_settings", "software_id")
    op.drop_column("invoice_settings", "software_name")
    op.drop_column("invoice_settings", "software_company_nif")
    op.drop_column("invoice_settings", "software_company_name")
    op.drop_column("invoice_settings", "certificate_key_pem")
    op.drop_column("invoice_settings", "certificate_pem")
