"""
Celery application for background tasks.

This is the SINGLE source of truth for the Celery instance.
All task modules should import from here: ``from app.celery_app import celery_app``
Docker containers use ``-A app.celery_app``.
"""
import logging
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

logger = logging.getLogger(__name__)

_broker = settings.celery_broker
_backend = settings.celery_backend

logger.info("Celery broker  → %s", _broker.split("@")[-1] if "@" in _broker else _broker)
logger.info("Celery backend → %s", _backend.split("@")[-1] if "@" in _backend else _backend)

celery_app = Celery(
    "fitprohub",
    broker=_broker,
    backend=_backend,
    include=[
        "app.tasks.notifications",
        "app.tasks.automations",
        "app.tasks.reports",
        "app.tasks.payments",
        "app.tasks.reminders",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Madrid",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=240,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    broker_connection_retry_on_startup=True,
)

celery_app.conf.task_routes = {
    "app.tasks.notifications.*": {"queue": "notifications"},
    "app.tasks.automations.*": {"queue": "automations"},
    "app.tasks.reports.*": {"queue": "reports"},
    "app.tasks.payments.*": {"queue": "payments"},
}

celery_app.conf.beat_schedule = {
    "send-booking-reminders": {
        "task": "app.tasks.notifications.send_all_booking_reminders",
        "schedule": crontab(minute="*/15"),
        "options": {"queue": "notifications"},
    },
    "check-expiring-subscriptions": {
        "task": "app.tasks.payments.check_expiring_subscriptions",
        "schedule": crontab(hour=6, minute=0),
        "options": {"queue": "payments"},
    },
    "process-subscription-renewals": {
        "task": "app.tasks.payments.process_all_renewals",
        "schedule": crontab(minute=0),
        "options": {"queue": "payments"},
    },
    "retry-failed-payments": {
        "task": "app.tasks.payments.retry_all_failed_payments",
        "schedule": crontab(hour="*/6", minute=30),
        "options": {"queue": "payments"},
    },
    "run-scheduled-automations": {
        "task": "app.tasks.automations.run_all_scheduled_automations",
        "schedule": crontab(minute="*/5"),
        "options": {"queue": "automations"},
    },
    "check-inactive-clients": {
        "task": "app.tasks.automations.check_inactive_clients",
        "schedule": crontab(hour=9, minute=0),
        "options": {"queue": "automations"},
    },
    "generate-daily-report": {
        "task": "app.tasks.reports.generate_daily_report",
        "schedule": crontab(hour=0, minute=5),
        "options": {"queue": "reports"},
    },
    "generate-weekly-report": {
        "task": "app.tasks.reports.generate_weekly_report",
        "schedule": crontab(hour=7, minute=0, day_of_week=1),
        "options": {"queue": "reports"},
    },
    "generate-monthly-report": {
        "task": "app.tasks.reports.generate_monthly_report",
        "schedule": crontab(hour=7, minute=0, day_of_month=1),
        "options": {"queue": "reports"},
    },
    "clean-old-notifications": {
        "task": "app.tasks.notifications.clean_old_notifications",
        "schedule": crontab(hour=3, minute=0, day_of_week=0),
        "options": {"queue": "notifications"},
    },
    "process-due-reminders": {
        "task": "process_due_reminders",
        "schedule": crontab(minute=0),
    },
}
