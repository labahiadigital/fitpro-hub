"""Helpers for workspace public URLs and custom domains."""
from __future__ import annotations

from urllib.parse import quote, urlparse

from app.core.config import settings
from app.models.workspace import Workspace


# Hosts that serve the shared Trackfiz platform (not a white-label domain).
PLATFORM_HOSTS = frozenset(
    {
        "localhost",
        "127.0.0.1",
        "app.trackfiz.com",
        "www.trackfiz.com",
        "trackfiz.com",
        "dev.trackfiz.com",
        "staging.trackfiz.com",
        "preapp.trackfiz.com",
    }
)

_DEFAULT_PLATFORM_FRONTEND = "https://app.trackfiz.com"


def normalize_hostname(value: str | None) -> str | None:
    if not value:
        return None
    host = value.strip().lower()
    host = host.removeprefix("https://").removeprefix("http://")
    host = host.split("/")[0].split(":")[0].strip(".")
    return host or None


def is_platform_host(hostname: str | None) -> bool:
    host = normalize_hostname(hostname)
    if not host:
        return True
    if host in PLATFORM_HOSTS:
        return True
    # Any *.trackfiz.com subdomain is platform unless it's a customer CNAME
    # pointed at us — customers use their own apex/subdomain, not trackfiz.com.
    if host.endswith(".trackfiz.com"):
        return True
    return False


def platform_frontend_base_url() -> str:
    """Canonical SPA origin for transactional links (invites, resets, etc.).

    Never returns localhost in a way that would break mobile email clients:
    if FRONTEND_URL is missing or points at loopback, fall back to production.
    """
    raw = (settings.FRONTEND_URL or "").strip().rstrip("/")
    if not raw:
        return _DEFAULT_PLATFORM_FRONTEND

    host = normalize_hostname(raw)
    if not host or host in {"localhost", "127.0.0.1"}:
        return _DEFAULT_PLATFORM_FRONTEND

    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    return f"https://{raw}"


def workspace_public_base_url(
    workspace: Workspace | None = None,
    domain: str | None = None,
    *,
    use_custom_domain: bool = False,
) -> str:
    """Public SPA base URL for links (invites, emails, onboarding).

    By default uses the platform FRONTEND_URL. Custom domains are only used
    when ``use_custom_domain=True`` — do **not** enable that for invitation
    emails until DNS/CNAME is verified, or clients get a dead link.
    """
    if use_custom_domain:
        custom = normalize_hostname(
            domain or (getattr(workspace, "domain", None) if workspace else None)
        )
        if custom and not is_platform_host(custom):
            return f"https://{custom}"
    return platform_frontend_base_url()


def workspace_invitation_url(workspace: Workspace | None, token: str) -> str:
    """Absolute invite URL that always opens on the platform frontend."""
    # token_urlsafe uses A-Za-z0-9_- ; keep those unescaped for readable links.
    safe_token = quote(str(token), safe="-_")
    return f"{workspace_public_base_url(workspace)}/onboarding/invite/{safe_token}"


def origin_hostname(origin: str | None) -> str | None:
    if not origin:
        return None
    try:
        return normalize_hostname(urlparse(origin).hostname)
    except Exception:
        return None
