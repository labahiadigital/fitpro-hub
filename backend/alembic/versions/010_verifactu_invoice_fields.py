"""Add VeriFactu fields to invoices and invoice_settings, create invoice_audit_logs table

Revision ID: 010_verifactu
Revises: 009_add_supplement_purchase_url
Create Date: 2026-02-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "010_verifactu"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Invoice: add VeriFactu and series columns ---
    op.add_column("invoices", sa.Column("invoice_series", sa.String(), server_default="F", nullable=True))
    op.add_column("invoices", sa.Column("verifactu_hash", sa.String(), nullable=True))
    op.add_column("invoices", sa.Column("verifactu_prev_hash", sa.String(), nullable=True))
    op.add_column("invoices", sa.Column("verifactu_status", sa.String(), server_default="none", nullable=True))
    op.add_column("invoices", sa.Column("verifactu_response", JSONB(), nullable=True))
    op.add_column("invoices", sa.Column("verifactu_uuid", sa.String(), nullable=True))
    op.add_column("invoices", sa.Column("verifactu_qr_data", sa.Text(), nullable=True))
    op.add_column("invoices", sa.Column("verifactu_sent_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("invoices", sa.Column("verifactu_registration_datetime", sa.DateTime(timezone=True), nullable=True))

    # Migrate existing invoice_type values from 'invoice' to 'F1'
    op.execute("UPDATE invoices SET invoice_type = 'F1' WHERE invoice_type = 'invoice' OR invoice_type IS NULL")

    # --- InvoiceSettings: add VeriFactu config and extra fields ---
    op.add_column("invoice_settings", sa.Column("nif_type", sa.String(), server_default="NIF", nullable=True))
    op.add_column("invoice_settings", sa.Column("province", sa.String(), nullable=True))
    op.add_column("invoice_settings", sa.Column("rectificative_prefix", sa.String(), server_default="R", nullable=True))
    op.add_column("invoice_settings", sa.Column("rectificative_next_number", sa.Integer(), server_default="1", nullable=True))
    op.add_column("invoice_settings", sa.Column("verifactu_enabled", sa.Boolean(), server_default="false", nullable=True))
    op.add_column("invoice_settings", sa.Column("verifactu_mode", sa.String(), server_default="none", nullable=True))
    op.add_column("invoice_settings", sa.Column("verifactu_api_url", sa.String(), nullable=True))
    op.add_column("invoice_settings", sa.Column("verifactu_api_key", sa.String(), nullable=True))
    op.add_column("invoice_settings", sa.Column("certificate_serial", sa.String(), nullable=True))

    # --- Create invoice_audit_logs table ---
    op.create_table(
        "invoice_audit_logs",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("extensions.uuid_generate_v4()"), primary_key=True),
        sa.Column("invoice_id", UUID(as_uuid=True), sa.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("old_values", JSONB(), nullable=True),
        sa.Column("new_values", JSONB(), nullable=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_name", sa.String(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_index("ix_invoice_audit_logs_invoice_id", "invoice_audit_logs", ["invoice_id"])
    op.create_index("ix_invoice_audit_logs_workspace_id", "invoice_audit_logs", ["workspace_id"])
    op.create_index("ix_invoices_verifactu_status", "invoices", ["verifactu_status"])
    op.create_index("ix_invoices_invoice_series", "invoices", ["invoice_series"])

    # Composite index for VeriFactu hash chaining query (workspace + series + registration datetime)
    op.create_index(
        "ix_invoices_ws_series_regdt",
        "invoices",
        ["workspace_id", "invoice_series", "verifactu_registration_datetime"],
    )

    # Partial index for pending VeriFactu submissions
    op.execute("""
        CREATE INDEX ix_invoices_verifactu_pending
        ON invoices (workspace_id, verifactu_status)
        WHERE verifactu_status IN ('pending', 'rejected')
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_invoices_verifactu_pending")
    op.drop_index("ix_invoices_ws_series_regdt", table_name="invoices")
    op.drop_index("ix_invoices_invoice_series", table_name="invoices")
    op.drop_index("ix_invoices_verifactu_status", table_name="invoices")
    op.drop_index("ix_invoice_audit_logs_workspace_id", table_name="invoice_audit_logs")
    op.drop_index("ix_invoice_audit_logs_invoice_id", table_name="invoice_audit_logs")
    op.drop_table("invoice_audit_logs")

    op.drop_column("invoice_settings", "certificate_serial")
    op.drop_column("invoice_settings", "verifactu_api_key")
    op.drop_column("invoice_settings", "verifactu_api_url")
    op.drop_column("invoice_settings", "verifactu_mode")
    op.drop_column("invoice_settings", "verifactu_enabled")
    op.drop_column("invoice_settings", "rectificative_next_number")
    op.drop_column("invoice_settings", "rectificative_prefix")
    op.drop_column("invoice_settings", "province")
    op.drop_column("invoice_settings", "nif_type")

    op.drop_column("invoices", "verifactu_registration_datetime")
    op.drop_column("invoices", "verifactu_sent_at")
    op.drop_column("invoices", "verifactu_qr_data")
    op.drop_column("invoices", "verifactu_uuid")
    op.drop_column("invoices", "verifactu_response")
    op.drop_column("invoices", "verifactu_status")
    op.drop_column("invoices", "verifactu_prev_hash")
    op.drop_column("invoices", "verifactu_hash")
    op.drop_column("invoices", "invoice_series")

    op.execute("UPDATE invoices SET invoice_type = 'invoice' WHERE invoice_type = 'F1'")
