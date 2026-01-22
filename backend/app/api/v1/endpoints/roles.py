"""Custom role management endpoints.

NOTE: The custom_roles table does not exist in the current Supabase schema.
These endpoints are disabled until the table is created.
"""
from fastapi import APIRouter

router = APIRouter()

# All custom role endpoints disabled - table does not exist in current schema
# To enable, create the custom_roles table in Supabase and restore the endpoints
