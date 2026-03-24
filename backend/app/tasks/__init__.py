"""Celery tasks package."""
from app.tasks.celery_app import celery_app
from app.tasks.notifications import (
    send_email_task,
    send_booking_reminder,
    send_all_booking_reminders,
    send_welcome_email,
    send_payment_receipt,
    send_payment_failed_notification,
    clean_old_notifications,
)
from app.tasks.automations import (
    process_automation_trigger,
    run_scheduled_automation,
    run_all_scheduled_automations,
    process_client_onboarding,
    check_inactive_clients,
    trigger_client_event,
    call_webhook,
)
from app.tasks.payments import (
    process_subscription_renewal,
    process_all_renewals,
    check_expiring_subscriptions,
    process_failed_payment_retry,
    retry_all_failed_payments,
)
from app.tasks.reports import (
    generate_daily_report,
    generate_weekly_report,
    generate_monthly_report,
    generate_client_progress_report,
    generate_team_performance_report,
    export_data_csv,
    calculate_workspace_metrics,
)
from app.tasks.reminders import (
    process_due_reminders,
    create_default_reminders_for_client,
)

__all__ = [
    "celery_app",
    "send_email_task",
    "send_booking_reminder",
    "send_all_booking_reminders",
    "send_welcome_email",
    "send_payment_receipt",
    "send_payment_failed_notification",
    "clean_old_notifications",
    "process_automation_trigger",
    "run_scheduled_automation",
    "run_all_scheduled_automations",
    "process_client_onboarding",
    "check_inactive_clients",
    "trigger_client_event",
    "call_webhook",
    "process_subscription_renewal",
    "process_all_renewals",
    "check_expiring_subscriptions",
    "process_failed_payment_retry",
    "retry_all_failed_payments",
    "generate_daily_report",
    "generate_weekly_report",
    "generate_monthly_report",
    "generate_client_progress_report",
    "generate_team_performance_report",
    "export_data_csv",
    "calculate_workspace_metrics",
    "process_due_reminders",
    "create_default_reminders_for_client",
]
