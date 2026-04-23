"""Update system form allergy options to match onboarding list.

Revision ID: 044
Revises: 043
Create Date: 2026-04-20

Actualiza las opciones del campo ``sys_nut_allergies`` del formulario
global "Cuestionario alimentación" para que coincidan EXACTAMENTE con
el listado unificado de alergias/intolerancias que se pide en el
onboarding del cliente y se muestra en el detalle del cliente.

Antes: opciones como "Altramuces", "Apio", "Soja", "Huevos", "Lácteos"…
Después: las 7 categorías solicitadas por el equipo de nutrición más
el resto de alérgenos UE 14 y intolerancias habituales, con la misma
descripción que el cliente ve en el detalle.

El listado se mantiene sincronizado con
``frontend/src/constants/allergens.ts`` (`ALL_DIETARY_FORM_OPTIONS`).
"""
from alembic import op


revision = "044"
down_revision = "043"
branch_labels = None
depends_on = None


# Lista ÚNICA de opciones (debe estar en el mismo orden que
# DIETARY_RESTRICTIONS en frontend/src/constants/allergens.ts).
NEW_OPTIONS = [
    "Lactosa (leche y derivados)",
    "Fructosa (frutas y miel)",
    "Gluten (trigo, cebada, centeno)",
    "Sorbitol (edulcorantes y frutas de hueso)",
    "Sulfitos (vino y conservas)",
    "Histamina (fermentados y embutidos)",
    "Glutamato monosódico (ultraprocesados)",
    "Huevo",
    "Pescado",
    "Mariscos (crustáceos)",
    "Moluscos",
    "Frutos secos",
    "Cacahuete",
    "Soja",
    "Apio",
    "Mostaza",
    "Sésamo",
    "Altramuces",
    "FODMAP",
    "Cafeína",
    "Alcohol",
]


# Opciones anteriores, para permitir un downgrade limpio.
OLD_OPTIONS = [
    "Altramuces",
    "Apio",
    "Soja",
    "Huevos",
    "Crustáceos",
    "Gluten",
    "Pescado",
    "Mostaza",
    "Sésamo",
    "Cacahuetes",
    "Moluscos",
    "Sulfitos",
    "Frutos Secos",
    "Lácteos",
]


def _update_sql(options: list[str]) -> str:
    # Formato JSON seguro: escapamos apóstrofos SQL y envolvemos en VALUES().
    def _esc(text: str) -> str:
        return text.replace("'", "''")

    values_sql = ", ".join("('" + _esc(o) + "')" for o in options)
    return f"""
        UPDATE forms
        SET schema = jsonb_set(
            schema,
            '{{fields}}',
            (
                SELECT jsonb_agg(
                    CASE
                        WHEN f->>'id' = 'sys_nut_allergies'
                        THEN jsonb_set(f, '{{options}}', (
                            SELECT jsonb_agg(v)
                            FROM (VALUES {values_sql}) AS t(v)
                        ))
                        ELSE f
                    END
                    ORDER BY (f->>'order')::int
                )
                FROM jsonb_array_elements(schema->'fields') AS f
            )
        )
        WHERE is_global = TRUE AND name = 'Cuestionario alimentación';
    """


def upgrade() -> None:
    op.execute(_update_sql(NEW_OPTIONS))


def downgrade() -> None:
    op.execute(_update_sql(OLD_OPTIONS))
