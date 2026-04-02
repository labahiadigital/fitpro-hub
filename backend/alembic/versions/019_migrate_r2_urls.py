"""Migrate exercise image URLs to new trackfiz-platform custom domain.

Covers all possible old URL patterns:
  - https://pub-9b395e0f2f6542b3ab0bd253607e8231.r2.dev  (old exercise-images bucket)
  - https://pub-242c7b3240bb4ef19469afbf242adcdd.r2.dev  (new trackfiz-platform r2.dev)

Both are replaced with the custom domain:
  - https://trackfiz-platform.trackfiz.com

Revision ID: 019_migrate_r2_urls
Revises: 018_add_documents_table
Create Date: 2026-03-26
"""
from alembic import op

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None

OLD_URLS = [
    "https://pub-9b395e0f2f6542b3ab0bd253607e8231.r2.dev",
    "https://pub-242c7b3240bb4ef19469afbf242adcdd.r2.dev",
]
NEW_URL = "https://trackfiz-platform.trackfiz.com"


def upgrade() -> None:
    for old in OLD_URLS:
        for col in ("image_url", "thumbnail_url"):
            op.execute(
                f"UPDATE exercises SET {col} = REPLACE({col}, '{old}', '{NEW_URL}') "
                f"WHERE {col} LIKE '{old}%'"
            )


def downgrade() -> None:
    original = OLD_URLS[0]
    for col in ("image_url", "thumbnail_url"):
        op.execute(
            f"UPDATE exercises SET {col} = REPLACE({col}, '{NEW_URL}', '{original}') "
            f"WHERE {col} LIKE '{NEW_URL}%'"
        )
