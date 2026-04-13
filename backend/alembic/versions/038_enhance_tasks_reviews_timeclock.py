"""Enhance tasks with client_id/due_time/source, add review_interval to plans/programs, add geolocation to time_records

Revision ID: 038
Revises: 037
Create Date: 2026-04-11
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "038"
down_revision = "037"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tasks: add client_id, due_time, source, source_ref
    op.add_column("tasks", sa.Column("client_id", UUID(as_uuid=True), nullable=True))
    op.add_column("tasks", sa.Column("due_time", sa.Time(), nullable=True))
    op.add_column("tasks", sa.Column("source", sa.String(50), nullable=False, server_default="manual"))
    op.add_column("tasks", sa.Column("source_ref", sa.String(255), nullable=True))
    op.create_index("ix_tasks_client_id", "tasks", ["client_id"])
    op.create_foreign_key("fk_tasks_client_id", "tasks", "clients", ["client_id"], ["id"], ondelete="SET NULL")

    # MealPlan: add review_interval_days, next_review_date
    op.add_column("meal_plans", sa.Column("review_interval_days", sa.Integer(), nullable=True))
    op.add_column("meal_plans", sa.Column("next_review_date", sa.Date(), nullable=True))

    # WorkoutProgram: add review_interval_days, next_review_date
    op.add_column("workout_programs", sa.Column("review_interval_days", sa.Integer(), nullable=True))
    op.add_column("workout_programs", sa.Column("next_review_date", sa.Date(), nullable=True))

    # TimeRecord: add justification, latitude, longitude, address
    op.add_column("time_records", sa.Column("justification", sa.Text(), nullable=True))
    op.add_column("time_records", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("time_records", sa.Column("longitude", sa.Float(), nullable=True))
    op.add_column("time_records", sa.Column("address", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("time_records", "address")
    op.drop_column("time_records", "longitude")
    op.drop_column("time_records", "latitude")
    op.drop_column("time_records", "justification")

    op.drop_column("workout_programs", "next_review_date")
    op.drop_column("workout_programs", "review_interval_days")

    op.drop_column("meal_plans", "next_review_date")
    op.drop_column("meal_plans", "review_interval_days")

    op.drop_constraint("fk_tasks_client_id", "tasks", type_="foreignkey")
    op.drop_index("ix_tasks_client_id", "tasks")
    op.drop_column("tasks", "source_ref")
    op.drop_column("tasks", "source")
    op.drop_column("tasks", "due_time")
    op.drop_column("tasks", "client_id")
