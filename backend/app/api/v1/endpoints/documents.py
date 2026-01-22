"""Document and progress photo management endpoints.

NOTE: This module is disabled because the 'documents' and 'progress_photos'
tables do not exist in the current Supabase schema.
"""
from fastapi import APIRouter

router = APIRouter()

# All document endpoints are disabled - tables do not exist in DB
# To enable, create the tables first and uncomment the endpoints

@router.get("/status")
async def documents_status():
    """Check document module status."""
    return {
        "status": "disabled",
        "message": "Document and progress photo tables not available in current schema"
    }
