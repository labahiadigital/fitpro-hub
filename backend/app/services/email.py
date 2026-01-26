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
    def email_confirmation(name: str, confirmation_url: str) -> str:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirma tu cuenta - Trackfiz</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
                            <!-- Header con gradiente -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #2D6A4F 0%, #40916C 50%, #52B788 100%); padding: 40px 30px; text-align: center;">
                                    <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Trackfiz</h1>
                                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Tu plataforma de entrenamiento personal</p>
                                </td>
                            </tr>
                            
                            <!-- Contenido -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <h2 style="margin: 0 0 20px 0; color: #1a1a2e; font-size: 24px; font-weight: 600; text-align: center;">
                                        ¡Confirma tu cuenta!
                                    </h2>
                                    
                                    <p style="margin: 0 0 15px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                        Hola <strong style="color: #2D6A4F;">{name}</strong>,
                                    </p>
                                    
                                    <p style="margin: 0 0 25px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                        Gracias por registrarte en Trackfiz. Para completar tu registro y empezar a usar la plataforma, confirma tu dirección de email haciendo clic en el botón:
                                    </p>
                                    
                                    <!-- Botón CTA -->
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                                        <tr>
                                            <td align="center">
                                                <a href="{confirmation_url}" style="display: inline-block; background: linear-gradient(135deg, #2D6A4F 0%, #40916C 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(45, 106, 79, 0.4); transition: transform 0.2s;">
                                                    Confirmar mi cuenta
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <p style="margin: 25px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                                        Si el botón no funciona, copia y pega este enlace en tu navegador:
                                    </p>
                                    <p style="margin: 10px 0 0 0; color: #2D6A4F; font-size: 12px; word-break: break-all; text-align: center; background: #f0fdf4; padding: 12px; border-radius: 8px;">
                                        {confirmation_url}
                                    </p>
                                    
                                    <p style="margin: 25px 0 0 0; color: #a0aec0; font-size: 13px; text-align: center;">
                                        Este enlace expirará en 24 horas.
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background: #f8fafc; padding: 25px 30px; border-top: 1px solid #e2e8f0;">
                                    <p style="margin: 0; color: #718096; font-size: 13px; text-align: center; line-height: 1.5;">
                                        Si no creaste esta cuenta, puedes ignorar este email.
                                    </p>
                                    <p style="margin: 15px 0 0 0; color: #a0aec0; font-size: 12px; text-align: center;">
                                        © 2026 Trackfiz. Todos los derechos reservados.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
    
    @staticmethod
    def password_reset(name: str, reset_url: str) -> str:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Restablecer contraseña - Trackfiz</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
                            <!-- Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #2D6A4F 0%, #40916C 50%, #52B788 100%); padding: 40px 30px; text-align: center;">
                                    <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Trackfiz</h1>
                                </td>
                            </tr>
                            
                            <!-- Contenido -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <h2 style="margin: 0 0 20px 0; color: #1a1a2e; font-size: 24px; font-weight: 600; text-align: center;">
                                        Restablecer contraseña
                                    </h2>
                                    
                                    <p style="margin: 0 0 15px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                        Hola <strong style="color: #2D6A4F;">{name}</strong>,
                                    </p>
                                    
                                    <p style="margin: 0 0 25px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                        Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para crear una nueva contraseña:
                                    </p>
                                    
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                                        <tr>
                                            <td align="center">
                                                <a href="{reset_url}" style="display: inline-block; background: linear-gradient(135deg, #2D6A4F 0%, #40916C 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(45, 106, 79, 0.4);">
                                                    Restablecer contraseña
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <p style="margin: 25px 0 0 0; color: #a0aec0; font-size: 13px; text-align: center;">
                                        Este enlace expirará en 1 hora.
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background: #f8fafc; padding: 25px 30px; border-top: 1px solid #e2e8f0;">
                                    <p style="margin: 0; color: #718096; font-size: 13px; text-align: center; line-height: 1.5;">
                                        Si no solicitaste restablecer tu contraseña, ignora este email.
                                    </p>
                                    <p style="margin: 15px 0 0 0; color: #a0aec0; font-size: 12px; text-align: center;">
                                        © 2026 Trackfiz. Todos los derechos reservados.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
    
    @staticmethod
    def magic_link(name: str, magic_link_url: str) -> str:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Acceso rápido - Trackfiz</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
                            <tr>
                                <td style="background: linear-gradient(135deg, #2D6A4F 0%, #40916C 50%, #52B788 100%); padding: 40px 30px; text-align: center;">
                                    <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700;">Trackfiz</h1>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <h2 style="margin: 0 0 20px 0; color: #1a1a2e; font-size: 24px; font-weight: 600; text-align: center;">
                                        Tu enlace de acceso
                                    </h2>
                                    <p style="margin: 0 0 15px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                        Hola <strong style="color: #2D6A4F;">{name}</strong>,
                                    </p>
                                    <p style="margin: 0 0 25px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                        Haz clic en el siguiente botón para acceder a tu cuenta:
                                    </p>
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                                        <tr>
                                            <td align="center">
                                                <a href="{magic_link_url}" style="display: inline-block; background: linear-gradient(135deg, #2D6A4F 0%, #40916C 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(45, 106, 79, 0.4);">
                                                    Acceder a Trackfiz
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                    <p style="margin: 25px 0 0 0; color: #a0aec0; font-size: 13px; text-align: center;">
                                        Este enlace expirará en 1 hora.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="background: #f8fafc; padding: 25px 30px; border-top: 1px solid #e2e8f0;">
                                    <p style="margin: 0; color: #718096; font-size: 13px; text-align: center;">
                                        Si no solicitaste este enlace, ignora este email.
                                    </p>
                                    <p style="margin: 15px 0 0 0; color: #a0aec0; font-size: 12px; text-align: center;">
                                        © 2026 Trackfiz. Todos los derechos reservados.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
    
    @staticmethod
    def invitation_email(inviter_name: str, workspace_name: str, invitation_url: str) -> str:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitación - Trackfiz</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
                            <tr>
                                <td style="background: linear-gradient(135deg, #2D6A4F 0%, #40916C 50%, #52B788 100%); padding: 40px 30px; text-align: center;">
                                    <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700;">Trackfiz</h1>
                                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Tu plataforma de entrenamiento personal</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <h2 style="margin: 0 0 20px 0; color: #1a1a2e; font-size: 24px; font-weight: 600; text-align: center;">
                                        ¡Has sido invitado!
                                    </h2>
                                    <p style="margin: 0 0 25px 0; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
                                        <strong style="color: #2D6A4F;">{inviter_name}</strong> te ha invitado a unirte a <strong style="color: #2D6A4F;">{workspace_name}</strong> en Trackfiz.
                                    </p>
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                                        <tr>
                                            <td align="center">
                                                <a href="{invitation_url}" style="display: inline-block; background: linear-gradient(135deg, #2D6A4F 0%, #40916C 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(45, 106, 79, 0.4);">
                                                    Aceptar invitación
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                    <p style="margin: 25px 0 0 0; color: #a0aec0; font-size: 13px; text-align: center;">
                                        Esta invitación expirará en 7 días.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="background: #f8fafc; padding: 25px 30px; border-top: 1px solid #e2e8f0;">
                                    <p style="margin: 0; color: #718096; font-size: 13px; text-align: center;">
                                        Si no esperabas esta invitación, puedes ignorar este email.
                                    </p>
                                    <p style="margin: 15px 0 0 0; color: #a0aec0; font-size: 12px; text-align: center;">
                                        © 2026 Trackfiz. Todos los derechos reservados.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
    
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
                    <h1>¡Bienvenido a Trackfiz!</h1>
                </div>
                <div class="content">
                    <p>Hola <strong>{name}</strong>,</p>
                    <p>Tu cuenta en <strong>{workspace_name}</strong> ha sido creada correctamente.</p>
                    <p>Con Trackfiz podrás:</p>
                    <ul>
                        <li>Gestionar tus clientes y su progreso</li>
                        <li>Crear y asignar programas de entrenamiento</li>
                        <li>Diseñar planes de nutrición personalizados</li>
                        <li>Programar sesiones y gestionar tu calendario</li>
                        <li>Comunicarte con tus clientes por chat</li>
                        <li>Gestionar pagos y suscripciones</li>
                    </ul>
                    <p style="text-align: center;">
                        <a href="https://app.trackfiz.com/dashboard" class="button">Acceder al Dashboard</a>
                    </p>
                    <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                    <p>¡Éxito en tu camino!</p>
                    <p>El equipo de Trackfiz</p>
                </div>
                <div class="footer">
                    <p>© 2026 Trackfiz by E13 Fitness. Todos los derechos reservados.</p>
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
                    <p>© 2026 Trackfiz by E13 Fitness. Todos los derechos reservados.</p>
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
                    <p>© 2026 Trackfiz by E13 Fitness. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """


# Singleton instance
email_service = EmailService()

