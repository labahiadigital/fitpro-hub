"""
SeQura payment gateway integration service.

Implements the SeQura Checkout API flow:
  1. Start Solicitation - POST /orders with order payload
  2. Get Identification Form - GET /orders/<uuid>/form_v2
  3. Confirm/Hold Order via IPN - PUT /orders/<uuid>
  4. Register Order Reference - PUT /orders/<uuid> with merchant_reference

Uses HTTP Basic Auth. All amounts are in cents (e.g. 1250 = 12.50 EUR).
"""

import logging
import platform as _platform
import time as _time
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import Optional, Dict, Any, List

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class SequraConfig:
    """SeQura configuration loaded from settings."""

    def __init__(self):
        self.user = settings.SEQURA_USER
        self.password = settings.SEQURA_PASSWORD
        self.merchant_id = settings.SEQURA_MERCHANT_ID
        self.endpoint = settings.SEQURA_ENDPOINT.rstrip("/")
        self.asset_key = settings.SEQURA_ASSET_KEY
        self.environment = settings.SEQURA_ENVIRONMENT

    @property
    def is_configured(self) -> bool:
        return bool(self.user and self.password and self.merchant_id)

    @property
    def orders_url(self) -> str:
        return f"{self.endpoint}/orders"

    @property
    def script_uri(self) -> str:
        if self.environment == "production":
            return "https://live.sequracdn.com/assets/sequra-checkout.min.js"
        return "https://sandbox.sequracdn.com/assets/sequra-checkout.min.js"


class SequraService:
    """Service for SeQura payment gateway integration."""

    def __init__(self, config: Optional[SequraConfig] = None):
        self.config = config or SequraConfig()

    def _auth(self) -> tuple[str, str]:
        return (self.config.user, self.config.password)

    @staticmethod
    def compute_service_end_date(
        interval: Optional[str] = None,
        interval_count: int = 1,
        product_type: str = "subscription",
    ) -> str:
        """
        Compute the service end date from product interval data.

        For subscriptions: uses interval (month/year/week) * interval_count.
        For one_time/package: defaults to 1 year.
        Fallback: 1 year from now.
        """
        now = datetime.now()

        if product_type == "subscription" and interval:
            interval_lower = interval.lower()
            if interval_lower in ("month", "monthly"):
                return (now + relativedelta(months=interval_count)).strftime("%Y-%m-%d")
            elif interval_lower in ("year", "yearly", "annual"):
                return (now + relativedelta(years=interval_count)).strftime("%Y-%m-%d")
            elif interval_lower in ("week", "weekly"):
                return (now + timedelta(weeks=interval_count)).strftime("%Y-%m-%d")
            elif interval_lower in ("day", "daily"):
                return (now + timedelta(days=interval_count)).strftime("%Y-%m-%d")

        return (now + relativedelta(years=1)).strftime("%Y-%m-%d")

    async def start_solicitation(self, order_data: Dict[str, Any]) -> Optional[str]:
        """
        Start a SeQura solicitation by POSTing order data.

        Returns the order URI from the Location header on success, None on failure.
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.config.orders_url,
                json={"order": order_data},
                auth=self._auth(),
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            )

        logger.info(f"SeQura start_solicitation: status={response.status_code}")

        if response.status_code == 204:
            location = response.headers.get("Location", "")
            logger.info(f"SeQura solicitation OK: uri={location}")
            return location

        if 200 <= response.status_code <= 299:
            location = response.headers.get("Location", "")
            logger.info(f"SeQura solicitation OK ({response.status_code}): uri={location}")
            return location

        if response.status_code == 409:
            try:
                error_body = response.json()
                errors = error_body.get("errors", [])
                logger.warning(f"SeQura solicitation conflict: {errors}")
            except Exception:
                logger.warning(f"SeQura solicitation conflict: {response.text}")
            return None

        logger.error(f"SeQura solicitation failed: {response.status_code} - {response.text}")
        return None

    async def get_identification_form(
        self, order_uri: str, product: str = "pp3", ajax: bool = False
    ) -> Optional[str]:
        """
        Fetch the identification form HTML for a given order and product.

        Returns the HTML string on success, None on failure.
        """
        params = {
            "product": product,
            "ajax": "true" if ajax else "false",
        }

        form_url = f"{order_uri}/form_v2"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                form_url,
                params=params,
                auth=self._auth(),
                headers={"Accept": "text/html"},
            )

        if 200 <= response.status_code <= 299:
            return response.text

        logger.error(f"SeQura get_identification_form failed: {response.status_code} - {response.text}")
        return None

    async def update_order(self, order_uri: str, order_data: Dict[str, Any]) -> tuple[bool, Optional[Dict]]:
        """
        Update (confirm/hold) an order via PUT.

        Returns (success, response_json). On 409 (cart changed), success=False.
        """
        if not order_uri.startswith("http"):
            order_uri = f"{self.config.orders_url}/{order_uri}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.put(
                order_uri,
                json={"order": order_data},
                auth=self._auth(),
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            )

        if 200 <= response.status_code <= 299:
            logger.info(f"SeQura update_order OK: {response.status_code}")
            return True, None

        if response.status_code == 409:
            try:
                body = response.json()
            except Exception:
                body = {"error": response.text}
            logger.warning(f"SeQura update_order conflict: {body}")
            return False, body

        logger.error(f"SeQura update_order failed: {response.status_code} - {response.text}")
        return False, None

    async def get_payment_methods(self, order_id: str) -> Optional[List[Dict]]:
        """
        Get available payment methods for a given order.
        GET /orders/{order_id}/payment_methods
        """
        url = f"{self.config.orders_url}/{order_id}/payment_methods"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                url,
                auth=self._auth(),
                headers={"Accept": "application/json"},
            )

        if 200 <= response.status_code <= 299:
            return response.json()

        logger.error(f"SeQura get_payment_methods failed: {response.status_code}")
        return None

    async def get_credit_agreements(self, amount_cents: int) -> Optional[List[Dict]]:
        """
        Get credit agreements (installment options) for a given amount.
        Used to display installment info before checkout.
        """
        url = (
            f"{self.config.endpoint}/merchants/{self.config.merchant_id}"
            f"/credit_agreements?total_with_tax={amount_cents}&currency=EUR&locale=es-ES&country=ES"
        )

        logger.info(f"SeQura get_credit_agreements: url={url}, amount={amount_cents}")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    auth=self._auth(),
                    headers={"Accept": "application/json"},
                )

            logger.info(f"SeQura get_credit_agreements: status={response.status_code}")

            if 200 <= response.status_code <= 299:
                data = response.json()
                logger.info(f"SeQura credit_agreements response: {type(data).__name__}, keys={list(data.keys()) if isinstance(data, dict) else len(data)}")
                return data

            logger.error(f"SeQura get_credit_agreements failed: {response.status_code} - {response.text[:500]}")
            return None
        except Exception as e:
            logger.error(f"SeQura get_credit_agreements exception: {e}")
            return None

    def build_order_payload(
        self,
        *,
        amount_cents: int,
        product_name: str,
        product_reference: str,
        customer_first_name: str,
        customer_last_name: str,
        customer_email: str,
        customer_phone: str = "",
        customer_nin: str = "",
        notify_url: str,
        return_url: str,
        abort_url: str = "",
        state: Optional[str] = None,
        order_ref_1: Optional[str] = None,
        ip_address: str = "127.0.0.1",
        user_agent: str = "Mozilla/5.0",
        service_end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Build the order payload following SeQura's API structure.
        Amounts are in cents.
        service_end_date should be ISO 8601 date (YYYY-MM-DD).
        """
        merchant: Dict[str, Any] = {
            "id": self.config.merchant_id,
            "notify_url": notify_url,
            "return_url": return_url,
        }
        if abort_url:
            merchant["abort_url"] = abort_url

        cart = {
            "cart_ref": f"cart_{product_reference}_{int(_time.time())}",
            "currency": "EUR",
            "delivery_method": {"name": "Digital", "days": "Inmediato"},
            "gift": False,
            "order_total_with_tax": amount_cents,
            "order_total_without_tax": amount_cents,
            "items": [
                {
                    "type": "service",
                    "reference": product_reference,
                    "name": product_name,
                    "price_with_tax": amount_cents,
                    "price_without_tax": amount_cents,
                    "quantity": 1,
                    "total_with_tax": amount_cents,
                    "total_without_tax": amount_cents,
                    "downloadable": False,
                    "perishable": False,
                    "personalized": False,
                    "category": "Fitness",
                    "product_id": product_reference,
                    "ends_on": service_end_date or self.compute_service_end_date(),
                }
            ],
        }

        customer = {
            "given_names": customer_first_name,
            "surnames": customer_last_name,
            "email": customer_email,
            "logged_in": False,
            "language_code": "es",
            "ip_number": ip_address,
            "user_agent": user_agent,
        }
        if customer_phone:
            customer["phone"] = customer_phone
        if customer_nin:
            customer["nin"] = customer_nin
            customer["vat_number"] = customer_nin

        address = {
            "given_names": customer_first_name,
            "surnames": customer_last_name,
            "company": "",
            "address_line_1": "N/A",
            "address_line_2": "",
            "postal_code": "28001",
            "city": "Madrid",
            "country_code": "ES",
        }
        if customer_phone:
            address["mobile_phone"] = customer_phone

        gui = {"layout": "desktop"}

        platform = {
            "name": "Trackfiz",
            "version": "1.0.0",
            "plugin_version": "1.0.0",
            "uname": _platform.platform(),
            "db_name": "PostgreSQL",
            "db_version": "15",
        }

        order: Dict[str, Any] = {
            "state": state or "confirmed",
            "merchant": merchant,
            "cart": cart,
            "delivery_address": address,
            "invoice_address": address,
            "customer": customer,
            "gui": gui,
            "platform": platform,
        }

        if order_ref_1:
            order["merchant_reference"] = {"order_ref_1": order_ref_1}

        return _remove_nulls(order)


def _remove_nulls(data: Any) -> Any:
    """Recursively remove None values from dicts (matches SeQura PHP client behavior)."""
    if isinstance(data, dict):
        return {k: _remove_nulls(v) for k, v in data.items() if v is not None}
    if isinstance(data, list):
        return [_remove_nulls(item) for item in data]
    return data


# Singleton
sequra_service = SequraService()
