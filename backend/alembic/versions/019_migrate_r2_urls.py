"""Migrate exercise image URLs from old R2 bucket to new trackfiz-platform bucket.

Revision ID: 019_migrate_r2_urls
Revises: 018_add_documents_table
Create Date: 2026-03-26
"""
from alembic import op

revision = "019_migrate_r2_urls"
down_revision = "018_add_documents_table"
branch_labels = None
depends_on = None

OLD_URL = "https://pub-9b395e0f2f6542b3ab0bd253607e8231.r2.dev"
NEW_URL = "https://pub-242c7b3240bb4ef19469afbf242adcdd.r2.dev"


def upgrade() -> None:
    op.execute(
        f"UPDATE exercises SET image_url = REPLACE(image_url, '{OLD_URL}', '{NEW_URL}') "
        f"WHERE image_url LIKE '{OLD_URL}%'"
    )
    op.execute(
        f"UPDATE exercises SET thumbnail_url = REPLACE(thumbnail_url, '{OLD_URL}', '{NEW_URL}') "
        f"WHERE thumbnail_url LIKE '{OLD_URL}%'"
    )


def downgrade() -> None:
    op.execute(
        f"UPDATE exercises SET image_url = REPLACE(image_url, '{NEW_URL}', '{OLD_URL}') "
        f"WHERE image_url LIKE '{NEW_URL}%'"
    )
    op.execute(
        f"UPDATE exercises SET thumbnail_url = REPLACE(thumbnail_url, '{NEW_URL}', '{OLD_URL}') "
        f"WHERE thumbnail_url LIKE '{NEW_URL}%'"
    )
