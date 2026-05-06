"""Tabla community_benefits para los Beneficios del entrenador.

Revision ID: 057
Revises: 056
Create Date: 2026-05-06

El entrenador puede compartir códigos de descuento y URLs con sus
clientes desde la sección "Comunidad → Beneficios". Cada beneficio
tiene un título y, opcionalmente, una URL y/o un código copiable.

Decisiones:

- Una sola tabla porque los datos son pocos y siempre se consultan
  juntos. Si en el futuro queremos categorías, el enum se queda en la
  capa de aplicación.
- ``is_active`` permite ocultar un beneficio sin perder estadísticas.
- Sin FKs raras: lo único interesante es ``workspace_id``.
"""
from alembic import op
import sqlalchemy as sa


revision = "057"
down_revision = "056"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "community_benefits",
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
            "created_by",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("brand", sa.String(length=120), nullable=True),
        sa.Column("url", sa.String(length=500), nullable=True),
        sa.Column("discount_code", sa.String(length=80), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
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
        "ix_community_benefits_workspace_active",
        "community_benefits",
        ["workspace_id", "is_active"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_community_benefits_workspace_active",
        table_name="community_benefits",
    )
    op.drop_table("community_benefits")
