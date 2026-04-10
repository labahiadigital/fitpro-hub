"""create custom_roles table

Revision ID: 034
Revises: 033
Create Date: 2026-04-10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "034"
down_revision = "033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "custom_roles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("color", sa.String(50), nullable=True, server_default="blue"),
        sa.Column("is_system", sa.Boolean, server_default="false", nullable=False),
        sa.Column("permissions", JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_custom_roles_workspace_id", "custom_roles", ["workspace_id"])

    op.add_column("user_roles", sa.Column("custom_role_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_user_roles_custom_role", "user_roles", "custom_roles", ["custom_role_id"], ["id"], ondelete="SET NULL")

    op.add_column("team_groups", sa.Column("custom_role_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_team_groups_custom_role", "team_groups", "custom_roles", ["custom_role_id"], ["id"], ondelete="SET NULL")

    op.add_column("team_groups", sa.Column("assigned_clients", JSONB, nullable=True, server_default="[]"))


def downgrade() -> None:
    op.drop_column("team_groups", "assigned_clients")
    op.drop_constraint("fk_team_groups_custom_role", "team_groups", type_="foreignkey")
    op.drop_column("team_groups", "custom_role_id")
    op.drop_constraint("fk_user_roles_custom_role", "user_roles", type_="foreignkey")
    op.drop_column("user_roles", "custom_role_id")
    op.drop_table("custom_roles")
