"""Create time_clock tables + enhance tasks with client_id/due_time/source, add review_interval to plans/programs

Revision ID: 038
Revises: 037
Create Date: 2026-04-11
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision = "038"
down_revision = "037"
branch_labels = None
depends_on = None


def upgrade() -> None:
    time_record_status = sa.Enum("active", "completed", "edited", name="time_record_status")
    leave_type_enum = sa.Enum(
        "vacaciones", "baja_medica", "asunto_personal",
        "maternidad_paternidad", "formacion", "otros",
        name="leave_type_enum",
    )
    leave_status_enum = sa.Enum("pendiente", "aprobada", "rechazada", name="leave_status_enum")

    time_record_status.create(op.get_bind(), checkfirst=True)
    leave_type_enum.create(op.get_bind(), checkfirst=True)
    leave_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "time_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("clock_in", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("clock_out", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pauses", JSON, server_default="[]"),
        sa.Column("net_minutes", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("justification", sa.Text(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("status", time_record_status, nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_time_records_workspace_id", "time_records", ["workspace_id"])
    op.create_index("ix_time_records_user_id", "time_records", ["user_id"])

    op.create_table(
        "leave_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("leave_type", leave_type_enum, nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", leave_status_enum, nullable=False, server_default="pendiente"),
        sa.Column("approved_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_leave_requests_workspace_id", "leave_requests", ["workspace_id"])
    op.create_index("ix_leave_requests_user_id", "leave_requests", ["user_id"])

    op.create_table(
        "public_holidays",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_public_holidays_workspace_id", "public_holidays", ["workspace_id"])
    op.create_unique_constraint("uq_public_holidays_workspace_date", "public_holidays", ["workspace_id", "date"])

    # Tasks: add client_id, due_time, source, source_ref
    op.add_column("tasks", sa.Column("client_id", UUID(as_uuid=True), nullable=True))
    op.add_column("tasks", sa.Column("due_time", sa.Time(), nullable=True))
    op.add_column("tasks", sa.Column("source", sa.String(50), nullable=False, server_default="manual"))
    op.add_column("tasks", sa.Column("source_ref", sa.String(255), nullable=True))
    op.create_index("ix_tasks_client_id", "tasks", ["client_id"])
    op.create_index(
        "ix_tasks_source_ref", "tasks", ["source_ref"],
        postgresql_where=sa.text("source_ref IS NOT NULL"),
    )
    op.create_foreign_key("fk_tasks_client_id", "tasks", "clients", ["client_id"], ["id"], ondelete="SET NULL")

    # MealPlan: add review_interval_days, next_review_date
    op.add_column("meal_plans", sa.Column("review_interval_days", sa.Integer(), nullable=True))
    op.add_column("meal_plans", sa.Column("next_review_date", sa.Date(), nullable=True))

    # WorkoutProgram: add review_interval_days, next_review_date
    op.add_column("workout_programs", sa.Column("review_interval_days", sa.Integer(), nullable=True))
    op.add_column("workout_programs", sa.Column("next_review_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("workout_programs", "next_review_date")
    op.drop_column("workout_programs", "review_interval_days")

    op.drop_column("meal_plans", "next_review_date")
    op.drop_column("meal_plans", "review_interval_days")

    op.drop_constraint("fk_tasks_client_id", "tasks", type_="foreignkey")
    op.drop_index("ix_tasks_source_ref", "tasks")
    op.drop_index("ix_tasks_client_id", "tasks")
    op.drop_column("tasks", "source_ref")
    op.drop_column("tasks", "source")
    op.drop_column("tasks", "due_time")
    op.drop_column("tasks", "client_id")

    op.drop_constraint("uq_public_holidays_workspace_date", "public_holidays")
    op.drop_table("public_holidays")
    op.drop_table("leave_requests")
    op.drop_table("time_records")

    sa.Enum(name="leave_status_enum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="leave_type_enum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="time_record_status").drop(op.get_bind(), checkfirst=True)
