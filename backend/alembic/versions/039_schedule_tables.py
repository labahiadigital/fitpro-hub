"""Create staff_schedules, machine_schedules, box_schedules tables

Revision ID: 039
Revises: 038
Create Date: 2026-04-11
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "039"
down_revision = "038"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "staff_schedules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False, server_default="09:00"),
        sa.Column("end_time", sa.Time(), nullable=False, server_default="18:00"),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("workspace_id", "user_id", "day_of_week", name="uq_staff_schedule"),
        sa.CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_staff_dow"),
    )
    op.create_index("ix_staff_schedules_workspace_id", "staff_schedules", ["workspace_id"])
    op.create_index("ix_staff_schedules_user_id", "staff_schedules", ["user_id"])

    op.create_table(
        "machine_schedules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("machine_id", UUID(as_uuid=True), sa.ForeignKey("machines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False, server_default="08:00"),
        sa.Column("end_time", sa.Time(), nullable=False, server_default="22:00"),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("workspace_id", "machine_id", "day_of_week", name="uq_machine_schedule"),
        sa.CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_machine_dow"),
    )
    op.create_index("ix_machine_schedules_workspace_id", "machine_schedules", ["workspace_id"])
    op.create_index("ix_machine_schedules_machine_id", "machine_schedules", ["machine_id"])

    op.create_table(
        "box_schedules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("box_id", UUID(as_uuid=True), sa.ForeignKey("boxes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False, server_default="08:00"),
        sa.Column("end_time", sa.Time(), nullable=False, server_default="22:00"),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("workspace_id", "box_id", "day_of_week", name="uq_box_schedule"),
        sa.CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_box_dow"),
    )
    op.create_index("ix_box_schedules_workspace_id", "box_schedules", ["workspace_id"])
    op.create_index("ix_box_schedules_box_id", "box_schedules", ["box_id"])


def downgrade() -> None:
    op.drop_table("box_schedules")
    op.drop_table("machine_schedules")
    op.drop_table("staff_schedules")
