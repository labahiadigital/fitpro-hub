"""
Email service using Brevo (formerly Sendinblue)
"""
import asyncio
import html as html_mod
import logging
import re
from typing import List, Optional, Dict, Any
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

from app.core.config import settings

logger = logging.getLogger(__name__)


def _html_to_text(html: str) -> str:
    """Very small HTML->text fallback to include a text/plain part.

    Outlook/Hotmail deliverability mejora sustancialmente cuando el email
    lleva una versión de texto plano además del HTML.
    """
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html, flags=re.S | re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p\s*>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html_mod.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


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

        Añade mejoras de deliverability recomendadas para Gmail, Outlook y
        Hotmail:
          - Versión `text_content` (plain-text) generada desde el HTML si no
            se proporciona, para que el email tenga las dos partes MIME.
          - Cabecera `List-Unsubscribe` y `List-Unsubscribe-Post` (requisito
            de Gmail/Yahoo 2024 y muy recomendado por Outlook/Hotmail).
          - Cabecera `X-Entity-Ref-ID` para facilitar el tracking.
          - Logging detallado del body que devuelve Brevo cuando falla el
            envío (útil para diagnosticar dominios sin DKIM/SPF).
        """
        if not settings.BREVO_API_KEY:
            logger.error(
                "BREVO_API_KEY no configurada; no se envía email a %s (subject=%r)",
                to_email,
                subject,
            )
            return False

        try:
            text = text_content or _html_to_text(html_content)

            unsubscribe_url = (
                f"{settings.FRONTEND_URL.rstrip('/')}/unsubscribe?email={to_email}"
                if getattr(settings, "FRONTEND_URL", None)
                else None
            )
            headers: Dict[str, str] = {}
            if unsubscribe_url:
                headers["List-Unsubscribe"] = f"<{unsubscribe_url}>"
                headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
            headers["X-Mailer"] = "Trackfiz"

            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=[{"email": to_email, "name": to_name or to_email}],
                sender={"email": settings.FROM_EMAIL, "name": settings.FROM_NAME},
                subject=subject,
                html_content=html_content,
                text_content=text,
                reply_to={"email": reply_to or settings.FROM_EMAIL},
                attachment=attachments,
                headers=headers or None,
            )

            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None, self.api_instance.send_transac_email, send_smtp_email
            )
            logger.info(
                "Email enviado via Brevo to=%s subject=%r from=%s",
                to_email,
                subject,
                settings.FROM_EMAIL,
            )
            return True

        except ApiException as e:
            logger.error(
                "Brevo ApiException to=%s status=%s reason=%s body=%s",
                to_email,
                getattr(e, "status", "?"),
                getattr(e, "reason", "?"),
                getattr(e, "body", "?"),
            )
            return False
        except Exception:
            logger.exception("Error inesperado enviando email a %s", to_email)
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
            
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None, self.api_instance.send_transac_email, send_smtp_email
            )
            return True
            
        except ApiException as e:
            logger.error("Error sending template email to %s: %s", to_email, e)
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
            logger.error("Error sending bulk email: %s", e)
            return False


# Email templates
def _cta_button(
    text: str,
    href: str,
    fill_hex: str = "#2D6A4F",
    gradient_end_hex: str = "#40916C",
) -> str:
    """Renderiza un botón CTA bulletproof para email.

    Outlook/Windows Mail ignora ``linear-gradient`` y deja el botón vacío
    (texto blanco sobre fondo transparente). Usamos el patrón "bulletproof
    button" recomendado por Campaign Monitor / Litmus: una caja VML para
    Outlook con fallback a un ``<a>`` sólido para el resto de clientes.
    """
    safe_text = html_mod.escape(text)
    return f"""
<div>
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
     href="{href}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="22%"
     stroke="f" fillcolor="{fill_hex}">
  <w:anchorlock/>
  <center style="color:#ffffff;font-family:Segoe UI, Tahoma, Geneva, Verdana, sans-serif;font-size:16px;font-weight:bold;">
    {safe_text}
  </center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-- -->
<a href="{href}"
   style="display:inline-block;background-color:{fill_hex};background-image:linear-gradient(135deg, {fill_hex} 0%, {gradient_end_hex} 100%);color:#ffffff;padding:16px 40px;text-decoration:none;border-radius:12px;font-size:16px;font-weight:600;font-family:Segoe UI, Tahoma, Geneva, Verdana, sans-serif;mso-hide:all;box-shadow:0 4px 14px rgba(45, 106, 79, 0.4);">
  {safe_text}
</a>
<!--<![endif]-->
</div>
""".strip()


class EmailTemplates:
    @staticmethod
    def client_welcome_after_onboarding(
        name: str,
        portal_url: str,
        workspace_name: Optional[str] = None,
        coach_name: Optional[str] = None,
        coach_phone: Optional[str] = None,
    ) -> str:
        """Email de bienvenida tras completar el onboarding del cliente.

        El copy lo proporciona el entrenador (Borja Sanfélix) y se renderiza
        con tipografía limpia. Se hace HTML-escape de todos los datos
        dinámicos para evitar problemas de inyección. Si no se pasa
        ``coach_name``/``coach_phone`` se usan los valores por defecto.
        """
        safe_name = html_mod.escape(name.strip() if name else "atleta")
        safe_brand = html_mod.escape(workspace_name or "Trackfiz")
        safe_coach = html_mod.escape(coach_name) if coach_name else "Borja Sanfélix"
        # "Soy [coach o nombre del negocio]" — usamos primero el nombre del coach;
        # si no se ha pasado, caemos al nombre del workspace (negocio).
        intro_label = (coach_name or workspace_name or "Borja Sanfélix").strip()
        safe_intro = html_mod.escape(intro_label)
        phone_value = coach_phone or "+376 383 382"
        safe_phone = html_mod.escape(phone_value)
        portal_href = html_mod.escape(portal_url, quote=True)

        return f"""
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bienvenido a Trackfiz</title>
        </head>
        <body style="margin:0;padding:0;background:#f4f7f6;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;color:#1f2937;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                    <td align="center" style="padding:40px 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:white;border-radius:18px;overflow:hidden;box-shadow:0 10px 35px rgba(15,23,42,.10);">
                            <tr>
                                <td style="background:linear-gradient(135deg,#2D6A4F 0%,#52B788 100%);padding:38px 32px;text-align:center;">
                                    <h1 style="margin:0;color:white;font-size:26px;font-weight:700;line-height:1.3;">Soy {safe_intro}</h1>
                                    <p style="margin:8px 0 0;color:rgba(255,255,255,.92);font-size:15px;">Bienvenido a Trackfiz</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:32px 32px 8px 32px;font-size:16px;line-height:1.7;">
                                    <p style="margin:0 0 14px;">Hola, {safe_name},</p>
                                    <p style="margin:0 0 14px;">Lo primero, gracias por confiar en mí.</p>
                                    <p style="margin:0 0 22px;">Ya has dado el paso importante. Ahora vamos a trabajar juntos para conseguir ese cambio que buscas.</p>
                                    <p style="margin:0 0 22px;">Para comenzar hoy mismo, si no lo has hecho todavía, necesito que hagas lo siguiente:</p>
                                </td>
                            </tr>

                            <!-- 1. Plataforma -->
                            <tr>
                                <td style="padding:0 32px 8px 32px;font-size:16px;line-height:1.7;">
                                    <h3 style="margin:0 0 8px;color:#2D6A4F;font-size:18px;">1. Accede a la plataforma (Trackfiz)</h3>
                                    <p style="margin:0 0 12px;">Vamos a trabajar con Trackfiz, la plataforma donde llevaré todo tu seguimiento. Desde ahí tendrás tu planificación y podrás ver tu progreso en tiempo real.</p>
                                    <p style="margin:0 0 6px;">Aquí tienes el enlace:</p>
                                    <p style="margin:0 0 18px;"><a href="{portal_href}" style="color:#2D6A4F;font-weight:600;text-decoration:underline;">{portal_href}</a></p>
                                    <div style="text-align:center;margin:18px 0 24px;">
                                        {_cta_button("Ir a mi portal", portal_url)}
                                    </div>
                                </td>
                            </tr>

                            <!-- 2. Perfil -->
                            <tr>
                                <td style="padding:0 32px 8px 32px;font-size:16px;line-height:1.7;">
                                    <h3 style="margin:0 0 8px;color:#2D6A4F;font-size:18px;">2. Completa tu perfil</h3>
                                    <ul style="margin:0 0 8px 18px;padding:0;">
                                        <li style="margin:0 0 6px;">Rellena los formularios que tengas pendientes</li>
                                        <li style="margin:0 0 6px;">Sube tus fotos y medidas en la sección &ldquo;Progreso&rdquo;<br><span style="color:#6b7280;font-size:14px;">(Puedes hacerlo fácilmente desde las notificaciones de la plataforma 🔔)</span></li>
                                    </ul>
                                    <p style="margin:8px 0 22px;color:#374151;">Esto es clave para empezar con una base clara.</p>
                                </td>
                            </tr>

                            <!-- 3. Cómo trabajaremos -->
                            <tr>
                                <td style="padding:0 32px 8px 32px;font-size:16px;line-height:1.7;">
                                    <h3 style="margin:0 0 8px;color:#2D6A4F;font-size:18px;">3. Cómo trabajaremos</h3>
                                    <p style="margin:0 0 22px;">Dentro de Trackfiz irás marcando todo lo que vayas haciendo (entrenos, seguimiento, etc.). Así queda todo registrado y puedo ajustar tu plan con precisión en función de tu evolución.</p>
                                </td>
                            </tr>

                            <!-- 4. Contacto -->
                            <tr>
                                <td style="padding:0 32px 8px 32px;font-size:16px;line-height:1.7;">
                                    <h3 style="margin:0 0 8px;color:#2D6A4F;font-size:18px;">4. Contacto</h3>
                                    <p style="margin:0 0 8px;">En breve me pondré en contacto contigo por WhatsApp para empezar a trabajar contigo de forma directa.</p>
                                    <p style="margin:0 0 22px;">De todas formas, te dejo mi número: <a href="tel:{safe_phone}" style="color:#2D6A4F;font-weight:600;text-decoration:none;">{safe_phone}</a></p>
                                </td>
                            </tr>

                            <!-- Soporte -->
                            <tr>
                                <td style="padding:0 32px 8px 32px;font-size:16px;line-height:1.7;">
                                    <h3 style="margin:0 0 8px;color:#2D6A4F;font-size:18px;">Soporte</h3>
                                    <p style="margin:0 0 8px;">Estoy disponible de lunes a viernes para lo que necesites.</p>
                                    <p style="margin:0 0 22px;">Intentaré responderte siempre en menos de 24h laborables.</p>
                                </td>
                            </tr>

                            <!-- Cierre -->
                            <tr>
                                <td style="padding:0 32px 32px 32px;font-size:16px;line-height:1.7;">
                                    <p style="margin:0 0 8px;">A partir de aquí, empieza lo bueno.</p>
                                    <p style="margin:0 0 22px;">Yo me encargo de guiarte. Tú encárgate de darlo todo.</p>
                                    <p style="margin:0 0 8px;font-weight:700;font-size:18px;">Vamos a darle GAS 💪🏽</p>
                                    <p style="margin:18px 0 0;color:#374151;font-weight:600;">{safe_coach}</p>
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
    def email_confirmation(
        name: str,
        confirmation_url: str,
        workspace_name: Optional[str] = None,
    ) -> str:
        """Email de confirmación de cuenta.

        Si se proporciona ``workspace_name`` (p.ej. el gimnasio/entrenador que
        ha invitado al cliente), aparece como marca principal y Trackfiz se
        muestra como plataforma detrás. Así el cliente reconoce a quién se
        está registrando en lugar de ver sólo "Trackfiz".
        """
        # En el flujo de registro del ENTRENADOR (sin workspace asociado
        # todavía) mostramos un saludo personal en el header verde
        # ("Hola, Juan" + "Bienvenido a Trackfiz") en lugar del genérico
        # "Trackfiz / Tu plataforma...". El header se veía vacío de
        # personalización y los entrenadores reportaban que parecía un
        # email "sin texto".
        # En el flujo del CLIENTE (con workspace_name) mantenemos el
        # branding del entrenador como marca principal.
        clean_name = (name or "").strip().split(" ")[0] if name else ""
        if workspace_name:
            brand_title = workspace_name
            brand_subtitle = "Vía Trackfiz · Tu plataforma de entrenamiento"
        else:
            brand_title = f"Hola, {clean_name}" if clean_name else "Hola"
            brand_subtitle = "Bienvenido a Trackfiz"
        welcome_line = (
            f"Gracias por registrarte en <strong>{workspace_name}</strong>. Para completar tu registro y empezar a entrenar, confirma tu dirección de email haciendo clic en el botón:"
            if workspace_name
            else "Gracias por registrarte en Trackfiz. Para completar tu registro y empezar a usar la plataforma, confirma tu dirección de email haciendo clic en el botón:"
        )
        return f"""
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>Confirma tu cuenta - {brand_title}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; width: 100%; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
                            <!-- Header con gradiente -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #2D6A4F 0%, #40916C 50%, #52B788 100%); padding: 40px 30px; text-align: center;">
                                    <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">{brand_title}</h1>
                                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">{brand_subtitle}</p>
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
                                        {welcome_line}
                                    </p>
                                    
                                    <!-- Botón CTA -->
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                                        <tr>
                                            <td align="center">
                                                {_cta_button("Confirmar mi cuenta", confirmation_url)}
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
    def password_reset(name: str, reset_url: str, workspace_name: Optional[str] = None) -> str:
        brand = workspace_name or "Trackfiz"
        return f"""
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>Restablecer contraseña - {brand}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; width: 100%; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
                            <!-- Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #2D6A4F 0%, #40916C 50%, #52B788 100%); padding: 40px 30px; text-align: center;">
                                    <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">{brand}</h1>
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
                                                {_cta_button("Restablecer contraseña", reset_url)}
                                            </td>
                                        </tr>
                                    </table>

                                    <p style="margin: 25px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                                        Si el botón no funciona, copia y pega este enlace en tu navegador:
                                    </p>
                                    <p style="margin: 10px 0 0 0; color: #2D6A4F; font-size: 12px; word-break: break-all; text-align: center; background: #f0fdf4; padding: 12px; border-radius: 8px;">
                                        {reset_url}
                                    </p>

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
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>Acceso rápido - Trackfiz</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; width: 100%; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
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
                                                {_cta_button("Acceder a Trackfiz", magic_link_url)}
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
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>Invitación - Trackfiz</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; width: 100%; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
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
                                                {_cta_button("Aceptar invitación", invitation_url)}
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
                .header small {{ display: block; margin-top: 6px; color: rgba(255,255,255,0.85); font-size: 13px; font-weight: normal; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #2D6A4F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>¡Bienvenido a {workspace_name}!</h1>
                    <small>Vía Trackfiz · Tu plataforma de entrenamiento</small>
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
                    <p>© 2026 Trackfiz. Todos los derechos reservados.</p>
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
                    <p>© 2026 Trackfiz. Todos los derechos reservados.</p>
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
                    <p>© 2026 Trackfiz. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def payment_receipt(
        client_name: str,
        workspace_name: str,
        amount: float,
        currency: str,
        description: str,
        paid_at: str,
        invoice_number: Optional[str] = None,
        workspace_email: Optional[str] = None,
        workspace_phone: Optional[str] = None,
        payment_method: Optional[str] = None,
    ) -> str:
        """Recibo de pago enviado al cliente.

        Incluye los detalles del cobro y los datos de contacto del workspace
        (entrenador/gimnasio) para que pueda ponerse en contacto con ellos
        directamente si tiene dudas.
        """
        currency_sym = (currency or "EUR").upper()
        amount_str = f"{amount:.2f} {currency_sym}"
        invoice_html = (
            f'<div class="details-row"><span><strong>Nº de recibo:</strong></span><span>{invoice_number}</span></div>'
            if invoice_number else ""
        )
        method_html = (
            f'<div class="details-row"><span><strong>Método:</strong></span><span>{payment_method}</span></div>'
            if payment_method else ""
        )
        contact_items = []
        if workspace_email:
            contact_items.append(
                f'<li>Email: <a href="mailto:{workspace_email}" style="color:#2D6A4F;">{workspace_email}</a></li>'
            )
        if workspace_phone:
            contact_items.append(f"<li>Teléfono: {workspace_phone}</li>")
        contact_html = (
            f'<div style="background:white;padding:20px;border-radius:8px;margin:20px 0;">'
            f'<p style="margin:0 0 8px 0;color:#2D6A4F;font-weight:600;">¿Necesitas ayuda?</p>'
            f'<p style="margin:0 0 8px 0;color:#4a5568;font-size:14px;">Contacta directamente con <strong>{workspace_name}</strong>:</p>'
            f'<ul style="margin:0;padding-left:18px;color:#4a5568;font-size:14px;">'
            f'{"".join(contact_items)}</ul></div>'
            if contact_items else ""
        )
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recibo de pago - {workspace_name}</title>
            <style>
                body {{ font-family: 'DM Sans', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7f6; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .card {{ background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06); }}
                .header {{ background: linear-gradient(135deg, #2D6A4F 0%, #40916C 100%); padding: 30px; text-align: center; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; font-weight: 700; }}
                .header small {{ display: block; margin-top: 6px; color: rgba(255,255,255,0.85); font-size: 13px; }}
                .content {{ padding: 30px; }}
                .amount {{ background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin: 18px 0; }}
                .amount .value {{ font-size: 32px; font-weight: 700; color: #166534; margin: 0; }}
                .details {{ background: #f8fafc; padding: 18px; border-radius: 10px; margin: 20px 0; }}
                .details-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; color: #4a5568; }}
                .details-row:last-child {{ border-bottom: none; }}
                .footer {{ text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card">
                    <div class="header">
                        <h1>{workspace_name}</h1>
                        <small>Vía Trackfiz · Recibo de pago</small>
                    </div>
                    <div class="content">
                        <p style="margin:0 0 6px 0;">Hola <strong>{client_name}</strong>,</p>
                        <p style="margin:0 0 16px 0;color:#4a5568;">Hemos registrado correctamente tu pago a <strong>{workspace_name}</strong>. Guarda este correo como comprobante.</p>
                        <div class="amount">
                            <p style="margin:0 0 4px 0;color:#15803d;font-size:13px;font-weight:600;">PAGADO</p>
                            <p class="value">{amount_str}</p>
                        </div>
                        <div class="details">
                            <div class="details-row"><span><strong>Concepto:</strong></span><span>{description}</span></div>
                            <div class="details-row"><span><strong>Fecha:</strong></span><span>{paid_at}</span></div>
                            {method_html}
                            {invoice_html}
                        </div>
                        {contact_html}
                        <p style="margin:20px 0 0 0;color:#94a3b8;font-size:13px;text-align:center;">Procesado a través de Trackfiz.</p>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2026 Trackfiz. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def form_pending(
        client_name: str,
        form_name: str,
        form_url: str,
        workspace_name: Optional[str] = None,
        is_required: bool = False,
        form_description: Optional[str] = None,
    ) -> str:
        """Email enviado al cliente cuando su entrenador le asigna un nuevo formulario.

        Muestra al gimnasio/entrenador como marca principal y pone un CTA
        directo a la pantalla de formularios pendientes del cliente.
        """
        brand_title = workspace_name or "Trackfiz"
        brand_subtitle = (
            "Vía Trackfiz · Tu plataforma de entrenamiento"
            if workspace_name
            else "Tu plataforma de entrenamiento personal"
        )
        required_badge_html = (
            '<div style="display:inline-block;background:#fef3c7;color:#92400e;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;margin-bottom:18px;">⚠️ Formulario obligatorio</div>'
            if is_required
            else '<div style="display:inline-block;background:#e0f2fe;color:#075985;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;margin-bottom:18px;">📝 Nuevo formulario</div>'
        )
        description_html = (
            f'<p style="margin:0 0 18px 0;color:#475569;font-size:14px;line-height:1.6;background:#f8fafc;padding:14px 16px;border-left:3px solid #2D6A4F;border-radius:6px;">{html_mod.escape(form_description)}</p>'
            if form_description
            else ""
        )
        intro_text = (
            f"<strong>{html_mod.escape(workspace_name)}</strong> te ha enviado un nuevo formulario para que lo completes."
            if workspace_name
            else "Tienes un nuevo formulario disponible para completar."
        )
        cta_text = "Responder formulario" if not is_required else "Responder ahora"
        return f"""
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>Nuevo formulario - {html_mod.escape(brand_title)}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 540px; width: 100%; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
                            <tr>
                                <td style="background: linear-gradient(135deg, #2D6A4F 0%, #40916C 50%, #52B788 100%); padding: 36px 30px; text-align: center;">
                                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">{html_mod.escape(brand_title)}</h1>
                                    <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 13px;">{brand_subtitle}</p>
                                </td>
                            </tr>

                            <tr>
                                <td style="padding: 36px 30px 30px 30px;">
                                    <div style="text-align:center;">
                                        {required_badge_html}
                                    </div>

                                    <h2 style="margin: 0 0 16px 0; color: #1a1a2e; font-size: 22px; font-weight: 600; text-align: center;">
                                        {html_mod.escape(form_name)}
                                    </h2>

                                    <p style="margin: 0 0 14px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                        Hola <strong style="color: #2D6A4F;">{html_mod.escape(client_name)}</strong>,
                                    </p>

                                    <p style="margin: 0 0 18px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">
                                        {intro_text}
                                    </p>

                                    {description_html}

                                    <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
                                        {"Es <strong>obligatorio</strong> que lo completes para continuar con tu plan." if is_required else "Cuando puedas, dedícale unos minutos a responderlo."}
                                    </p>

                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0 8px 0;">
                                        <tr>
                                            <td align="center">
                                                {_cta_button(cta_text, form_url)}
                                            </td>
                                        </tr>
                                    </table>

                                    <p style="margin: 24px 0 0 0; color: #718096; font-size: 13px; line-height: 1.6; text-align: center;">
                                        Si el botón no funciona, copia y pega este enlace en tu navegador:
                                    </p>
                                    <p style="margin: 8px 0 0 0; color: #2D6A4F; font-size: 12px; word-break: break-all; text-align: center; background: #f0fdf4; padding: 10px; border-radius: 8px;">
                                        {form_url}
                                    </p>
                                </td>
                            </tr>

                            <tr>
                                <td style="background: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0;">
                                    <p style="margin: 0; color: #718096; font-size: 13px; text-align: center; line-height: 1.5;">
                                        Recibes este correo porque eres cliente de {html_mod.escape(brand_title)}.
                                    </p>
                                    <p style="margin: 12px 0 0 0; color: #a0aec0; font-size: 12px; text-align: center;">
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


# Singleton instance
email_service = EmailService()

