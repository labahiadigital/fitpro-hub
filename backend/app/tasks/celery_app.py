"""Celery application configuration."""
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "fitprohub",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.notifications",
        "app.tasks.automations",
        "app.tasks.payments",
        "app.tasks.reports",
    ],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max
    task_soft_time_limit=240,  # 4 minutes soft limit
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)

# Task routing - separate queues for different task types
celery_app.conf.task_routes = {
    "app.tasks.notifications.*": {"queue": "notifications"},
    "app.tasks.payments.*": {"queue": "payments"},
    "app.tasks.automations.*": {"queue": "automations"},
    "app.tasks.reports.*": {"queue": "reports"},
}

# Celery Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    # Send booking reminders every 15 minutes
    "send-booking-reminders": {
        "task": "app.tasks.notifications.send_all_booking_reminders",
        "schedule": crontab(minute="*/15"),
        "options": {"queue": "notifications"},
    },
    # Check for expiring subscriptions daily at 6 AM
    "check-expiring-subscriptions": {
        "task": "app.tasks.payments.check_expiring_subscriptions",
        "schedule": crontab(hour=6, minute=0),
        "options": {"queue": "payments"},
    },
    # Process subscription renewals every hour
    "process-subscription-renewals": {
        "task": "app.tasks.payments.process_all_renewals",
        "schedule": crontab(minute=0),
        "options": {"queue": "payments"},
    },
    # Retry failed payments every 6 hours
    "retry-failed-payments": {
        "task": "app.tasks.payments.retry_all_failed_payments",
        "schedule": crontab(hour="*/6", minute=30),
        "options": {"queue": "payments"},
    },
    # Run scheduled automations every 5 minutes
    "run-scheduled-automations": {
        "task": "app.tasks.automations.run_all_scheduled_automations",
        "schedule": crontab(minute="*/5"),
        "options": {"queue": "automations"},
    },
    # Check for inactive clients daily at 9 AM
    "check-inactive-clients": {
        "task": "app.tasks.automations.check_inactive_clients",
        "schedule": crontab(hour=9, minute=0),
        "options": {"queue": "automations"},
    },
    # Generate daily report at midnight
    "generate-daily-report": {
        "task": "app.tasks.reports.generate_daily_report",
        "schedule": crontab(hour=0, minute=5),
        "options": {"queue": "reports"},
    },
    # Generate weekly report on Monday at 7 AM
    "generate-weekly-report": {
        "task": "app.tasks.reports.generate_weekly_report",
        "schedule": crontab(hour=7, minute=0, day_of_week=1),
        "options": {"queue": "reports"},
    },
    # Generate monthly report on 1st of month at 7 AM
    "generate-monthly-report": {
        "task": "app.tasks.reports.generate_monthly_report",
        "schedule": crontab(hour=7, minute=0, day_of_month=1),
        "options": {"queue": "reports"},
    },
    # Clean old notifications weekly
    "clean-old-notifications": {
        "task": "app.tasks.notifications.clean_old_notifications",
        "schedule": crontab(hour=3, minute=0, day_of_week=0),
        "options": {"queue": "notifications"},
    },
}

