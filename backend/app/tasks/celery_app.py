"""Re-export the single Celery instance to keep backward-compatible imports."""
from app.celery_app import celery_app  # noqa: F401

__all__ = ["celery_app"]
