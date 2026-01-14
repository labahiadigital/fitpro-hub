"""Health-related schemas and constants."""
from typing import List, Optional
from pydantic import BaseModel


# Common food allergens (EU 14 allergens + common additions)
COMMON_ALLERGENS = [
    "gluten",
    "lactosa",
    "huevo",
    "pescado",
    "marisco",
    "frutos_secos",
    "cacahuete",
    "soja",
    "apio",
    "mostaza",
    "sesamo",
    "sulfitos",
    "moluscos",
    "altramuces",
    "maiz",
    "trigo"
]

# Common diseases and medical conditions
COMMON_DISEASES = [
    "diabetes_tipo_1",
    "diabetes_tipo_2",
    "hipertension",
    "hipotiroidismo",
    "hipertiroidismo",
    "celiaquia",
    "enfermedad_crohn",
    "colitis_ulcerosa",
    "sindrome_intestino_irritable",
    "gastritis",
    "reflujo_gastroesofagico",
    "asma",
    "artritis",
    "osteoporosis",
    "anemia",
    "insuficiencia_renal",
    "higado_graso",
    "colesterol_alto",
    "trigliceridos_altos",
    "gota",
    "fibromialgia",
    "sindrome_ovario_poliquistico",
    "endometriosis",
    "apnea_sueno",
    "depresion",
    "ansiedad"
]

# Food intolerances
COMMON_INTOLERANCES = [
    "lactosa",
    "fructosa",
    "gluten",
    "histamina",
    "sorbitol",
    "cafeina"
]


class HealthDataSchema(BaseModel):
    """
    Esquema para health_data del cliente.
    Este es un esquema de referencia, pero el campo health_data acepta cualquier JSON.
    """
    allergens: Optional[List[str]] = []  # Food allergens from COMMON_ALLERGENS
    intolerances: Optional[List[str]] = []  # Food intolerances
    diseases: Optional[List[str]] = []  # Medical conditions from COMMON_DISEASES
    medications: Optional[List[str]] = []  # Current medications
    injuries: Optional[List[str]] = []  # Current or past injuries
    activity_level: Optional[str] = None  # sedentary, light, moderate, active, very_active
    body_tendency: Optional[str] = None  # ectomorph, mesomorph, endomorph
    goal_type: Optional[str] = None  # weight_loss, muscle_gain, maintenance, performance
    goal_weight_kg: Optional[float] = None
    notes: Optional[str] = None


class AllergenListResponse(BaseModel):
    """Lista de alergenos comunes."""
    allergens: List[str]


class DiseaseListResponse(BaseModel):
    """Lista de enfermedades comunes."""
    diseases: List[str]


class IntoleranceListResponse(BaseModel):
    """Lista de intolerancias comunes."""
    intolerances: List[str]
