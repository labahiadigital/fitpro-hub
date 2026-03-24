"""Enhance recipes table with professional fields

Revision ID: 017
Revises: 016
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("recipes", sa.Column("category", sa.Text(), nullable=True))
    op.add_column("recipes", sa.Column("tags", ARRAY(sa.Text()), server_default="{}"))
    op.add_column("recipes", sa.Column("servings", sa.Integer(), server_default="1"))
    op.add_column("recipes", sa.Column("prep_time_minutes", sa.Integer(), nullable=True))
    op.add_column("recipes", sa.Column("cook_time_minutes", sa.Integer(), nullable=True))
    op.add_column("recipes", sa.Column("difficulty", sa.Text(), nullable=True))
    op.add_column("recipes", sa.Column("image_url", sa.Text(), nullable=True))
    op.add_column("recipes", sa.Column("notes", sa.Text(), nullable=True))
    op.add_column("recipes", sa.Column("is_public", sa.Boolean(), server_default="false"))
    op.add_column("recipes", sa.Column("is_global", sa.Boolean(), server_default="false"))
    op.add_column("recipes", sa.Column("total_fiber", sa.Numeric(), server_default="0"))
    op.add_column("recipes", sa.Column("total_sugar", sa.Numeric(), server_default="0"))


def downgrade():
    op.drop_column("recipes", "total_sugar")
    op.drop_column("recipes", "total_fiber")
    op.drop_column("recipes", "is_global")
    op.drop_column("recipes", "is_public")
    op.drop_column("recipes", "notes")
    op.drop_column("recipes", "image_url")
    op.drop_column("recipes", "difficulty")
    op.drop_column("recipes", "cook_time_minutes")
    op.drop_column("recipes", "prep_time_minutes")
    op.drop_column("recipes", "servings")
    op.drop_column("recipes", "tags")
    op.drop_column("recipes", "category")
