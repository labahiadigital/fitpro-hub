"""Add suppliers table.

Revision ID: 046
Revises: 045
Create Date: 2026-04-20

Crea la tabla ``suppliers`` para gestionar proveedores por workspace.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "046"
down_revision = "045"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "suppliers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tax_id", sa.String(50), nullable=True),
        sa.Column("legal_name", sa.String(255), nullable=False),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("postal_code", sa.String(20), nullable=True),
        sa.Column("city", sa.String(150), nullable=True),
        sa.Column("province", sa.String(150), nullable=True),
        sa.Column(
            "country", sa.String(100), nullable=False, server_default="España"
        ),
        sa.Column("latitude", sa.Numeric(9, 6), nullable=True),
        sa.Column("longitude", sa.Numeric(9, 6), nullable=True),
        sa.Column("default_discount_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column(
            "bank_accounts",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("mobile", sa.String(50), nullable=True),
        sa.Column("fax", sa.String(50), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("url", sa.String(500), nullable=True),
        sa.Column("custom_field_1", sa.String(255), nullable=True),
        sa.Column("custom_field_2", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "tags",
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default=sa.text("'{}'::varchar[]"),
        ),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_suppliers_workspace_id", "suppliers", ["workspace_id"], unique=False
    )
    op.create_index(
        "ix_suppliers_tax_id", "suppliers", ["tax_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_suppliers_tax_id", table_name="suppliers")
    op.drop_index("ix_suppliers_workspace_id", table_name="suppliers")
    op.drop_table("suppliers")
