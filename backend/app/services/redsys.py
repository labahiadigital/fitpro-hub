"""Redsys payment gateway integration service."""
import hashlib
import hmac
import base64
import json
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
from pydantic import BaseModel

from app.core.config import settings


class RedsysConfig(BaseModel):
    """Redsys configuration."""
    merchant_code: str
    terminal: str
    secret_key: str
    environment: str = "test"  # test or production
    
    @property
    def base_url(self) -> str:
        if self.environment == "production":
            return "https://sis.redsys.es/sis/realizarPago"
        return "https://sis-t.redsys.es:25443/sis/realizarPago"


class RedsysPayment(BaseModel):
    """Redsys payment request."""
    order_id: str
    amount: int  # Amount in cents
    currency: str = "978"  # EUR
    description: str
    merchant_url: str  # Notification URL
    ok_url: str
    ko_url: str
    consumer_language: str = "001"  # Spanish
    transaction_type: str = "0"  # Authorization


class RedsysService:
    """Service for Redsys payment gateway integration."""
    
    def __init__(self, config: Optional[RedsysConfig] = None):
        self.config = config or RedsysConfig(
            merchant_code=settings.REDSYS_MERCHANT_CODE or "",
            terminal=settings.REDSYS_TERMINAL or "1",
            secret_key=settings.REDSYS_SECRET_KEY or "",
            environment=settings.REDSYS_ENVIRONMENT or "test"
        )
    
    def _encode_base64(self, data: str) -> str:
        """Encode string to base64."""
        return base64.b64encode(data.encode()).decode()
    
    def _decode_base64(self, data: str) -> str:
        """Decode base64 string."""
        return base64.b64decode(data).decode()
    
    def _encrypt_3des(self, key: bytes, data: str) -> bytes:
        """Encrypt data using 3DES."""
        try:
            from Crypto.Cipher import DES3
            from Crypto.Util.Padding import pad
            
            cipher = DES3.new(key, DES3.MODE_CBC, iv=b'\x00' * 8)
            padded_data = pad(data.encode(), DES3.block_size)
            return cipher.encrypt(padded_data)
        except ImportError:
            # Fallback if pycryptodome is not installed
            import warnings
            warnings.warn("pycryptodome not installed, using HMAC fallback")
            return hmac.new(key, data.encode(), hashlib.sha256).digest()
    
    def _generate_signature(self, merchant_params: str, order_id: str) -> str:
        """Generate HMAC-SHA256 signature for Redsys."""
        # Decode the secret key from base64
        key = base64.b64decode(self.config.secret_key)
        
        # Encrypt the order with 3DES
        encrypted_key = self._encrypt_3des(key, order_id)
        
        # Generate HMAC-SHA256
        signature = hmac.new(
            encrypted_key,
            merchant_params.encode(),
            hashlib.sha256
        ).digest()
        
        return base64.b64encode(signature).decode()
    
    def generate_order_id(self) -> str:
        """Generate a unique order ID for Redsys (max 12 chars, alphanumeric)."""
        timestamp = datetime.now().strftime("%y%m%d%H%M")
        unique_suffix = str(uuid.uuid4().int)[:2]
        return f"{timestamp}{unique_suffix}"
    
    def create_payment_request(self, payment: RedsysPayment) -> Dict[str, str]:
        """
        Create a payment request for Redsys.
        
        Returns:
            Dictionary with Ds_SignatureVersion, Ds_MerchantParameters, and Ds_Signature
        """
        # Build merchant parameters
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
            "DS_MERCHANT_PRODUCTDESCRIPTION": payment.description,
        }
        
        # Encode parameters to base64
        params_json = json.dumps(merchant_params)
        params_base64 = self._encode_base64(params_json)
        
        # Generate signature
        signature = self._generate_signature(params_base64, payment.order_id)
        
        return {
            "Ds_SignatureVersion": "HMAC_SHA256_V1",
            "Ds_MerchantParameters": params_base64,
            "Ds_Signature": signature,
            "redsys_url": self.config.base_url
        }
    
    def verify_notification(self, params_base64: str, signature: str) -> Optional[Dict[str, Any]]:
        """
        Verify a notification from Redsys.
        
        Args:
            params_base64: Base64 encoded merchant parameters
            signature: Signature from Redsys
            
        Returns:
            Decoded parameters if signature is valid, None otherwise
        """
        try:
            # Decode parameters
            params_json = self._decode_base64(params_base64)
            params = json.loads(params_json)
            
            # Get order ID
            order_id = params.get("Ds_Order", "")
            
            # Generate expected signature
            expected_signature = self._generate_signature(params_base64, order_id)
            
            # Compare signatures (URL-safe base64)
            signature_clean = signature.replace("-", "+").replace("_", "/")
            expected_clean = expected_signature.replace("-", "+").replace("_", "/")
            
            if hmac.compare_digest(signature_clean, expected_clean):
                return params
            
            return None
            
        except Exception:
            return None
    
    def get_response_code_message(self, code: str) -> str:
        """Get human-readable message for Redsys response code."""
        messages = {
            "0000": "Transacción aprobada",
            "0001": "Transacción aprobada previa identificación del titular",
            "0002": "Transacción aprobada para operaciones de recogida de efectivo",
            "0101": "Tarjeta caducada",
            "0102": "Tarjeta en excepción transitoria o bajo sospecha de fraude",
            "0104": "Operación no permitida para esa tarjeta o terminal",
            "0106": "Intentos de PIN excedidos",
            "0116": "Disponible insuficiente",
            "0118": "Tarjeta no registrada",
            "0125": "Tarjeta no efectiva",
            "0129": "Código de seguridad (CVV2/CVC2) incorrecto",
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
            "9218": "El comercio no permite operaciones seguras por entrada /telefonía",
            "9253": "Tarjeta no cumple el check-digit",
            "9256": "El comercio no puede realizar preautorizaciones",
            "9257": "Esta tarjeta no permite operativa de preautorizaciones",
            "9261": "Operación detenida por superar el control de restricciones",
            "9915": "A]petición del usuario se ha cancelado el pago",
            "9929": "Anulación de autorización en diferido realizada por el comercio",
            "9997": "Se está procesando otra transacción en SIS con la misma tarjeta",
            "9998": "Operación en proceso de solicitud de datos de tarjeta",
            "9999": "Operación que ha sido redirigida al emisor a autenticar",
        }
        return messages.get(code, f"Código de respuesta desconocido: {code}")
    
    def is_successful_response(self, response_code: str) -> bool:
        """Check if a response code indicates success."""
        try:
            code = int(response_code)
            return code >= 0 and code <= 99
        except ValueError:
            return False


# Create a singleton instance
redsys_service = RedsysService()
