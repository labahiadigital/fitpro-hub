"""Celery tasks package."""
from app.tasks.celery_app import celery_app
from app.tasks.notifications import (
    send_email_task,
    send_booking_reminder,
    send_welcome_email,
    send_payment_receipt,
    send_payment_failed_notification,
)
from app.tasks.automations import (
    process_automation_trigger,
    run_scheduled_automation,
    process_client_onboarding,
)
from app.tasks.payments import (
    process_subscription_renewal,
    check_expiring_subscriptions,
    process_failed_payment_retry,
)
from app.tasks.reports import (
    generate_daily_report,
    generate_weekly_report,
    generate_monthly_report,
)

__all__ = [
    "celery_app",
    "send_email_task",
    "send_booking_reminder",
    "send_welcome_email",
    "send_payment_receipt",
    "send_payment_failed_notification",
    "process_automation_trigger",
    "run_scheduled_automation",
    "process_client_onboarding",
    "process_subscription_renewal",
    "check_expiring_subscriptions",
    "process_failed_payment_retry",
    "generate_daily_report",
    "generate_weekly_report",
    "generate_monthly_report",
]
