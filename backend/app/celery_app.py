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
    # --- Serialization ---
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # gzip anything above 1 KB. Many of our payloads are HTML email templates
    # that compress 70-90% and this trims Redis memory and broker bandwidth.
    task_compression="gzip",
    result_compression="gzip",

    # --- Time ---
    timezone="Europe/Madrid",
    enable_utc=True,

    # --- Task execution ---
    task_track_started=True,
    task_time_limit=300,          # Hard kill after 5 minutes.
    task_soft_time_limit=240,     # Raise SoftTimeLimitExceeded after 4 minutes.
    task_acks_late=True,          # Only ack after success -> redelivery on worker crash.
    task_reject_on_worker_lost=True,
    # Reasonable default for retries: exponential-ish up to 5 minutes.
    task_default_rate_limit=None,

    # --- Results ---
    # Redis accumulates task results forever by default. 24h is plenty for our
    # flows (we don't poll results across days) and keeps Redis memory flat.
    result_expires=24 * 60 * 60,
    result_extended=True,         # Include task name + args in result metadata.

    # --- Workers ---
    worker_prefetch_multiplier=1, # Don't let one worker hog a batch from Redis.
    worker_max_tasks_per_child=500,  # Recycle worker after N tasks to mitigate leaks.
    worker_max_memory_per_child=300_000,  # KB (300 MB) — recycle if RSS crosses this.
    worker_send_task_events=False,    # We don't consume events; saves broker traffic.
    worker_cancel_long_running_tasks_on_connection_loss=True,

    # --- Broker ---
    broker_connection_retry_on_startup=True,
    broker_pool_limit=10,         # Per-process broker connection pool.
    # Visibility timeout: if a worker takes more than this to ack a task, Redis
    # redelivers it. Must be >= task_time_limit or long tasks get duplicated.
    broker_transport_options={
        "visibility_timeout": 600,           # 10 minutes, > our 5m hard limit.
        "socket_keepalive": True,
        "health_check_interval": 30,
    },
    result_backend_transport_options={
        "visibility_timeout": 600,
        "socket_keepalive": True,
        "health_check_interval": 30,
        # Retry result-backend operations so a momentary Redis blip doesn't
        # drop a finished task's result on the floor.
        "retry_on_timeout": True,
    },
)

celery_app.conf.task_routes = {
    "app.tasks.notifications.*": {"queue": "notifications"},
    "app.tasks.automations.*": {"queue": "automations"},
    "app.tasks.reports.*": {"queue": "reports"},
    "app.tasks.payments.*": {"queue": "payments"},
    "app.tasks.reminders.*": {"queue": "notifications"},
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
        "task": "app.tasks.reminders.process_due_reminders",
        "schedule": crontab(minute=0),
        "options": {"queue": "notifications"},
    },
}
