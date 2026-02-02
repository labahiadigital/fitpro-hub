"""
Kapso WhatsApp Business API Service

Este servicio maneja la comunicación con Kapso para:
- Gestión de customers (workspaces)
- Generación de setup links para conectar WhatsApp
- Envío de mensajes por WhatsApp
- Verificación de webhooks
"""
import hashlib
import hmac
import httpx
from typing import Optional
from datetime import datetime

from app.core.config import settings


class KapsoError(Exception):
    """Error de la API de Kapso"""
    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[dict] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class KapsoService:
    """
    Cliente para la API de Kapso
    
    Documentación: https://docs.kapso.ai
    """
    
    def __init__(self):
        self.api_key = settings.KAPSO_API_KEY
        self.base_url = settings.KAPSO_API_BASE_URL
        self.platform_url = f"{self.base_url}/platform/v1"
        self.whatsapp_url = f"{self.base_url}/meta/whatsapp/v24.0"
        self.webhook_secret = settings.KAPSO_WEBHOOK_SECRET
    
    def _get_headers(self) -> dict:
        """Headers comunes para todas las peticiones"""
        return {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def _request(
        self, 
        method: str, 
        url: str, 
        json: Optional[dict] = None,
        params: Optional[dict] = None
    ) -> dict:
        """Realizar petición HTTP a Kapso"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=method,
                url=url,
                headers=self._get_headers(),
                json=json,
                params=params
            )
            
            if response.status_code >= 400:
                try:
                    error_data = response.json()
                except Exception:
                    error_data = {"message": response.text}
                
                raise KapsoError(
                    message=error_data.get("message", f"Kapso API error: {response.status_code}"),
                    status_code=response.status_code,
                    details=error_data
                )
            
            return response.json()
    
    # ============ CUSTOMERS ============
    
    async def create_customer(
        self, 
        workspace_id: str, 
        workspace_name: str,
        external_id: Optional[str] = None
    ) -> dict:
        """
        Crear un customer en Kapso (representa un workspace)
        
        Args:
            workspace_id: UUID del workspace
            workspace_name: Nombre del workspace
            external_id: ID externo opcional (usamos workspace_id)
            
        Returns:
            dict con datos del customer incluyendo 'id'
        """
        payload = {
            "customer": {
                "name": workspace_name,
                "external_customer_id": external_id or str(workspace_id)
            }
        }
        
        response = await self._request(
            "POST",
            f"{self.platform_url}/customers",
            json=payload
        )
        
        return response.get("data", response)
    
    async def get_customer(self, customer_id: str) -> dict:
        """Obtener datos de un customer"""
        response = await self._request(
            "GET",
            f"{self.platform_url}/customers/{customer_id}"
        )
        return response.get("data", response)
    
    async def list_customers(self) -> list:
        """Listar todos los customers"""
        response = await self._request(
            "GET",
            f"{self.platform_url}/customers"
        )
        return response.get("data", [])
    
    # ============ SETUP LINKS ============
    
    async def generate_setup_link(
        self,
        customer_id: str,
        success_redirect_url: str,
        failure_redirect_url: str,
        language: str = "es",
        allowed_connection_types: Optional[list] = None,
        theme_config: Optional[dict] = None
    ) -> dict:
        """
        Generar setup link para que el customer conecte WhatsApp
        
        Args:
            customer_id: ID del customer en Kapso
            success_redirect_url: URL de redirección tras éxito
            failure_redirect_url: URL de redirección tras error
            language: Idioma de la página de setup (es, en, pt, etc.)
            allowed_connection_types: ["coexistence", "dedicated"] o uno solo
            theme_config: Colores personalizados
            
        Returns:
            dict con 'url', 'id', 'expires_at'
        """
        setup_link_config = {
            "success_redirect_url": success_redirect_url,
            "failure_redirect_url": failure_redirect_url,
            "language": language
        }
        
        if allowed_connection_types:
            setup_link_config["allowed_connection_types"] = allowed_connection_types
        
        if theme_config:
            setup_link_config["theme_config"] = theme_config
        
        payload = {"setup_link": setup_link_config}
        
        response = await self._request(
            "POST",
            f"{self.platform_url}/customers/{customer_id}/setup_links",
            json=payload
        )
        
        return response.get("data", response)
    
    # ============ PHONE NUMBERS ============
    
    async def get_phone_numbers(self, customer_id: Optional[str] = None) -> list:
        """
        Listar números de teléfono conectados
        
        Args:
            customer_id: Filtrar por customer (opcional)
        """
        params = {}
        if customer_id:
            params["customer_id"] = customer_id
        
        response = await self._request(
            "GET",
            f"{self.platform_url}/whatsapp/phone_numbers",
            params=params if params else None
        )
        
        return response.get("data", [])
    
    # ============ MENSAJES ============
    
    async def send_text_message(
        self,
        phone_number_id: str,
        to: str,
        body: str
    ) -> dict:
        """
        Enviar mensaje de texto por WhatsApp
        
        Args:
            phone_number_id: ID del número de WhatsApp del entrenador
            to: Número de destino (formato E.164, ej: +34612345678)
            body: Contenido del mensaje
            
        Returns:
            dict con 'messages' que contiene el message_id
        """
        # Limpiar el número de destino (quitar + y espacios)
        to_clean = to.replace("+", "").replace(" ", "").replace("-", "")
        
        payload = {
            "messaging_product": "whatsapp",
            "to": to_clean,
            "type": "text",
            "text": {
                "body": body
            }
        }
        
        response = await self._request(
            "POST",
            f"{self.whatsapp_url}/{phone_number_id}/messages",
            json=payload
        )
        
        return response
    
    async def send_template_message(
        self,
        phone_number_id: str,
        to: str,
        template_name: str,
        language_code: str = "es",
        components: Optional[list] = None
    ) -> dict:
        """
        Enviar mensaje de template por WhatsApp
        
        Args:
            phone_number_id: ID del número de WhatsApp
            to: Número de destino
            template_name: Nombre del template
            language_code: Código de idioma
            components: Parámetros del template
        """
        to_clean = to.replace("+", "").replace(" ", "").replace("-", "")
        
        payload = {
            "messaging_product": "whatsapp",
            "to": to_clean,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code}
            }
        }
        
        if components:
            payload["template"]["components"] = components
        
        response = await self._request(
            "POST",
            f"{self.whatsapp_url}/{phone_number_id}/messages",
            json=payload
        )
        
        return response
    
    async def send_interactive_buttons(
        self,
        phone_number_id: str,
        to: str,
        body_text: str,
        buttons: list[dict]
    ) -> dict:
        """
        Enviar mensaje con botones interactivos
        
        Args:
            phone_number_id: ID del número de WhatsApp
            to: Número de destino
            body_text: Texto del mensaje
            buttons: Lista de botones [{"id": "...", "title": "..."}]
        """
        to_clean = to.replace("+", "").replace(" ", "").replace("-", "")
        
        payload = {
            "messaging_product": "whatsapp",
            "to": to_clean,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body_text},
                "action": {
                    "buttons": [
                        {"type": "reply", "reply": btn}
                        for btn in buttons
                    ]
                }
            }
        }
        
        response = await self._request(
            "POST",
            f"{self.whatsapp_url}/{phone_number_id}/messages",
            json=payload
        )
        
        return response
    
    # ============ WEBHOOKS ============
    
    async def create_phone_webhook(
        self,
        phone_number_id: str,
        url: str,
        events: list[str]
    ) -> dict:
        """
        Crear webhook para eventos de un número de teléfono
        
        Args:
            phone_number_id: ID del número de WhatsApp
            url: URL del webhook
            events: Lista de eventos a suscribir
        """
        payload = {
            "url": url,
            "events": events,
            "kind": "kapso",
            "payload_version": "v2",
            "active": True
        }
        
        response = await self._request(
            "POST",
            f"{self.platform_url}/whatsapp/phone_numbers/{phone_number_id}/webhooks",
            json=payload
        )
        
        return response.get("data", response)
    
    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        secret: Optional[str] = None
    ) -> bool:
        """
        Verificar firma HMAC-SHA256 de un webhook
        
        Args:
            payload: Body raw del request
            signature: Valor del header X-Webhook-Signature
            secret: Secret del webhook (usa el default si no se proporciona)
            
        Returns:
            True si la firma es válida
        """
        secret_key = secret or self.webhook_secret
        if not secret_key:
            # Si no hay secret configurado, no podemos verificar
            return True
        
        expected_signature = hmac.new(
            secret_key.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)
    
    # ============ CONVERSACIONES ============
    
    async def get_conversations(
        self,
        phone_number_id: str,
        status: Optional[str] = None,
        limit: int = 50
    ) -> list:
        """
        Listar conversaciones de WhatsApp
        
        Args:
            phone_number_id: ID del número de WhatsApp
            status: Filtrar por estado (active, ended)
            limit: Número máximo de resultados
        """
        params = {
            "phone_number_id": phone_number_id,
            "per_page": limit
        }
        if status:
            params["status"] = status
        
        response = await self._request(
            "GET",
            f"{self.platform_url}/whatsapp/conversations",
            params=params
        )
        
        return response.get("data", [])
    
    async def get_messages(
        self,
        phone_number_id: str,
        conversation_id: Optional[str] = None,
        direction: Optional[str] = None,
        limit: int = 50
    ) -> list:
        """
        Listar mensajes de WhatsApp
        
        Args:
            phone_number_id: ID del número de WhatsApp
            conversation_id: Filtrar por conversación
            direction: Filtrar por dirección (inbound, outbound)
            limit: Número máximo de resultados
        """
        params = {
            "phone_number_id": phone_number_id,
            "per_page": limit
        }
        if conversation_id:
            params["conversation_id"] = conversation_id
        if direction:
            params["direction"] = direction
        
        response = await self._request(
            "GET",
            f"{self.platform_url}/whatsapp/messages",
            params=params
        )
        
        return response.get("data", [])


# Instancia singleton del servicio
kapso_service = KapsoService()
