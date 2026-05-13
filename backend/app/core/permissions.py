"""Permisos especiales no ligados a roles del workspace.

Aquí concentramos email allowlists para acciones que cruzan el límite
normal del workspace (p.ej. editar entidades globales del sistema). Antes
estaban como literales esparcidos por endpoints; tenerlos en un único
sitio facilita auditar exactamente quién puede hacer qué bypass.
"""
from __future__ import annotations

import os
from typing import Iterable

from app.middleware.auth import CurrentUser


def _normalize_email(value: str | None) -> str:
    return (value or "").strip().lower()


# Email del único usuario autorizado a modificar entidades GLOBALES
# (compartidas entre todos los workspaces). Hoy se usa para editar foods
# del catálogo "Sistema" (``foods.is_global=True``): cuando Borja detecta
# valores incorrectos en alimentos del sistema, necesita poder
# corregirlos en producción sin recrear el catálogo. NINGÚN otro
# entrenador debe poder hacer este bypass.
#
# Se puede sobrescribir en runtime con la env var
# ``SYSTEM_CONTENT_ADMIN_EMAIL`` para staging/tests, pero el default es
# el del owner del producto.
SYSTEM_CONTENT_ADMIN_EMAIL = _normalize_email(
    os.getenv("SYSTEM_CONTENT_ADMIN_EMAIL", "soporte@borjasanfelix.com")
)


def is_system_content_admin(user: CurrentUser | None) -> bool:
    """Devuelve True si el usuario es el admin de contenido global.

    Centralizamos esta comprobación para que la igualdad de email sea
    siempre case-insensitive y con strip, y para que sea trivial añadir
    en el futuro más admins (basta con cambiar este módulo).
    """
    if user is None:
        return False
    email = _normalize_email(getattr(user, "email", None))
    if not email:
        return False
    return email == SYSTEM_CONTENT_ADMIN_EMAIL


def assert_system_content_admin(user: CurrentUser | None) -> None:
    """Lanza HTTPException 403 si el usuario no es admin de contenido."""
    from fastapi import HTTPException, status

    if not is_system_content_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el administrador del sistema puede modificar contenido global",
        )


__all__: Iterable[str] = (
    "SYSTEM_CONTENT_ADMIN_EMAIL",
    "is_system_content_admin",
    "assert_system_content_admin",
)
