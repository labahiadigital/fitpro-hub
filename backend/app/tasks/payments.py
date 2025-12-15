"""Payment tasks for Celery."""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from uuid import UUID

from celery import shared_task
import stripe

from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def process_subscription_renewal(
    self,
    subscription_id: str,
    workspace_id: str,
):
    """Process a subscription renewal."""
    try:
        logger.info(f"Processing renewal for subscription {subscription_id}")
        
        # This would:
        # 1. Load subscription from database
        # 2. Create Stripe invoice or charge
        # 3. Update subscription status
        # 4. Send receipt email
        # 5. Log the transaction
        
        return {
            "status": "completed",
            "subscription_id": subscription_id,
        }
        
    except stripe.error.CardError as e:
        logger.error(f"Card error for subscription {subscription_id}: {e}")
        # Mark payment as failed and notify
        from app.tasks.notifications import send_payment_failed_notification
        # send_payment_failed_notification.delay(...)
        return {"status": "failed", "error": str(e)}
        
    except Exception as exc:
        logger.error(f"Failed to process renewal for {subscription_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task
def process_all_renewals():
    """Process all subscriptions due for renewal."""
    logger.info("Processing subscription renewals...")
    
    # This would:
    # 1. Query subscriptions with renewal_date <= now
    # 2. Dispatch individual renewal tasks
    
    return {"status": "completed", "renewals_processed": 0}


@shared_task
def check_expiring_subscriptions():
    """Check for subscriptions expiring soon and send reminders."""
    logger.info("Checking for expiring subscriptions...")
    
    # This would:
    # 1. Query subscriptions expiring in 7 days
    # 2. Send reminder emails
    # 3. Create tasks for follow-up
    
    return {"status": "completed", "reminders_sent": 0}


@shared_task(bind=True, max_retries=3)
def process_failed_payment_retry(
    self,
    payment_id: str,
    workspace_id: str,
    attempt_number: int = 1,
):
    """Retry a failed payment."""
    try:
        logger.info(f"Retrying payment {payment_id}, attempt {attempt_number}")
        
        # Stripe automatically retries, but we can also manually retry
        # This would:
        # 1. Load the failed payment
        # 2. Attempt to charge again
        # 3. Update status accordingly
        
        return {
            "status": "completed",
            "payment_id": payment_id,
            "attempt": attempt_number,
        }
        
    except Exception as exc:
        logger.error(f"Failed to retry payment {payment_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task
def retry_all_failed_payments():
    """Retry all failed payments that are eligible for retry."""
    logger.info("Retrying failed payments...")
    
    # This would:
    # 1. Query payments with status='failed' and retry_count < max_retries
    # 2. Dispatch individual retry tasks
    
    return {"status": "completed", "retries_dispatched": 0}


@shared_task(bind=True, max_retries=3)
def create_stripe_customer(
    self,
    client_id: str,
    email: str,
    name: str,
    workspace_id: str,
    metadata: Optional[Dict[str, Any]] = None,
):
    """Create a Stripe customer for a client."""
    try:
        logger.info(f"Creating Stripe customer for client {client_id}")
        
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={
                "client_id": client_id,
                "workspace_id": workspace_id,
                **(metadata or {}),
            },
        )
        
        # Update client with stripe_customer_id
        # This would be done via database update
        
        return {
            "status": "completed",
            "client_id": client_id,
            "stripe_customer_id": customer.id,
        }
        
    except Exception as exc:
        logger.error(f"Failed to create Stripe customer for {client_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3)
def create_stripe_subscription(
    self,
    client_id: str,
    stripe_customer_id: str,
    price_id: str,
    workspace_id: str,
    trial_days: int = 0,
    coupon_id: Optional[str] = None,
):
    """Create a Stripe subscription for a client."""
    try:
        logger.info(f"Creating Stripe subscription for customer {stripe_customer_id}")
        
        subscription_data = {
            "customer": stripe_customer_id,
            "items": [{"price": price_id}],
            "expand": ["latest_invoice.payment_intent"],
        }
        
        if trial_days > 0:
            subscription_data["trial_period_days"] = trial_days
        
        if coupon_id:
            subscription_data["coupon"] = coupon_id
        
        subscription = stripe.Subscription.create(**subscription_data)
        
        return {
            "status": "completed",
            "client_id": client_id,
            "stripe_subscription_id": subscription.id,
            "status": subscription.status,
        }
        
    except Exception as exc:
        logger.error(f"Failed to create subscription for {stripe_customer_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3)
def cancel_stripe_subscription(
    self,
    stripe_subscription_id: str,
    immediately: bool = False,
):
    """Cancel a Stripe subscription."""
    try:
        logger.info(f"Cancelling Stripe subscription {stripe_subscription_id}")
        
        if immediately:
            subscription = stripe.Subscription.delete(stripe_subscription_id)
        else:
            subscription = stripe.Subscription.modify(
                stripe_subscription_id,
                cancel_at_period_end=True,
            )
        
        return {
            "status": "completed",
            "stripe_subscription_id": stripe_subscription_id,
            "cancelled_at": subscription.canceled_at,
        }
        
    except Exception as exc:
        logger.error(f"Failed to cancel subscription {stripe_subscription_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3)
def process_stripe_webhook(
    self,
    event_type: str,
    event_data: Dict[str, Any],
):
    """Process a Stripe webhook event."""
    try:
        logger.info(f"Processing Stripe webhook: {event_type}")
        
        handlers = {
            "invoice.paid": handle_invoice_paid,
            "invoice.payment_failed": handle_invoice_payment_failed,
            "customer.subscription.created": handle_subscription_created,
            "customer.subscription.updated": handle_subscription_updated,
            "customer.subscription.deleted": handle_subscription_deleted,
            "payment_intent.succeeded": handle_payment_succeeded,
            "payment_intent.payment_failed": handle_payment_failed,
        }
        
        handler = handlers.get(event_type)
        if handler:
            return handler(event_data)
        else:
            logger.info(f"Unhandled webhook event: {event_type}")
            return {"status": "ignored", "event_type": event_type}
        
    except Exception as exc:
        logger.error(f"Failed to process webhook {event_type}: {exc}")
        raise self.retry(exc=exc)


def handle_invoice_paid(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle invoice.paid webhook."""
    invoice = event_data.get("object", {})
    logger.info(f"Invoice paid: {invoice.get('id')}")
    
    # Update payment status in database
    # Send receipt email
    
    return {"status": "processed", "invoice_id": invoice.get("id")}


def handle_invoice_payment_failed(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle invoice.payment_failed webhook."""
    invoice = event_data.get("object", {})
    logger.info(f"Invoice payment failed: {invoice.get('id')}")
    
    # Update payment status
    # Send failure notification
    
    return {"status": "processed", "invoice_id": invoice.get("id")}


def handle_subscription_created(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle customer.subscription.created webhook."""
    subscription = event_data.get("object", {})
    logger.info(f"Subscription created: {subscription.get('id')}")
    
    # Create subscription record in database
    
    return {"status": "processed", "subscription_id": subscription.get("id")}


def handle_subscription_updated(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle customer.subscription.updated webhook."""
    subscription = event_data.get("object", {})
    logger.info(f"Subscription updated: {subscription.get('id')}")
    
    # Update subscription record
    
    return {"status": "processed", "subscription_id": subscription.get("id")}


def handle_subscription_deleted(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle customer.subscription.deleted webhook."""
    subscription = event_data.get("object", {})
    logger.info(f"Subscription deleted: {subscription.get('id')}")
    
    # Mark subscription as cancelled
    
    return {"status": "processed", "subscription_id": subscription.get("id")}


def handle_payment_succeeded(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle payment_intent.succeeded webhook."""
    payment_intent = event_data.get("object", {})
    logger.info(f"Payment succeeded: {payment_intent.get('id')}")
    
    return {"status": "processed", "payment_intent_id": payment_intent.get("id")}


def handle_payment_failed(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle payment_intent.payment_failed webhook."""
    payment_intent = event_data.get("object", {})
    logger.info(f"Payment failed: {payment_intent.get('id')}")
    
    return {"status": "processed", "payment_intent_id": payment_intent.get("id")}
