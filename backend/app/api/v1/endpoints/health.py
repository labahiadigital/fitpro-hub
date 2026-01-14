"""Health data endpoints - allergens, diseases, etc."""
from fastapi import APIRouter

from app.schemas.health import (
    AllergenListResponse, DiseaseListResponse, IntoleranceListResponse,
    COMMON_ALLERGENS, COMMON_DISEASES, COMMON_INTOLERANCES
)

router = APIRouter()


@router.get("/allergens", response_model=AllergenListResponse)
async def list_common_allergens():
    """
    Obtener lista de alergenos alimentarios comunes (UE 14 + adicionales).
    """
    return AllergenListResponse(allergens=COMMON_ALLERGENS)


@router.get("/diseases", response_model=DiseaseListResponse)
async def list_common_diseases():
    """
    Obtener lista de enfermedades y condiciones médicas comunes.
    """
    return DiseaseListResponse(diseases=COMMON_DISEASES)


@router.get("/intolerances", response_model=IntoleranceListResponse)
async def list_common_intolerances():
    """
    Obtener lista de intolerancias alimentarias comunes.
    """
    return IntoleranceListResponse(intolerances=COMMON_INTOLERANCES)
