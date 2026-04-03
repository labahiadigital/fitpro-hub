"""Add duration_weeks column to meal_plans and migrate plan structure to weeks

Revision ID: 022
Revises: 021
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = '022'
down_revision = '021'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('meal_plans', sa.Column('duration_weeks', sa.Integer(), server_default='1', nullable=False))

    conn = op.get_bind()
    conn.execute(sa.text(
        "UPDATE meal_plans SET duration_weeks = GREATEST(1, CEIL(duration_days::float / 7)::int)"
    ))

    rows = conn.execute(sa.text(
        "SELECT id, plan FROM meal_plans WHERE plan IS NOT NULL"
    )).fetchall()

    for row in rows:
        plan = row[1]
        if plan and isinstance(plan, dict) and "days" in plan and "weeks" not in plan:
            new_plan = {"weeks": [{"week": 1, "days": plan["days"]}]}
            conn.execute(
                sa.text("UPDATE meal_plans SET plan = :plan WHERE id = :id"),
                {"plan": sa.type_coerce(new_plan, JSONB), "id": row[0]}
            )


def downgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.text(
        "SELECT id, plan FROM meal_plans WHERE plan IS NOT NULL"
    )).fetchall()

    for row in rows:
        plan = row[1]
        if plan and isinstance(plan, dict) and "weeks" in plan:
            weeks = plan.get("weeks", [])
            all_days = weeks[0].get("days", []) if weeks else []
            old_plan = {"days": all_days}
            conn.execute(
                sa.text("UPDATE meal_plans SET plan = :plan WHERE id = :id"),
                {"plan": sa.type_coerce(old_plan, JSONB), "id": row[0]}
            )

    op.drop_column('meal_plans', 'duration_weeks')
