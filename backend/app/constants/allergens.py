"""Listado unificado de restricciones alimentarias.

Mantener sincronizado con ``frontend/src/constants/allergens.ts``.

Los ``id`` son estables (guardados en ``client.health_data``) y los
``label`` coinciden exactamente con las opciones del formulario
global "Cuestionario alimentación" (pregunta ``sys_nut_allergies``).

Usar estas tablas para:
  - Pre-rellenar el cuestionario con las alergias/intolerancias que el
    cliente ya tiene en su ficha.
  - Sincronizar las respuestas del cliente al ``health_data`` del cliente
    al enviar el formulario.
"""

from typing import Literal, Tuple


DietaryCategory = Literal["allergy", "intolerance"]


# (id, short_label, label, category)
DIETARY_RESTRICTIONS: list[Tuple[str, str, str, DietaryCategory]] = [
    ("lactosa", "Lactosa", "Lactosa (leche y derivados)", "intolerance"),
    ("fructosa", "Fructosa", "Fructosa (frutas y miel)", "intolerance"),
    ("gluten", "Gluten", "Gluten (trigo, cebada, centeno)", "allergy"),
    ("sorbitol", "Sorbitol", "Sorbitol (edulcorantes y frutas de hueso)", "intolerance"),
    ("sulfitos", "Sulfitos", "Sulfitos (vino y conservas)", "allergy"),
    ("histamina", "Histamina", "Histamina (fermentados y embutidos)", "intolerance"),
    ("glutamato_monosodico", "Glutamato monosódico", "Glutamato monosódico (ultraprocesados)", "intolerance"),
    ("huevo", "Huevo", "Huevo", "allergy"),
    ("pescado", "Pescado", "Pescado", "allergy"),
    ("mariscos", "Mariscos", "Mariscos (crustáceos)", "allergy"),
    ("moluscos", "Moluscos", "Moluscos", "allergy"),
    ("frutos_secos", "Frutos secos", "Frutos secos", "allergy"),
    ("cacahuete", "Cacahuete", "Cacahuete", "allergy"),
    ("soja", "Soja", "Soja", "allergy"),
    ("apio", "Apio", "Apio", "allergy"),
    ("mostaza", "Mostaza", "Mostaza", "allergy"),
    ("sesamo", "Sésamo", "Sésamo", "allergy"),
    ("altramuces", "Altramuces", "Altramuces", "allergy"),
    ("fodmap", "FODMAP", "FODMAP", "intolerance"),
    ("cafeina", "Cafeína", "Cafeína", "intolerance"),
    ("alcohol", "Alcohol", "Alcohol", "intolerance"),
]


ID_TO_LABEL: dict[str, str] = {r[0]: r[2] for r in DIETARY_RESTRICTIONS}
SHORT_LABEL_TO_ID: dict[str, str] = {r[1].lower(): r[0] for r in DIETARY_RESTRICTIONS}
LABEL_TO_ID: dict[str, str] = {r[2].lower(): r[0] for r in DIETARY_RESTRICTIONS}


def label_to_id(label: str) -> str:
    """Devuelve el id interno a partir de un label conocido (label completo,
    short label o el propio id). Si no se reconoce, devuelve el valor
    original en minúsculas y con espacios sustituidos por "_".
    """
    if not label:
        return ""
    key = label.strip().lower()
    if key in LABEL_TO_ID:
        return LABEL_TO_ID[key]
    if key in SHORT_LABEL_TO_ID:
        return SHORT_LABEL_TO_ID[key]
    # Ya puede ser un id en snake_case.
    normalized = key.replace(" ", "_")
    if normalized in ID_TO_LABEL:
        return normalized
    return normalized


def id_to_label(identifier: str) -> str:
    """Devuelve el label para mostrar. Si no se reconoce, el propio id."""
    if not identifier:
        return ""
    return ID_TO_LABEL.get(identifier, identifier)


ALLERGY_IDS = {r[0] for r in DIETARY_RESTRICTIONS if r[3] == "allergy"}
INTOLERANCE_IDS = {r[0] for r in DIETARY_RESTRICTIONS if r[3] == "intolerance"}
