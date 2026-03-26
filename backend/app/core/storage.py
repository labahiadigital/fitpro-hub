"""
Unified file storage via Cloudflare R2 (S3-compatible API).

Two buckets with clearly separated concerns:

trackfiz-platform  (R2_PLATFORM_BUCKET)
  Global, system-level assets shared across all workspaces.
  Structure:
    exercises/{id}.png
    foods/{id}.png
    supplements/{id}.png

trackfiz-workspaces  (R2_WORKSPACES_BUCKET)
  Per-workspace content following a strict hierarchy:
    w/{workspace_id}/branding/{file}
    w/{workspace_id}/trainers/{user_id}/avatar/{file}
    w/{workspace_id}/clients/{client_id}/avatar/{file}
    w/{workspace_id}/clients/{client_id}/progress-photos/{file}
    w/{workspace_id}/clients/{client_id}/documents/{file}
    w/{workspace_id}/exercises/{file}
    w/{workspace_id}/recipes/{file}
    w/{workspace_id}/lms/{file}
"""
import asyncio
import uuid as _uuid
import logging
from functools import partial
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig

from app.core.config import settings

logger = logging.getLogger(__name__)

_s3_client = None


def _get_s3():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=BotoConfig(signature_version="s3v4"),
            region_name="auto",
        )
    return _s3_client


def _sync_put(bucket: str, key: str, body: bytes, content_type: str):
    _get_s3().put_object(Bucket=bucket, Key=key, Body=body, ContentType=content_type)


def _sync_delete(bucket: str, key: str):
    _get_s3().delete_object(Bucket=bucket, Key=key)


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def generate_filename(original_filename: Optional[str] = None) -> str:
    """Generate a unique filename preserving the original extension."""
    ext = "bin"
    if original_filename and "." in original_filename:
        ext = original_filename.rsplit(".", 1)[-1].lower()
    return f"{_uuid.uuid4()}.{ext}"


def platform_url(key: str) -> str:
    """Build public URL for the platform bucket."""
    return f"{settings.R2_PLATFORM_PUBLIC_URL}/{key}"


def workspace_url(key: str) -> str:
    """Build public URL for the workspaces bucket."""
    return f"{settings.R2_WORKSPACES_PUBLIC_URL}/{key}"


# ---------------------------------------------------------------------------
# Platform bucket  (global system assets)
# ---------------------------------------------------------------------------

async def upload_platform_asset(
    content: bytes,
    key: str,
    content_type: str = "image/png",
) -> str:
    """Upload a global platform asset (exercise image, food photo, etc.)."""
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            None,
            partial(_sync_put, settings.R2_PLATFORM_BUCKET, key, content, content_type),
        )
    except Exception:
        logger.exception("R2 platform upload failed key=%s", key)
        raise
    return platform_url(key)


# ---------------------------------------------------------------------------
# Workspace bucket  (per-workspace user content)
# ---------------------------------------------------------------------------

def _ws_key(workspace_id, *parts: str) -> str:
    """Build a workspace-scoped key: w/{workspace_id}/parts..."""
    return f"w/{workspace_id}/{'/'.join(parts)}"


async def upload_workspace_file(
    content: bytes,
    workspace_id,
    *path_parts: str,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload a file scoped to a workspace.

    Examples:
        upload_workspace_file(data, ws_id, "clients", client_id, "avatar", fname)
        upload_workspace_file(data, ws_id, "branding", fname)
    """
    key = _ws_key(workspace_id, *path_parts)
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            None,
            partial(_sync_put, settings.R2_WORKSPACES_BUCKET, key, content, content_type),
        )
    except Exception:
        logger.exception("R2 workspace upload failed key=%s", key)
        raise
    return workspace_url(key)


async def delete_workspace_file(workspace_id, *path_parts: str) -> None:
    """Delete a file from the workspace bucket."""
    key = _ws_key(workspace_id, *path_parts)
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            None,
            partial(_sync_delete, settings.R2_WORKSPACES_BUCKET, key),
        )
    except Exception:
        logger.exception("R2 workspace delete failed key=%s", key)
