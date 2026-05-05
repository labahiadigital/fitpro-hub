"""Pre-rellenar datos del cliente en client_invitations antes del pago.

Revision ID: 053
Revises: 052
Create Date: 2026-05-05

El flujo público de un producto (preapp.trackfiz.com/onboarding/<slug>?product=<id>)
ahora pide al cliente TODOS sus datos (móvil + contraseña + 3 checkboxes
de consentimiento) ANTES de pagar. Esos datos se guardan en la propia
invitación para que tras el pago no haya que rellenar otro formulario:
el endpoint /invitations/complete los reutiliza directamente.

Columnas nuevas en ``client_invitations``:
- ``phone``: teléfono móvil obligatorio.
- ``password_hash``: contraseña ya hasheada (bcrypt).
- ``consent_data`` (JSONB): {"data_processing", "health_data", "marketing",
  "consent_date"}. ``marketing_consent`` (booleano) ya existía y se
  mantiene para los filtros de la pestaña "Inactivo" / "Carrito abandonado".
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "053"
down_revision = "052"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "client_invitations",
        sa.Column("phone", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "client_invitations",
        sa.Column("password_hash", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "client_invitations",
        sa.Column(
            "consent_data",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("client_invitations", "consent_data")
    op.drop_column("client_invitations", "password_hash")
    op.drop_column("client_invitations", "phone")
