"""
Redsys payment gateway integration service.

Supports two integration modes:
  1. Redirection: Customer is redirected to Redsys TPV to enter card data (PCI-DSS free).
     Used for standard payments where the customer is present.
  2. REST (MIT): Server-to-server calls for merchant-initiated transactions (subscriptions,
     recurring payments) where the customer is NOT present.

Signature algorithm: HMAC_SHA512_V2 with AES-CBC key diversification (current Redsys standard).
"""

import hashlib
import hmac
import base64
import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SIGNATURE_VERSION = "HMAC_SHA512_V2"

CURRENCY_EUR = "978"

# Transaction types
TXN_AUTHORIZATION = "0"          # Standard payment
TXN_PREAUTHORIZATION = "1"       # Pre-authorization
TXN_CONFIRMATION = "2"           # Confirm pre-auth
TXN_REFUND = "3"                 # Refund
TXN_RECURRING_INIT = "0"         # Initial recurring (COF_INI=S)
TXN_RECURRING_SUBSEQUENT = "0"   # Subsequent recurring (MIT)

# Consumer languages
LANG_SPANISH = "001"
LANG_ENGLISH = "002"
LANG_CATALAN = "003"
LANG_FRENCH = "004"
LANG_GERMAN = "005"
LANG_PORTUGUESE = "009"

# URLs
URLS = {
    "test": {
        "redirect": "https://sis-t.redsys.es:25443/sis/realizarPago",
        "rest_inicia": "https://sis-t.redsys.es:25443/sis/rest/iniciaPeticionREST",
        "rest_trata": "https://sis-t.redsys.es:25443/sis/rest/trataPeticionREST",
    },
    "production": {
        "redirect": "https://sis.redsys.es/sis/realizarPago",
        "rest_inicia": "https://sis.redsys.es/sis/rest/iniciaPeticionREST",
        "rest_trata": "https://sis.redsys.es/sis/rest/trataPeticionREST",
    },
}


class RedsysEnvironment(str, Enum):
    TEST = "test"
    PRODUCTION = "production"


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

class RedsysConfig(BaseModel):
    """Redsys configuration loaded from settings."""
    merchant_code: str
    terminal: str
    secret_key: str
    environment: str = "test"

    @property
    def urls(self) -> Dict[str, str]:
        return URLS.get(self.environment, URLS["test"])

    @property
    def redirect_url(self) -> str:
        return self.urls["redirect"]

    @property
    def rest_inicia_url(self) -> str:
        return self.urls["rest_inicia"]

    @property
    def rest_trata_url(self) -> str:
        return self.urls["rest_trata"]


# ---------------------------------------------------------------------------
# Payment models
# ---------------------------------------------------------------------------

class RedsysRedirectPayment(BaseModel):
    """Data needed to create a redirect-based payment."""
    order_id: str
    amount: int                    # Amount in cents (e.g. 1250 = 12.50 EUR)
    currency: str = CURRENCY_EUR
    description: str = ""
    merchant_url: str              # Notification URL (webhook)
    ok_url: str                    # Redirect on success
    ko_url: str                    # Redirect on failure
    consumer_language: str = LANG_SPANISH
    transaction_type: str = TXN_AUTHORIZATION
    merchant_data: str = ""        # Free field returned in notifications
    # COF (Credential on File) parameters for recurring payments
    identifier: Optional[str] = None    # "REQUIRED" to let Redsys generate token
    cof_ini: Optional[str] = None       # "S" for initial COF operation
    cof_type: Optional[str] = None      # "R" for recurring


class RedsysMITPayment(BaseModel):
    """Data for a merchant-initiated transaction (MIT) via REST."""
    order_id: str
    amount: int
    currency: str = CURRENCY_EUR
    identifier: str                # Token/reference of stored card
    description: str = ""
    transaction_type: str = TXN_AUTHORIZATION
    excep_sca: str = "MIT"
    cof_ini: str = "N"
    cof_type: str = "R"            # R=recurring
    cof_txnid: Optional[str] = None  # Ds_Merchant_Cof_Txnid from initial op
    direct_payment: str = "true"


class RedsysRefund(BaseModel):
    """Data for a refund operation."""
    order_id: str                  # NEW unique order for the refund
    original_amount: int           # Amount to refund in cents
    currency: str = CURRENCY_EUR
    transaction_type: str = TXN_REFUND


# ---------------------------------------------------------------------------
# Cryptographic helpers (HMAC_SHA512_V2)
# ---------------------------------------------------------------------------

def _normalize_key(raw_key: str) -> bytes:
    """
    Normalize the secret key to exactly 16 bytes for AES-128-CBC.
    - If < 16 chars, pad with zeros on the right.
    - If > 16 chars, take the first 16.
    """
    key_str = raw_key[:16] if len(raw_key) > 16 else raw_key.ljust(16, '0')
    return key_str.encode("utf-8")


def _diversify_key(secret_key: str, order_id: str) -> bytes:
    """
    Generate operation-specific key via AES-128-CBC encryption of the order_id
    with the merchant's secret key, using a zero IV.
    
    This is the "key diversification" step required by Redsys HMAC_SHA512_V2.
    """
    key_bytes = _normalize_key(secret_key)
    iv = b'\x00' * 16  # AES block size = 16
    cipher = AES.new(key_bytes, AES.MODE_CBC, iv=iv)
    padded_order = pad(order_id.encode("utf-8"), AES.block_size)
    encrypted = cipher.encrypt(padded_order)
    return encrypted


def _sign_hmac_sha512(diversified_key: bytes, data: str) -> str:
    """
    Compute HMAC-SHA512 of data using the diversified key,
    then encode the result as base64url (no padding).
    
    IMPORTANT: Per Redsys manual v4.1, the HMAC key is the base64-encoded
    string of the diversified key (as UTF-8 bytes), NOT the raw AES output.
    """
    # The HMAC key must be the base64 string representation of the diversified key
    key_b64_str = base64.b64encode(diversified_key).decode("utf-8")
    mac = hmac.new(key_b64_str.encode("utf-8"), data.encode("utf-8"), hashlib.sha512).digest()
    # base64url encoding (replace +/ with -_, strip padding =)
    b64 = base64.b64encode(mac).decode("utf-8")
    return b64.replace("+", "-").replace("/", "_").rstrip("=")


def _encode_merchant_params(params: Dict[str, Any]) -> str:
    """Minify JSON and encode as base64url."""
    json_str = json.dumps(params, separators=(",", ":"))
    b64 = base64.b64encode(json_str.encode("utf-8")).decode("utf-8")
    # base64url
    return b64.replace("+", "-").replace("/", "_").rstrip("=")


def _decode_merchant_params(b64_data: str) -> Dict[str, Any]:
    """Decode base64url merchant parameters to dict."""
    # Restore standard base64
    b64 = b64_data.replace("-", "+").replace("_", "/")
    # Add padding
    padding = 4 - len(b64) % 4
    if padding != 4:
        b64 += "=" * padding
    decoded = base64.b64decode(b64).decode("utf-8")
    return json.loads(decoded)


# ---------------------------------------------------------------------------
# Main Service
# ---------------------------------------------------------------------------

class RedsysService:
    """Service for Redsys payment gateway integration."""

    def __init__(self, config: Optional[RedsysConfig] = None):
        self.config = config or RedsysConfig(
            merchant_code=settings.REDSYS_MERCHANT_CODE or "",
            terminal=settings.REDSYS_TERMINAL or "001",
            secret_key=settings.REDSYS_SECRET_KEY or "",
            environment=settings.REDSYS_ENVIRONMENT or "test",
        )

    # ----- Order ID generation -----

    def generate_order_id(self) -> str:
        """
        Generate a unique order ID for Redsys.
        Rules: 4-12 alphanumeric characters, first 4 must be digits.
        """
        now = datetime.now()
        prefix = now.strftime("%y%m")  # 4 digits: YYMM
        suffix = f"{now.second:02d}{uuid.uuid4().int % 100000:05d}"
        order_id = f"{prefix}{suffix}"[:12]
        return order_id

    # ----- Signature generation & verification -----

    def _generate_signature(self, merchant_params_b64: str, order_id: str) -> str:
        """Generate HMAC_SHA512_V2 signature."""
        diversified_key = _diversify_key(self.config.secret_key, order_id)
        return _sign_hmac_sha512(diversified_key, merchant_params_b64)

    def _verify_signature(self, merchant_params_b64: str, received_signature: str) -> bool:
        """Verify the signature received from Redsys."""
        try:
            params = _decode_merchant_params(merchant_params_b64)
            # Redsys notification uses "Ds_Order", our own params use "DS_MERCHANT_ORDER"
            order_id = (
                params.get("Ds_Order")
                or params.get("DS_MERCHANT_ORDER")
                or ""
            )
            expected = self._generate_signature(merchant_params_b64, order_id)

            # Normalize both for comparison (handle base64 vs base64url differences)
            def normalize(s: str) -> str:
                return s.replace("-", "+").replace("_", "/").rstrip("=")

            return hmac.compare_digest(normalize(expected), normalize(received_signature))
        except Exception as e:
            logger.error(f"Error verifying Redsys signature: {e}")
            return False

    # ----- Redirect-based payment (standard) -----

    def create_redirect_payment(self, payment: RedsysRedirectPayment) -> Dict[str, str]:
        """
        Create form parameters for a redirect-based payment.
        
        Returns dict with:
          - Ds_SignatureVersion
          - Ds_MerchantParameters
          - Ds_Signature
          - redsys_url (the form action URL)
        """
        merchant_params = {
            "DS_MERCHANT_AMOUNT": str(payment.amount),
            "DS_MERCHANT_ORDER": payment.order_id,
            "DS_MERCHANT_MERCHANTCODE": self.config.merchant_code,
            "DS_MERCHANT_CURRENCY": payment.currency,
            "DS_MERCHANT_TRANSACTIONTYPE": payment.transaction_type,
            "DS_MERCHANT_TERMINAL": self.config.terminal,
            "DS_MERCHANT_MERCHANTURL": payment.merchant_url,
            "DS_MERCHANT_URLOK": payment.ok_url,
            "DS_MERCHANT_URLKO": payment.ko_url,
            "DS_MERCHANT_CONSUMERLANGUAGE": payment.consumer_language,
        }

        if payment.description:
            merchant_params["DS_MERCHANT_PRODUCTDESCRIPTION"] = payment.description[:125]

        if payment.merchant_data:
            merchant_params["DS_MERCHANT_MERCHANTDATA"] = payment.merchant_data[:1024]

        # COF (Credential on File) params for recurring/subscription payments
        if payment.identifier:
            merchant_params["DS_MERCHANT_IDENTIFIER"] = payment.identifier
        if payment.cof_ini:
            merchant_params["DS_MERCHANT_COF_INI"] = payment.cof_ini
        if payment.cof_type:
            merchant_params["DS_MERCHANT_COF_TYPE"] = payment.cof_type

        params_b64 = _encode_merchant_params(merchant_params)
        signature = self._generate_signature(params_b64, payment.order_id)

        return {
            "Ds_SignatureVersion": SIGNATURE_VERSION,
            "Ds_MerchantParameters": params_b64,
            "Ds_Signature": signature,
            "redsys_url": self.config.redirect_url,
        }

    # ----- MIT payment (REST, server-to-server) -----

    def create_mit_payment_request(self, payment: RedsysMITPayment) -> Dict[str, str]:
        """
        Create JSON body for a MIT (Merchant Initiated Transaction) via REST.
        
        Returns dict with Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature
        and the URL to POST to.
        """
        merchant_params = {
            "DS_MERCHANT_AMOUNT": str(payment.amount),
            "DS_MERCHANT_ORDER": payment.order_id,
            "DS_MERCHANT_MERCHANTCODE": self.config.merchant_code,
            "DS_MERCHANT_CURRENCY": payment.currency,
            "DS_MERCHANT_TRANSACTIONTYPE": payment.transaction_type,
            "DS_MERCHANT_TERMINAL": self.config.terminal,
            "DS_MERCHANT_IDENTIFIER": payment.identifier,
            "DS_MERCHANT_COF_INI": payment.cof_ini,
            "DS_MERCHANT_COF_TYPE": payment.cof_type,
            "DS_MERCHANT_DIRECTPAYMENT": payment.direct_payment,
            "DS_MERCHANT_EXCEP_SCA": payment.excep_sca,
        }

        if payment.cof_txnid:
            merchant_params["DS_MERCHANT_COF_TXNID"] = payment.cof_txnid

        if payment.description:
            merchant_params["DS_MERCHANT_PRODUCTDESCRIPTION"] = payment.description[:125]

        params_b64 = _encode_merchant_params(merchant_params)
        signature = self._generate_signature(params_b64, payment.order_id)

        return {
            "Ds_SignatureVersion": SIGNATURE_VERSION,
            "Ds_MerchantParameters": params_b64,
            "Ds_Signature": signature,
            "rest_url": self.config.rest_trata_url,
        }

    # ----- Refund (REST) -----

    def create_refund_request(self, refund: RedsysRefund) -> Dict[str, str]:
        """
        Create JSON body for a refund operation via REST.
        """
        merchant_params = {
            "DS_MERCHANT_AMOUNT": str(refund.original_amount),
            "DS_MERCHANT_ORDER": refund.order_id,
            "DS_MERCHANT_MERCHANTCODE": self.config.merchant_code,
            "DS_MERCHANT_CURRENCY": refund.currency,
            "DS_MERCHANT_TRANSACTIONTYPE": refund.transaction_type,
            "DS_MERCHANT_TERMINAL": self.config.terminal,
        }

        params_b64 = _encode_merchant_params(merchant_params)
        signature = self._generate_signature(params_b64, refund.order_id)

        return {
            "Ds_SignatureVersion": SIGNATURE_VERSION,
            "Ds_MerchantParameters": params_b64,
            "Ds_Signature": signature,
            "rest_url": self.config.rest_trata_url,
        }

    # ----- Notification handling -----

    def verify_notification(self, params_b64: str, signature: str) -> Optional[Dict[str, Any]]:
        """
        Verify and decode a notification from Redsys.
        
        Returns decoded parameters if signature is valid, None otherwise.
        """
        if self._verify_signature(params_b64, signature):
            return _decode_merchant_params(params_b64)
        logger.warning("Redsys notification signature verification failed")
        return None

    # ----- Response code helpers -----

    @staticmethod
    def is_successful_response(response_code: str) -> bool:
        """Check if a response code indicates success (0000-0099)."""
        try:
            code = int(response_code)
            return 0 <= code <= 99
        except (ValueError, TypeError):
            return False

    @staticmethod
    def get_response_code_message(code: str) -> str:
        """Get human-readable message for Redsys response code."""
        messages = {
            "0000": "Transacción aprobada",
            "0001": "Transacción aprobada previa identificación del titular",
            "0002": "Transacción aprobada (operación de recogida de efectivo)",
            "0099": "Operación frictionless aprobada",
            "0101": "Tarjeta caducada",
            "0102": "Tarjeta en excepción transitoria o bajo sospecha de fraude",
            "0104": "Operación no permitida para esa tarjeta o terminal",
            "0106": "Intentos de PIN excedidos",
            "0116": "Disponible insuficiente",
            "0118": "Tarjeta no registrada",
            "0125": "Tarjeta no efectiva",
            "0129": "Código de seguridad (CVV2/CVC2) incorrecto",
            "0172": "Denegada – la marca ordena no repetir",
            "0173": "Denegada – la marca ordena no repetir sin actualizar datos",
            "0174": "Denegada – la marca ordena no repetir hasta 72h",
            "0180": "Tarjeta ajena al servicio",
            "0184": "Error en la autenticación del titular",
            "0190": "Denegación sin especificar motivo",
            "0191": "Fecha de caducidad errónea",
            "0202": "Tarjeta en excepción transitoria o bajo sospecha de fraude",
            "0904": "Comercio no registrado en FUC",
            "0909": "Error de sistema",
            "0912": "Emisor no disponible",
            "0913": "Pedido repetido",
            "0944": "Sesión incorrecta",
            "0950": "Operación de devolución no permitida",
            "9064": "Número de posiciones del CVV2/CVC2 incorrecto",
            "9078": "No existe método de pago válido para esa tarjeta",
            "9093": "Tarjeta no existente",
            "9094": "Rechazo servidores internacionales",
            "9104": "Operación rechazada por el comercio",
            "9218": "El comercio no permite operaciones seguras por entrada/telefonía",
            "9253": "Tarjeta no cumple el check-digit",
            "9256": "El comercio no puede realizar preautorizaciones",
            "9257": "Esta tarjeta no permite operativa de preautorizaciones",
            "9261": "Operación detenida por superar el control de restricciones",
            "9915": "A petición del usuario se ha cancelado el pago",
            "9929": "Anulación de autorización en diferido realizada por el comercio",
            "9997": "Se está procesando otra transacción con la misma tarjeta",
            "9998": "Operación en proceso de solicitud de datos de tarjeta",
            "9999": "Operación redirigida al emisor a autenticar",
        }
        return messages.get(code, f"Código de respuesta desconocido: {code}")


# Singleton
redsys_service = RedsysService()
