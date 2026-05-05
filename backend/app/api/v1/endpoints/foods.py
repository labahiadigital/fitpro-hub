"""Foods endpoints - simplified to match actual DB schema.

NOTE: This module is mostly redundant with /nutrition/foods endpoints.
Kept for backward compatibility but FoodCategory is disabled (table doesn't exist).
"""
from fastapi import APIRouter, Depends

from app.middleware.auth import require_workspace, CurrentUser

router = APIRouter()


@router.get("/status")
async def foods_status(
    _current_user: CurrentUser = Depends(require_workspace),
):
    """Check foods module status (solo usuarios autenticados)."""
    return {
        "status": "active",
        "message": "Use /nutrition/foods endpoints for full food functionality"
    }


# NOTE: FoodCategory endpoints disabled - table does not exist in DB
# Category is stored as text directly in foods table
