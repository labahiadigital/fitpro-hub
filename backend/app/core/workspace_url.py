"""Helpers for workspace public URLs and custom domains."""
from __future__ import annotations

from urllib.parse import urlparse

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
    }
)


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


def workspace_public_base_url(workspace: Workspace | None = None, domain: str | None = None) -> str:
    """Public SPA base URL for links (invites, emails, onboarding).

    Prefers the workspace custom domain when set; otherwise FRONTEND_URL.
    """
    custom = normalize_hostname(domain or (getattr(workspace, "domain", None) if workspace else None))
    if custom:
        return f"https://{custom}"
    return settings.FRONTEND_URL.rstrip("/")


def origin_hostname(origin: str | None) -> str | None:
    if not origin:
        return None
    try:
        return normalize_hostname(urlparse(origin).hostname)
    except Exception:
        return None
