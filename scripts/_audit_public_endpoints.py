"""Audita endpoints públicos (sin dependencias de auth) en backend/app/api/v1/endpoints.

Uso: python scripts/_audit_public_endpoints.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "backend" / "app" / "api" / "v1" / "endpoints"

# Marcadores de auth: si la signature de la función contiene cualquiera de
# estos, consideramos que el endpoint NO es público.
AUTH_MARKERS = (
    "require_workspace",
    "require_staff",
    "require_admin",
    "require_super_admin",
    "require_owner",
    "require_role",
    "require_any_role",
    "get_current_user",
    "CurrentUser",
    "verify_jwt",
    "current_user:",
)

# Endpoints intencionalmente públicos por motivos de negocio (webhooks de
# pasarelas, validación de invitación, login, etc.). Los marcamos para
# distinguirlos de los “públicos por descuido”.
INTENTIONALLY_PUBLIC = {
    # ── Webhooks de proveedores externos ─────────────────────────────
    # Los servidores externos no pueden enviar JWT; deben validar firma HMAC.
    ("redsys.py", "/notification"),
    ("redsys.py", "/confirm-return"),
    ("sequra.py", "/ipn"),
    ("sequra.py", "/events-webhook"),
    ("payments.py", "/webhook"),  # Stripe webhook (Stripe-Signature header)
    ("messages.py", "/webhook/whatsapp"),
    ("messages.py", "/webhook/whatsapp/status"),
    ("whatsapp.py", "/webhook"),
    ("google_calendar.py", "/webhook"),
    # ── Auth flow ────────────────────────────────────────────────────
    ("auth.py", "/login"),
    ("auth.py", "/register"),
    ("auth.py", "/refresh"),
    ("auth.py", "/forgot-password"),
    ("auth.py", "/reset-password"),
    ("auth.py", "/verify-email"),
    ("auth.py", "/verify-token"),
    ("auth.py", "/resend-verification"),  # rate-limited 3/min
    ("auth.py", "/google/callback"),
    ("auth.py", "/google/login"),
    ("auth.py", "/google"),
    ("auth.py", "/register-client"),
    # ── Onboarding por token ────────────────────────────────────────
    # El cliente acaba de recibir el enlace por email y todavía no tiene cuenta.
    # Los endpoints validan el token de invitación (criptográficamente único).
    ("invitations.py", "/validate/{token}"),
    ("invitations.py", "/accept/{token}"),
    ("invitations.py", "/complete/{token}"),
    ("invitations.py", "/public-signup/{workspace_slug}/{product_id}"),
    # Pago previo a tener cuenta (siempre validado por token de invitación)
    ("redsys.py", "/create-onboarding-payment"),
    ("redsys.py", "/onboarding-payment-status/{token}"),
    ("sequra.py", "/start-onboarding"),
    ("sequra.py", "/onboarding-payment-status/{token}"),
    ("sequra.py", "/available-methods"),
    ("sequra.py", "/identification-form"),
    # ── Aceptar invitaciones de staff ───────────────────────────────
    ("users.py", "/accept-invite"),
    ("users.py", "/validate-invite/{token}"),
    # ── Landings públicas (tienda online del workspace) ─────────────
    ("workspaces.py", "/by-slug/{slug}"),  # solo expone {id, name, slug, logo_url}
    ("products.py", "/public/{product_id}"),  # solo productos is_active
    ("products.py", "/public/{product_id}/availability"),
    ("products.py", "/public/{product_id}/waitlist"),
    # ── Tracking de afiliados (link en URL pública) ─────────────────
    ("referrals.py", "/track/{link_code}"),
    # ── Verificación pública de certificados ────────────────────────
    ("lms.py", "/certificates/{certificate_number}"),
    # ── Diagnóstico interno sin datos ───────────────────────────────
    ("sequra.py", "/debug-ping"),
}


def signature_block(src: str, start: int) -> str:
    """Devuelve la cabecera de la función (def ...:) a partir del offset start."""
    m = re.search(r"def\s+\w+\s*\((.*?)\)\s*(?:->\s*[^\:]+)?\s*:", src[start:], re.DOTALL)
    if not m:
        return ""
    return m.group(1)


def main():
    public = []
    for f in sorted(ROOT.glob("*.py")):
        src = f.read_text(encoding="utf-8")
        for m in re.finditer(
            r"@router\.(get|post|put|patch|delete)\(\s*[\"']([^\"']+)[\"']",
            src,
        ):
            method = m.group(1).upper()
            route = m.group(2)
            sig = signature_block(src, m.end())
            has_auth = any(marker in sig for marker in AUTH_MARKERS)
            if not has_auth:
                key = (f.name, route)
                intentional = key in INTENTIONALLY_PUBLIC
                public.append((f.name, method, route, intentional))

    print(f"\n{'FILE':32} {'METHOD':7} {'ROUTE':55} {'STATUS'}")
    print("-" * 110)
    accidental = 0
    for fname, method, route, intentional in public:
        flag = "OK (intentional)" if intentional else "[REVISAR]"
        if not intentional:
            accidental += 1
        print(f"{fname:32} {method:7} {route:55} {flag}")
    print()
    print(f"Total públicos: {len(public)} | Intencionales: {len(public)-accidental} | A revisar: {accidental}")


if __name__ == "__main__":
    main()
