"""
Helpers for the httpOnly refresh-token cookie.

Rationale
---------
Keeping the refresh token in localStorage exposes it to every XSS payload that
lands in the SPA.  An httpOnly + Secure + SameSite cookie is unreachable by
JavaScript, which is the correct place to hold a long-lived credential.

The access token stays in memory / Zustand store as before; it's short-lived
(1h) and not persisted across tabs so the XSS impact is limited to the tab
that was compromised.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Optional

from fastapi import Request, Response

from app.core.config import settings
from app.core.security import REFRESH_TOKEN_EXPIRE_DAYS


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    max_age = int(timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS).total_seconds())
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=refresh_token,
        max_age=max_age,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        domain=settings.AUTH_COOKIE_DOMAIN or None,
        path="/api/v1/auth",  # Scope cookie to the auth namespace only
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        domain=settings.AUTH_COOKIE_DOMAIN or None,
        path="/api/v1/auth",
    )


def read_refresh_cookie(request: Request) -> Optional[str]:
    value = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if value:
        return value
    return None
