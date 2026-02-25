"""Payment tasks for Celery – Redsys recurring (MIT) and Stripe stubs."""
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from uuid import UUID

from celery import shared_task

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Redsys recurring payment helpers (synchronous – called from Celery workers)
# ---------------------------------------------------------------------------

def _process_single_renewal_sync(subscription_id: str) -> Dict[str, Any]:
    """
    Process a single subscription renewal using Redsys MIT (server-to-server).

    Runs synchronously inside a Celery worker:
      1. Load subscription and verify it has a stored Redsys identifier.
      2. Create a new Payment record (pending).
      3. Send MIT request to Redsys REST API.
      4. On success: mark payment as succeeded, advance subscription period.
      5. On failure: mark payment as failed, set subscription to past_due.
    """
    import httpx
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.core.config import settings as app_settings
    from app.models.payment import Subscription, Payment, PaymentStatus, SubscriptionStatus
    from app.services.redsys import redsys_service, RedsysMITPayment, _decode_merchant_params

    db_url = str(app_settings.DATABASE_URL)
    if db_url.startswith("postgresql+asyncpg"):
        db_url = db_url.replace("postgresql+asyncpg", "postgresql+psycopg2", 1)

    engine = create_engine(db_url)
    session = Session(engine)

    try:
        sub = session.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not sub:
            return {"status": "error", "detail": "subscription not found"}

        if sub.status != SubscriptionStatus.active:
            return {"status": "skipped", "detail": f"subscription status is {sub.status}"}

        extra = sub.extra_data or {}
        identifier = extra.get("redsys_identifier")
        if not identifier:
            logger.warning(f"Subscription {subscription_id} has no redsys_identifier – cannot renew via MIT")
            return {"status": "skipped", "detail": "no redsys_identifier"}

        cof_txnid = extra.get("redsys_cof_txnid")
        amount_cents = int(round(float(sub.amount) * 100))
        order_id = redsys_service.generate_order_id()

        # Create pending payment
        payment = Payment(
            workspace_id=sub.workspace_id,
            client_id=sub.client_id,
            subscription_id=sub.id,
            description=f"Renovación: {sub.name}",
            amount=sub.amount,
            currency=sub.currency or "EUR",
            status=PaymentStatus.pending,
            payment_type="subscription",
            extra_data={
                "gateway": "redsys",
                "redsys_order_id": order_id,
                "redsys_environment": redsys_service.config.environment,
                "renewal": True,
                "subscription_id": str(sub.id),
            },
        )
        session.add(payment)
        session.flush()

        # Build MIT request
        mit = RedsysMITPayment(
            order_id=order_id,
            amount=amount_cents,
            identifier=identifier,
            description=f"Renovación: {sub.name}"[:125],
            cof_type="R",
            cof_txnid=cof_txnid,
        )
        req_data = redsys_service.create_mit_payment_request(mit)

        logger.info(
            f"Sending MIT renewal: order={order_id}, sub={subscription_id}, "
            f"amount={amount_cents}c"
        )

        # Send request to Redsys REST
        with httpx.Client(timeout=30.0) as http_client:
            response = http_client.post(
                req_data["rest_url"],
                json={
                    "Ds_SignatureVersion": req_data["Ds_SignatureVersion"],
                    "Ds_MerchantParameters": req_data["Ds_MerchantParameters"],
                    "Ds_Signature": req_data["Ds_Signature"],
                },
                headers={"Content-Type": "application/json"},
            )

        if response.status_code != 200:
            payment.status = PaymentStatus.failed
            payment.extra_data = {**payment.extra_data, "http_error": response.status_code}
            sub.status = SubscriptionStatus.past_due
            session.commit()
            return {"status": "failed", "detail": f"HTTP {response.status_code}"}

        resp_json = response.json()
        resp_params_b64 = resp_json.get("Ds_MerchantParameters", "")

        if not resp_params_b64:
            error_code = resp_json.get("errorCode", "UNKNOWN")
            payment.status = PaymentStatus.failed
            payment.extra_data = {**payment.extra_data, "redsys_error": error_code}
            sub.status = SubscriptionStatus.past_due
            session.commit()
            return {"status": "failed", "detail": f"Redsys error: {error_code}"}

        resp_params = _decode_merchant_params(resp_params_b64)
        resp_code = resp_params.get("Ds_Response", "9999")
        is_success = redsys_service.is_successful_response(resp_code)
        resp_message = redsys_service.get_response_code_message(resp_code)

        payment.extra_data = {
            **payment.extra_data,
            "redsys_response": resp_params,
            "redsys_response_code": resp_code,
            "redsys_response_message": resp_message,
            "redsys_auth_code": resp_params.get("Ds_AuthorisationCode", ""),
        }

        if is_success:
            payment.status = PaymentStatus.succeeded
            payment.paid_at = datetime.now(timezone.utc)

            # Advance subscription period
            from dateutil.relativedelta import relativedelta
            interval_map = {
                "month": relativedelta(months=1),
                "year": relativedelta(years=1),
                "week": timedelta(weeks=1),
            }
            delta = interval_map.get(sub.interval or "month", relativedelta(months=1))
            now = datetime.now(timezone.utc)
            sub.current_period_start = now
            sub.current_period_end = now + delta

            session.commit()
            logger.info(f"Renewal succeeded for sub {subscription_id}: next period ends {sub.current_period_end}")

            try:
                import asyncio
                from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession as _AsyncSession
                from app.services.auto_invoice import create_invoice_for_payment as _create_inv

                async_url = str(app_settings.DATABASE_URL)
                if not async_url.startswith("postgresql+asyncpg"):
                    async_url = async_url.replace("postgresql+psycopg2", "postgresql+asyncpg", 1)
                    async_url = async_url.replace("postgresql://", "postgresql+asyncpg://", 1)

                async def _gen_invoice():
                    eng = create_async_engine(async_url)
                    async with _AsyncSession(eng) as adb:
                        from sqlalchemy import select as _sel
                        from app.models.payment import Payment as _Pay
                        res = await adb.execute(_sel(_Pay).where(_Pay.id == payment.id))
                        pay = res.scalar_one_or_none()
                        if pay:
                            await _create_inv(adb, pay)
                            await adb.commit()
                    await eng.dispose()

                asyncio.run(_gen_invoice())
            except Exception as inv_err:
                logger.error(f"Auto-invoice failed for renewal payment {payment.id}: {inv_err}")

            return {"status": "succeeded", "order_id": order_id}
        else:
            payment.status = PaymentStatus.failed
            sub.status = SubscriptionStatus.past_due
            session.commit()
            logger.warning(f"Renewal failed for sub {subscription_id}: {resp_code} - {resp_message}")
            return {"status": "failed", "response_code": resp_code, "message": resp_message}

    except Exception as e:
        session.rollback()
        logger.error(f"Error processing renewal for {subscription_id}: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}
    finally:
        session.close()
        engine.dispose()


# ---------------------------------------------------------------------------
# Celery tasks
# ---------------------------------------------------------------------------

@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def process_subscription_renewal(self, subscription_id: str, workspace_id: str = ""):
    """Process a single subscription renewal via Redsys MIT."""
    try:
        return _process_single_renewal_sync(subscription_id)
    except Exception as exc:
        logger.error(f"Failed to process renewal for {subscription_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task
def process_all_renewals():
    """
    Process all active subscriptions that are past their current_period_end.
    Dispatches individual renewal tasks.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.core.config import settings as app_settings
    from app.models.payment import Subscription, SubscriptionStatus

    db_url = str(app_settings.DATABASE_URL)
    if db_url.startswith("postgresql+asyncpg"):
        db_url = db_url.replace("postgresql+asyncpg", "postgresql+psycopg2", 1)

    engine = create_engine(db_url)
    session = Session(engine)

    try:
        now = datetime.now(timezone.utc)
        subs = (
            session.query(Subscription)
            .filter(
                Subscription.status == SubscriptionStatus.active,
                Subscription.current_period_end <= now,
            )
            .all()
        )

        logger.info(f"Found {len(subs)} subscriptions due for renewal")

        dispatched = 0
        for sub in subs:
            extra = sub.extra_data or {}
            if not extra.get("redsys_identifier"):
                logger.info(f"Skipping sub {sub.id}: no redsys_identifier")
                continue
            process_subscription_renewal.delay(str(sub.id), str(sub.workspace_id))
            dispatched += 1

        return {"status": "completed", "found": len(subs), "dispatched": dispatched}

    except Exception as e:
        logger.error(f"Error in process_all_renewals: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}
    finally:
        session.close()
        engine.dispose()


@shared_task
def check_expiring_subscriptions():
    """Check for subscriptions expiring in the next 7 days and log them."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.core.config import settings as app_settings
    from app.models.payment import Subscription, SubscriptionStatus

    db_url = str(app_settings.DATABASE_URL)
    if db_url.startswith("postgresql+asyncpg"):
        db_url = db_url.replace("postgresql+asyncpg", "postgresql+psycopg2", 1)

    engine = create_engine(db_url)
    session = Session(engine)

    try:
        now = datetime.now(timezone.utc)
        week_from_now = now + timedelta(days=7)

        subs = (
            session.query(Subscription)
            .filter(
                Subscription.status == SubscriptionStatus.active,
                Subscription.current_period_end > now,
                Subscription.current_period_end <= week_from_now,
            )
            .all()
        )

        logger.info(f"Found {len(subs)} subscriptions expiring within 7 days")
        return {"status": "completed", "expiring_count": len(subs)}

    except Exception as e:
        logger.error(f"Error checking expiring subscriptions: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}
    finally:
        session.close()
        engine.dispose()


@shared_task(bind=True, max_retries=3)
def process_failed_payment_retry(self, payment_id: str, workspace_id: str = "", attempt_number: int = 1):
    """Retry a failed payment (placeholder for future retry logic)."""
    logger.info(f"Retrying payment {payment_id}, attempt {attempt_number}")
    return {"status": "completed", "payment_id": payment_id, "attempt": attempt_number}


@shared_task
def retry_all_failed_payments():
    """Retry all failed payments that are eligible for retry (placeholder)."""
    logger.info("Retrying failed payments...")
    return {"status": "completed", "retries_dispatched": 0}
