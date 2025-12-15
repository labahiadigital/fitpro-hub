"""
Email service using Brevo (formerly Sendinblue)
"""
from typing import List, Optional, Dict, Any
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

from app.core.config import settings


class EmailService:
    def __init__(self):
        self.configuration = sib_api_v3_sdk.Configuration()
        self.configuration.api_key['api-key'] = settings.BREVO_API_KEY
        self.api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
            sib_api_v3_sdk.ApiClient(self.configuration)
        )
    
    async def send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        reply_to: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> bool:
        """
        Send a transactional email using Brevo.
        """
        try:
            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=[{"email": to_email, "name": to_name}],
                sender={"email": settings.FROM_EMAIL, "name": settings.FROM_NAME},
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                reply_to={"email": reply_to} if reply_to else None,
                attachment=attachments,
            )
            
            self.api_instance.send_transac_email(send_smtp_email)
            return True
            
        except ApiException as e:
            print(f"Error sending email: {e}")
            return False
    
    async def send_template_email(
        self,
        to_email: str,
        to_name: str,
        template_id: int,
        params: Dict[str, Any],
    ) -> bool:
        """
        Send a transactional email using a Brevo template.
        """
        try:
            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=[{"email": to_email, "name": to_name}],
                template_id=template_id,
                params=params,
            )
            
            self.api_instance.send_transac_email(send_smtp_email)
            return True
            
        except ApiException as e:
            print(f"Error sending template email: {e}")
            return False
    
    async def send_bulk_email(
        self,
        recipients: List[Dict[str, str]],
        subject: str,
        html_content: str,
    ) -> bool:
        """
        Send bulk transactional emails.
        """
        try:
            for recipient in recipients:
                await self.send_email(
                    to_email=recipient["email"],
                    to_name=recipient.get("name", ""),
                    subject=subject,
                    html_content=html_content,
                )
            return True
            
        except Exception as e:
            print(f"Error sending bulk email: {e}")
            return False


# Email templates
class EmailTemplates:
    @staticmethod
    def welcome_email(name: str, workspace_name: str) -> str:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'DM Sans', Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #2D6A4F 0%, #40916C 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ color: white; margin: 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #2D6A4F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>¡Bienvenido a FitPro Hub!</h1>
                </div>
                <div class="content">
                    <p>Hola <strong>{name}</strong>,</p>
                    <p>Tu cuenta en <strong>{workspace_name}</strong> ha sido creada correctamente.</p>
                    <p>Con FitPro Hub podrás:</p>
                    <ul>
                        <li>Gestionar tus clientes y su progreso</li>
                        <li>Crear y asignar programas de entrenamiento</li>
                        <li>Diseñar planes de nutrición personalizados</li>
                        <li>Programar sesiones y gestionar tu calendario</li>
                        <li>Comunicarte con tus clientes por chat</li>
                        <li>Gestionar pagos y suscripciones</li>
                    </ul>
                    <p style="text-align: center;">
                        <a href="https://app.fitprohub.com/dashboard" class="button">Acceder al Dashboard</a>
                    </p>
                    <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                    <p>¡Éxito en tu camino!</p>
                    <p>El equipo de FitPro Hub</p>
                </div>
                <div class="footer">
                    <p>© 2024 FitPro Hub. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    @staticmethod
    def booking_confirmation(
        client_name: str,
        session_title: str,
        date: str,
        time: str,
        location: str,
        coach_name: str,
    ) -> str:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'DM Sans', Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #2D6A4F 0%, #40916C 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ color: white; margin: 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .details {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                .details-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }}
                .button {{ display: inline-block; background: #2D6A4F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Sesión Confirmada</h1>
                </div>
                <div class="content">
                    <p>Hola <strong>{client_name}</strong>,</p>
                    <p>Tu sesión ha sido confirmada. Aquí tienes los detalles:</p>
                    <div class="details">
                        <div class="details-row">
                            <span><strong>Sesión:</strong></span>
                            <span>{session_title}</span>
                        </div>
                        <div class="details-row">
                            <span><strong>Fecha:</strong></span>
                            <span>{date}</span>
                        </div>
                        <div class="details-row">
                            <span><strong>Hora:</strong></span>
                            <span>{time}</span>
                        </div>
                        <div class="details-row">
                            <span><strong>Ubicación:</strong></span>
                            <span>{location}</span>
                        </div>
                        <div class="details-row">
                            <span><strong>Entrenador:</strong></span>
                            <span>{coach_name}</span>
                        </div>
                    </div>
                    <p>Si necesitas cancelar o reprogramar, hazlo con al menos 24 horas de antelación.</p>
                    <p>¡Nos vemos pronto!</p>
                </div>
                <div class="footer">
                    <p>© 2024 FitPro Hub. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    @staticmethod
    def booking_reminder(
        client_name: str,
        session_title: str,
        date: str,
        time: str,
        hours_until: int,
    ) -> str:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'DM Sans', Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #F08A5D 0%, #FF6B35 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ color: white; margin: 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .highlight {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⏰ Recordatorio de Sesión</h1>
                </div>
                <div class="content">
                    <p>Hola <strong>{client_name}</strong>,</p>
                    <p>Te recordamos que tienes una sesión programada en <strong>{hours_until} horas</strong>:</p>
                    <div class="highlight">
                        <h2>{session_title}</h2>
                        <p><strong>{date}</strong> a las <strong>{time}</strong></p>
                    </div>
                    <p>¡Prepárate y nos vemos pronto!</p>
                </div>
                <div class="footer">
                    <p>© 2024 FitPro Hub. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """


# Singleton instance
email_service = EmailService()

