"""White-label HTML templates for client invitation emails."""
from __future__ import annotations

import html
from typing import Any, Mapping, Optional

_DEFAULT_PRIMARY = "#5C80BC"
_DEFAULT_ACCENT = "#E7E247"
_DEFAULT_DARK = "#1a1a2e"


def _brand_color(branding: Optional[Mapping[str, Any]], key: str, default: str) -> str:
    if not branding:
        return default
    value = branding.get(key)
    if isinstance(value, str) and value.startswith("#") and len(value) in (4, 7):
        return value
    return default


def build_client_invitation_email_html(
    *,
    workspace_name: str,
    trainer_name: str,
    invitation_url: str,
    client_name: Optional[str] = None,
    custom_message: Optional[str] = None,
    branding: Optional[Mapping[str, Any]] = None,
    logo_url: Optional[str] = None,
) -> str:
    """Branded invitation email — workspace name/colors, no Trackfiz in body.

    Markup is kept Outlook-safe: CTA ``href`` + ``style`` on a single line,
    logo optional (long presigned URLs can confuse some clients).
    """
    safe_workspace = html.escape(workspace_name)
    safe_trainer = html.escape(trainer_name)
    # Escape for HTML attributes; keep a display copy without breaking the URL
    # when users copy-paste from the fallback line.
    safe_url_attr = html.escape(invitation_url, quote=True)
    safe_url_text = html.escape(invitation_url)
    primary = _brand_color(branding, "primary_color", _DEFAULT_PRIMARY)
    accent = _brand_color(branding, "accent_color", _DEFAULT_ACCENT)

    greeting = (
        f"Hola <strong>{html.escape(client_name)}</strong>,"
        if client_name
        else "Hola,"
    )

    message_block = ""
    if custom_message:
        message_block = (
            f'<div style="background:#f8f9fa;padding:16px;border-radius:8px;'
            f'margin:20px 0;border-left:4px solid {primary};">'
            f'<p style="margin:0;color:#444;font-style:italic;">'
            f'"{html.escape(custom_message)}"</p>'
            f'<p style="margin:8px 0 0;color:#888;font-size:12px;">— {safe_trainer}</p>'
            f"</div>"
        )

    # Skip fragile remote logos in email (presigned URLs are long and break
    # some clients). Branding still shows via name + colors.
    _ = logo_url  # reserved for a future public CDN logo URL

    btn_style = (
        f"display:inline-block;background:{accent};color:#1a1a2e;"
        f"padding:14px 36px;text-decoration:none;border-radius:10px;"
        f"font-weight:700;font-size:16px;"
    )

    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
    <tr>
      <td style="background:{_DEFAULT_DARK};padding:36px 28px;text-align:center;">
        <h1 style="color:{accent};margin:0;font-size:26px;line-height:1.3;">¡Bienvenido/a a {safe_workspace}!</h1>
        <p style="color:#cccccc;margin:10px 0 0;font-size:14px;">{safe_trainer} te ha invitado</p>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 28px;">
        <p style="color:#333;font-size:16px;line-height:1.6;">{greeting}</p>
        <p style="color:#666;font-size:16px;line-height:1.6;">
          <strong>{safe_trainer}</strong> te invita a unirte a <strong>{safe_workspace}</strong>
          para acceder a tu plan de entrenamiento, nutrición y seguimiento personalizado.
        </p>
        {message_block}
        <p style="color:#666;font-size:16px;line-height:1.6;">
          Pulsa el botón para crear tu cuenta y empezar:
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:28px 0;">
              <a href="{safe_url_attr}" style="{btn_style}">Crear mi cuenta</a>
            </td>
          </tr>
        </table>
        <p style="color:#999;font-size:13px;line-height:1.6;text-align:center;">
          Este enlace caduca en 7 días. Si no esperabas este correo, puedes ignorarlo.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:28px 0;">
        <p style="color:#999;font-size:12px;text-align:center;word-break:break-all;">
          Si el botón no funciona, copia este enlace:<br>
          <a href="{safe_url_attr}" style="color:{primary};">{safe_url_text}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:{_DEFAULT_DARK};padding:18px 28px;text-align:center;">
        <p style="color:#888;font-size:12px;margin:0;">© {safe_workspace}</p>
      </td>
    </tr>
  </table>
</body>
</html>"""


def invitation_email_subject(workspace_name: str, trainer_name: str) -> str:
    return f"{trainer_name} te invita a {workspace_name}"
