"""Datos de facturación (Persona Física / Jurídica) en onboarding.

Revision ID: 055
Revises: 054
Create Date: 2026-05-06

A partir de hoy el formulario público de signup pide los datos
fiscales del cliente ANTES del pago para poder emitir la factura
correctamente sin volver a interrumpir al usuario.

- ``client_invitations`` recibe los campos para persistirlos entre el
  signup y el ``/complete``.
- ``clients`` recibe ``fiscal_type`` y ``legal_name`` (los demás ya se
  habían añadido en la migración 011 de billing fields).

``fiscal_type`` toma los valores ``individual`` (Persona Física, default)
o ``company`` (Persona Jurídica). En el caso de empresa, ``legal_name``
es la *Razón Social*; para Persona Física dejamos NULL y usamos
``first_name + last_name`` como nombre fiscal.
"""
from alembic import op
import sqlalchemy as sa


revision = "055"
down_revision = "054"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) clients: nuevos campos fiscales (los billing_* ya existen).
    op.add_column(
        "clients",
        sa.Column(
            "fiscal_type",
            sa.String(length=20),
            nullable=True,
            server_default="individual",
        ),
    )
    op.add_column(
        "clients",
        sa.Column("legal_name", sa.String(length=255), nullable=True),
    )

    # 2) client_invitations: replicamos los billing fields para poder
    #    transportar los datos desde el formulario público hasta el
    #    /complete sin pasar por el cliente final hasta crear la cuenta.
    op.add_column(
        "client_invitations",
        sa.Column(
            "fiscal_type",
            sa.String(length=20),
            nullable=True,
            server_default="individual",
        ),
    )
    op.add_column(
        "client_invitations",
        sa.Column("legal_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "client_invitations",
        sa.Column("tax_id", sa.String(length=25), nullable=True),
    )
    op.add_column(
        "client_invitations",
        sa.Column("billing_address", sa.Text(), nullable=True),
    )
    op.add_column(
        "client_invitations",
        sa.Column("billing_city", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "client_invitations",
        sa.Column("billing_postal_code", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "client_invitations",
        sa.Column(
            "billing_country",
            sa.String(length=100),
            nullable=True,
            server_default="España",
        ),
    )


def downgrade() -> None:
    op.drop_column("client_invitations", "billing_country")
    op.drop_column("client_invitations", "billing_postal_code")
    op.drop_column("client_invitations", "billing_city")
    op.drop_column("client_invitations", "billing_address")
    op.drop_column("client_invitations", "tax_id")
    op.drop_column("client_invitations", "legal_name")
    op.drop_column("client_invitations", "fiscal_type")
    op.drop_column("clients", "legal_name")
    op.drop_column("clients", "fiscal_type")
