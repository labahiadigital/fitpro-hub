"""
Celery application for background tasks
"""
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "fitprohub",
    broker=settings.celery_broker,
    backend=settings.celery_backend,
    include=[
        "app.tasks.notifications",
        "app.tasks.automations",
        "app.tasks.reports",
        "app.tasks.payments",
    ],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Madrid",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)

# Task routing
celery_app.conf.task_routes = {
    "app.tasks.notifications.*": {"queue": "notifications"},
    "app.tasks.automations.*": {"queue": "automations"},
    "app.tasks.reports.*": {"queue": "reports"},
    "app.tasks.payments.*": {"queue": "payments"},
}

# Periodic tasks (Celery Beat)
celery_app.conf.beat_schedule = {
    # Send booking reminders every 15 minutes
    "send-booking-reminders": {
        "task": "app.tasks.notifications.send_booking_reminders",
        "schedule": crontab(minute="*/15"),
    },
    # Process subscription renewals daily at 6 AM
    "process-subscription-renewals": {
        "task": "app.tasks.payments.process_subscription_renewals",
        "schedule": crontab(hour=6, minute=0),
    },
    # Check for inactive clients weekly on Monday at 9 AM
    "check-inactive-clients": {
        "task": "app.tasks.automations.check_inactive_clients",
        "schedule": crontab(hour=9, minute=0, day_of_week=1),
    },
    # Generate weekly reports on Sunday at 8 PM
    "generate-weekly-reports": {
        "task": "app.tasks.reports.generate_weekly_reports",
        "schedule": crontab(hour=20, minute=0, day_of_week=0),
    },
}

