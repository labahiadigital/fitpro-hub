"""Notification tasks for Celery."""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from uuid import UUID

from celery import shared_task
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_task(
    self,
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    from_name: Optional[str] = None,
    reply_to: Optional[str] = None,
    template_id: Optional[str] = None,
    template_params: Optional[Dict[str, Any]] = None,
):
    """Send an email via Brevo (Sendinblue)."""
    try:
        headers = {
            "api-key": settings.BREVO_API_KEY,
            "Content-Type": "application/json",
        }
        
        payload = {
            "sender": {
                "name": from_name or settings.EMAIL_FROM_NAME,
                "email": settings.EMAIL_FROM_ADDRESS,
            },
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_content,
        }
        
        if text_content:
            payload["textContent"] = text_content
        
        if reply_to:
            payload["replyTo"] = {"email": reply_to}
        
        if template_id:
            payload["templateId"] = int(template_id)
            if template_params:
                payload["params"] = template_params
        
        with httpx.Client() as client:
            response = client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers=headers,
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
        
        logger.info(f"Email sent successfully to {to_email}")
        return {"status": "sent", "to": to_email}
        
    except Exception as exc:
        logger.error(f"Failed to send email to {to_email}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3)
def send_booking_reminder(
    self,
    booking_id: str,
    client_email: str,
    client_name: str,
    booking_date: str,
    booking_time: str,
    service_name: str,
    professional_name: str,
    workspace_name: str,
    location: Optional[str] = None,
    meeting_url: Optional[str] = None,
):
    """Send a booking reminder email."""
    try:
        subject = f"Recordatorio: Tu sesión de {service_name} es mañana"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2D6A4F 0%, #40916C 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">{workspace_name}</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333;">¡Hola {client_name}!</h2>
                <p style="color: #666; font-size: 16px;">
                    Te recordamos que tienes una sesión programada:
                </p>
                <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>📅 Fecha:</strong> {booking_date}</p>
                    <p style="margin: 5px 0;"><strong>🕐 Hora:</strong> {booking_time}</p>
                    <p style="margin: 5px 0;"><strong>💪 Servicio:</strong> {service_name}</p>
                    <p style="margin: 5px 0;"><strong>👤 Profesional:</strong> {professional_name}</p>
                    {f'<p style="margin: 5px 0;"><strong>📍 Ubicación:</strong> {location}</p>' if location else ''}
                    {f'<p style="margin: 5px 0;"><a href="{meeting_url}" style="color: #2D6A4F;">🔗 Enlace a la videollamada</a></p>' if meeting_url else ''}
                </div>
                <p style="color: #666; font-size: 14px;">
                    Si necesitas cancelar o reprogramar, por favor hazlo con al menos 24 horas de antelación.
                </p>
            </div>
            <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
                <p>Este email fue enviado por {workspace_name} a través de FitPro Hub</p>
            </div>
        </body>
        </html>
        """
        
        return send_email_task.delay(
            to_email=client_email,
            subject=subject,
            html_content=html_content,
        )
        
    except Exception as exc:
        logger.error(f"Failed to send booking reminder for {booking_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task
def send_all_booking_reminders():
    """Send reminders for all bookings happening in the next 24 hours."""
    # This would query the database for upcoming bookings
    # and dispatch individual reminder tasks
    logger.info("Checking for bookings to send reminders...")
    # Implementation would go here
    return {"status": "completed", "reminders_sent": 0}


@shared_task(bind=True, max_retries=3)
def send_welcome_email(
    self,
    client_email: str,
    client_name: str,
    workspace_name: str,
    professional_name: str,
    login_url: Optional[str] = None,
):
    """Send welcome email to new client."""
    try:
        subject = f"¡Bienvenido/a a {workspace_name}!"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2D6A4F 0%, #40916C 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">¡Bienvenido/a!</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333;">Hola {client_name},</h2>
                <p style="color: #666; font-size: 16px;">
                    ¡Gracias por unirte a {workspace_name}! Estamos encantados de tenerte con nosotros.
                </p>
                <p style="color: #666; font-size: 16px;">
                    {professional_name} será tu profesional de referencia y te ayudará a alcanzar tus objetivos.
                </p>
                {f'''
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{login_url}" style="background: #2D6A4F; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Acceder a tu cuenta
                    </a>
                </div>
                ''' if login_url else ''}
                <p style="color: #666; font-size: 14px;">
                    Si tienes alguna pregunta, no dudes en contactarnos.
                </p>
            </div>
            <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
                <p>Este email fue enviado por {workspace_name}</p>
            </div>
        </body>
        </html>
        """
        
        return send_email_task.delay(
            to_email=client_email,
            subject=subject,
            html_content=html_content,
        )
        
    except Exception as exc:
        logger.error(f"Failed to send welcome email to {client_email}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3)
def send_payment_receipt(
    self,
    client_email: str,
    client_name: str,
    amount: float,
    currency: str,
    description: str,
    payment_date: str,
    workspace_name: str,
    invoice_url: Optional[str] = None,
):
    """Send payment receipt email."""
    try:
        subject = f"Recibo de pago - {workspace_name}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2D6A4F 0%, #40916C 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Recibo de Pago</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333;">Hola {client_name},</h2>
                <p style="color: #666; font-size: 16px;">
                    Hemos recibido tu pago correctamente. Aquí tienes los detalles:
                </p>
                <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Concepto:</strong> {description}</p>
                    <p style="margin: 5px 0;"><strong>Importe:</strong> {amount:.2f} {currency}</p>
                    <p style="margin: 5px 0;"><strong>Fecha:</strong> {payment_date}</p>
                </div>
                {f'''
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{invoice_url}" style="background: #2D6A4F; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Ver factura
                    </a>
                </div>
                ''' if invoice_url else ''}
                <p style="color: #666; font-size: 14px;">
                    ¡Gracias por confiar en nosotros!
                </p>
            </div>
            <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
                <p>{workspace_name}</p>
            </div>
        </body>
        </html>
        """
        
        return send_email_task.delay(
            to_email=client_email,
            subject=subject,
            html_content=html_content,
        )
        
    except Exception as exc:
        logger.error(f"Failed to send payment receipt to {client_email}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3)
def send_payment_failed_notification(
    self,
    client_email: str,
    client_name: str,
    amount: float,
    currency: str,
    description: str,
    workspace_name: str,
    update_payment_url: Optional[str] = None,
):
    """Send payment failed notification."""
    try:
        subject = f"Problema con tu pago - {workspace_name}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc3545; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Problema con tu pago</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333;">Hola {client_name},</h2>
                <p style="color: #666; font-size: 16px;">
                    No hemos podido procesar tu pago. Por favor, revisa los datos de tu método de pago.
                </p>
                <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #dc3545;">
                    <p style="margin: 5px 0;"><strong>Concepto:</strong> {description}</p>
                    <p style="margin: 5px 0;"><strong>Importe:</strong> {amount:.2f} {currency}</p>
                </div>
                {f'''
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{update_payment_url}" style="background: #2D6A4F; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Actualizar método de pago
                    </a>
                </div>
                ''' if update_payment_url else ''}
                <p style="color: #666; font-size: 14px;">
                    Si necesitas ayuda, contacta con nosotros.
                </p>
            </div>
        </body>
        </html>
        """
        
        return send_email_task.delay(
            to_email=client_email,
            subject=subject,
            html_content=html_content,
        )
        
    except Exception as exc:
        logger.error(f"Failed to send payment failed notification to {client_email}: {exc}")
        raise self.retry(exc=exc)


@shared_task
def clean_old_notifications():
    """Clean notifications older than 90 days."""
    logger.info("Cleaning old notifications...")
    # Implementation would delete old notifications from database
    return {"status": "completed", "deleted": 0}
