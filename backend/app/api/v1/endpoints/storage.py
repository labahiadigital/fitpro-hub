"""
Storage presigning endpoints.

All R2 buckets are private. This endpoint generates short-lived presigned URLs
for authenticated users, enforcing access control:

  - Platform assets: any authenticated user
  - Workspace assets: only users belonging to that workspace
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.middleware.auth import get_current_user, CurrentUser
from app.core import storage

router = APIRouter()


class PresignRequest(BaseModel):
    urls: List[str]


class PresignResponse(BaseModel):
    urls: dict[str, str]


@router.post("/presign", response_model=PresignResponse)
async def presign_urls(
    body: PresignRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Resolve R2 reference URLs to short-lived presigned URLs.

    Platform assets → any authenticated user can resolve.
    Workspace assets → only users belonging to the workspace can resolve.
    """
    result: dict[str, str] = {}
    platform_base = storage.settings.R2_PLATFORM_PUBLIC_URL
    workspace_base = storage.settings.R2_WORKSPACES_PUBLIC_URL

    for url in body.urls:
        if not url:
            continue

        if url.startswith(platform_base):
            key = storage.platform_key_from_url(url)
            if key:
                result[url] = await storage.presign_platform_url(key)

        elif url.startswith(workspace_base):
            key = storage.workspace_key_from_url(url)
            if not key:
                continue
            parts = key.split("/")
            if len(parts) >= 2 and parts[0] == "w":
                ws_id = parts[1]
                if str(current_user.workspace_id) != ws_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tienes acceso a este workspace",
                    )
            result[url] = await storage.presign_workspace_url(key)

    return PresignResponse(urls=result)
