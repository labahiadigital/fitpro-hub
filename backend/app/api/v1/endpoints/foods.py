"""Foods endpoints - simplified to match actual DB schema.

NOTE: This module is mostly redundant with /nutrition/foods endpoints.
Kept for backward compatibility but FoodCategory is disabled (table doesn't exist).
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
async def foods_status():
    """Check foods module status."""
    return {
        "status": "active",
        "message": "Use /nutrition/foods endpoints for full food functionality"
    }


# NOTE: FoodCategory endpoints disabled - table does not exist in DB
# Category is stored as text directly in foods table
