"""Add composite indexes for frequently queried patterns

Revision ID: 027
Revises: 026
Create Date: 2026-04-10
"""
from alembic import op

revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_workout_programs_client_template_active",
        "workout_programs",
        ["client_id", "is_template", "is_active"],
    )
    op.create_index(
        "ix_meal_plans_client_template_active",
        "meal_plans",
        ["client_id", "is_template", "is_active"],
    )


def downgrade() -> None:
    op.drop_index("ix_meal_plans_client_template_active", table_name="meal_plans")
    op.drop_index("ix_workout_programs_client_template_active", table_name="workout_programs")
