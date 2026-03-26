"""
Unified file storage via Cloudflare R2 (S3-compatible API).

All uploads (avatars, progress photos, documents, etc.) go to a single R2 bucket
organized by prefix:
  - avatars/{client_id}/{uuid}.ext
  - progress-photos/{client_id}/{uuid}.ext
  - documents/{workspace_id}/{client_id}/{uuid}.ext
"""
import asyncio
import uuid
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


def _sync_upload(bucket: str, key: str, body: bytes, content_type: str):
    s3 = _get_s3()
    s3.put_object(Bucket=bucket, Key=key, Body=body, ContentType=content_type)


async def upload_file(
    content: bytes,
    prefix: str,
    filename: str,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload a file to R2 and return its public URL.

    Runs the blocking S3 call in a thread pool to avoid blocking the event loop.
    """
    key = f"{prefix}/{filename}"
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            partial(_sync_upload, settings.R2_BUCKET_NAME, key, content, content_type),
        )
    except Exception:
        logger.exception("R2 upload failed for key=%s", key)
        raise

    return f"{settings.R2_PUBLIC_URL}/{key}"


def generate_filename(original_filename: Optional[str] = None) -> str:
    """Generate a unique filename preserving the original extension."""
    ext = "bin"
    if original_filename and "." in original_filename:
        ext = original_filename.rsplit(".", 1)[-1].lower()
    return f"{uuid.uuid4()}.{ext}"
