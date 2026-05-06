"""Tabla client_supplements para asignar suplementos del catálogo a clientes.

Revision ID: 056
Revises: 055
Create Date: 2026-05-06

El detalle del cliente en la vista entrenador tenía un botón "Añadir"
para suplementos que no hacía nada porque NO existía respaldo en BD.
Aquí creamos la tabla ``client_supplements`` que enlaza clientes con
suplementos del catálogo del workspace y guarda la pauta concreta
(dosis, frecuencia, notas).

Decisiones:

- ``supplement_id`` referencia ``supplements`` con ``ON DELETE CASCADE``
  porque un suplemento que el entrenador borra de su catálogo ya no
  tiene sentido conservarlo asignado al cliente.
- ``client_id`` con ``ON DELETE CASCADE`` también: si se purga al
  cliente, no queremos huérfanos.
- ``workspace_id`` redundante con ``client.workspace_id`` pero lo
  desnormalizamos para acelerar listados y para que las RLS de Supabase
  puedan filtrar sin JOIN cuando las activemos.
"""
from alembic import op
import sqlalchemy as sa


revision = "056"
down_revision = "055"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "client_supplements",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "workspace_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "client_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "supplement_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("supplements.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("dosage", sa.String(length=100), nullable=True),
        sa.Column("frequency", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        # Usamos timezone=True para alinear con ``BaseModel`` (todas las
        # demás tablas tienen ``timestamp with time zone``). Si se crea
        # como WITHOUT TIME ZONE asyncpg no convierte bien las fechas
        # naive↔aware y se rompen las queries por rango.
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index(
        "ix_client_supplements_client_id_active",
        "client_supplements",
        ["client_id", "is_active"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_client_supplements_client_id_active",
        table_name="client_supplements",
    )
    op.drop_table("client_supplements")
