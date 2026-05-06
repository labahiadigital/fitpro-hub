"""Anade ``email_events.updated_at`` para alinear la tabla con BaseModel.

Revision ID: 059
Revises: 058
Create Date: 2026-05-06

La tabla ``email_events`` se creo en la migracion 052 sin ``updated_at``,
pero el modelo ``EmailEvent`` hereda de ``BaseModel`` que SI declara la
columna. SQLAlchemy genera SELECTs incluyendo ``updated_at`` y rompe en
runtime con ``UndefinedColumnError`` (HTTP 500 en /clients/segments/*).

Esta migracion es idempotente y rellena la columna con CURRENT_TIMESTAMP
para las filas existentes.
"""
from alembic import op
import sqlalchemy as sa


revision = "059"
down_revision = "058"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE email_events
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP;
        """
    )


def downgrade() -> None:
    op.drop_column("email_events", "updated_at")
