"""Audit service for logging user actions and data mutations.

Saves structured audit records to the `audit_logs` table and outputs to application logs.
"""
from datetime import date, datetime
from decimal import Decimal
import logging
from typing import Any, Optional
from uuid import UUID

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

logger = logging.getLogger("app.audit")


def _sanitize_for_json(val: Any) -> Any:
    """Recursively convert UUIDs, datetimes, and decimals to JSON-serializable types."""
    if isinstance(val, (UUID, Decimal)):
        return str(val) if isinstance(val, UUID) else float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, dict):
        return {str(k): _sanitize_for_json(v) for k, v in val.items()}
    if isinstance(val, (list, tuple, set)):
        return [_sanitize_for_json(item) for item in val]
    return val


def get_client_ip(request: Optional[Request]) -> Optional[str]:
    """Extract real client IP considering reverse proxies (Cloudflare, Coolify, Traefik)."""
    if not request:
        return None
    
    # 1. Cloudflare header
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()

    # 2. X-Forwarded-For (first IP in chain is original client)
    xff = request.headers.get("x-forwarded-for")
    if xff:
        first_ip = xff.split(",")[0].strip()
        if first_ip:
            return first_ip

    # 3. X-Real-IP
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return x_real_ip.strip()

    # 4. Direct socket client
    if request.client:
        return request.client.host
    return None


async def log_audit(
    db: AsyncSession,
    *,
    workspace_id: UUID,
    user_id: Optional[UUID],
    action: str,  # "create", "update", "delete", "view", etc.
    table_name: str,
    record_id: Optional[UUID] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    request: Optional[Request] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    extra_data: Optional[dict] = None,
) -> Optional[AuditLog]:
    """Record an audit log entry in the database and emit an application log.

    Guaranteed not to raise an exception so caller flow is never interrupted.
    """
    try:
        resolved_ip = ip_address or get_client_ip(request)
        resolved_ua = user_agent or (request.headers.get("user-agent") if request else None)

        sanitized_old = _sanitize_for_json(old_values) if old_values else None
        sanitized_new = _sanitize_for_json(new_values) if new_values else None
        sanitized_extra = _sanitize_for_json(extra_data) if extra_data else {}

        log_entry = AuditLog(
            workspace_id=workspace_id,
            user_id=user_id,
            action=action,
            table_name=table_name,
            record_id=record_id,
            old_values=sanitized_old,
            new_values=sanitized_new,
            ip_address=resolved_ip,
            user_agent=resolved_ua,
            extra_data=sanitized_extra,
        )
        db.add(log_entry)

        logger.info(
            "AUDIT [%s] on %s record_id=%s user_id=%s ip=%s new=%s",
            action.upper(),
            table_name,
            record_id,
            user_id,
            resolved_ip,
            sanitized_new,
        )
        return log_entry
    except Exception as exc:
        logger.error("Failed to create audit log: %s", exc, exc_info=True)
        return None
