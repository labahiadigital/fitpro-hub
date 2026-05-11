"""Add personal data (birth date, gender, height, weight) to Cuestionario Inicial.

Revision ID: 060
Revises: 059
Create Date: 2026-05-11

Antes el cliente rellenaba peso, altura y fecha de nacimiento en la
pantalla de onboarding (``InvitationOnboardingPage``) ANTES del pago,
lo que confundía a la gente porque no entendía a quién pertenecían
esos datos. Después del refactor 053 la invitación solo pide datos
mínimos (nombre, email, teléfono, consentimientos) y dejaba huérfanos
peso/altura/fecha de nacimiento: el cliente acababa registrado sin
esos campos y el entrenador no podía calcularle la dieta.

Esta migración añade esos 4 campos (fecha de nacimiento, género,
altura y peso) al principio del schema del formulario global
"Cuestionario Inicial Trackfiz" (form_type=system, is_global=true)
para que el cliente los rellene como primer paso del cuestionario que
ya recibe automáticamente al aceptar la invitación.

El backend (``forms.py::_apply_form_submission_to_client``) lo
correspondiente vuelve a volcar estos valores a las columnas
``clients.birth_date``, ``clients.gender``, ``clients.height_cm`` y
``clients.weight_kg`` (no sólo a ``health_data``), de forma que la
ficha del entrenador los muestra exactamente igual que si los hubiese
rellenado él manualmente.

Idempotente: si el campo ya existe (por re-ejecución), lo respeta.
"""
from alembic import op


revision = "060"
down_revision = "059"
branch_labels = None
depends_on = None


# Bloque de 4 campos nuevos que se inserta al principio del schema.
# Los ``order`` 0..3 corresponden a la primera "página" mental del
# cuestionario: "Háblanos de ti". El resto de campos se desplaza +4.
NEW_FIELDS_JSON = """[
    {"id": "sys_init_birth_date", "type": "date", "label": "Fecha de nacimiento", "required": true, "order": 0},
    {"id": "sys_init_gender", "type": "select", "label": "Género", "required": true, "options": ["Hombre", "Mujer", "Otro"], "order": 1},
    {"id": "sys_init_height_cm", "type": "number", "label": "Altura (cm)", "placeholder": "Ej: 170", "required": true, "validation": {"min": 100, "max": 250}, "order": 2},
    {"id": "sys_init_weight_kg", "type": "number", "label": "Peso actual (kg)", "placeholder": "Ej: 70", "required": true, "validation": {"min": 30, "max": 300}, "order": 3}
]"""


def upgrade() -> None:
    # 1) Desplaza el ``order`` de los campos existentes +4 para hacer
    #    sitio a los 4 nuevos al principio. NO afecta al contenido.
    op.execute(
        """
        UPDATE forms
        SET schema = jsonb_set(
            schema,
            '{fields}',
            (
                SELECT jsonb_agg(
                    jsonb_set(f, '{order}', to_jsonb(((f->>'order')::int) + 4))
                    ORDER BY (f->>'order')::int
                )
                FROM jsonb_array_elements(schema->'fields') AS f
            )
        )
        WHERE is_global = TRUE
          AND form_type = 'system'
          AND name = 'Cuestionario Inicial Trackfiz'
          AND NOT EXISTS (
              SELECT 1
              FROM jsonb_array_elements(schema->'fields') f
              WHERE f->>'id' = 'sys_init_birth_date'
          );
        """
    )

    # 2) Añade los 4 campos nuevos al principio. Idempotente: si ya
    #    están (por re-ejecución del paso 1 abortado), no hace nada.
    op.execute(
        f"""
        UPDATE forms
        SET schema = jsonb_set(
            schema,
            '{{fields}}',
            ('{NEW_FIELDS_JSON}'::jsonb || (schema->'fields'))
        )
        WHERE is_global = TRUE
          AND form_type = 'system'
          AND name = 'Cuestionario Inicial Trackfiz'
          AND NOT EXISTS (
              SELECT 1
              FROM jsonb_array_elements(schema->'fields') f
              WHERE f->>'id' = 'sys_init_birth_date'
          );
        """
    )


def downgrade() -> None:
    # Elimina los 4 campos y restaura el ``order`` original.
    op.execute(
        """
        UPDATE forms
        SET schema = jsonb_set(
            schema,
            '{fields}',
            (
                SELECT jsonb_agg(
                    jsonb_set(f, '{order}', to_jsonb(((f->>'order')::int) - 4))
                    ORDER BY (f->>'order')::int
                )
                FROM jsonb_array_elements(schema->'fields') AS f
                WHERE f->>'id' NOT IN (
                    'sys_init_birth_date',
                    'sys_init_gender',
                    'sys_init_height_cm',
                    'sys_init_weight_kg'
                )
            )
        )
        WHERE is_global = TRUE
          AND form_type = 'system'
          AND name = 'Cuestionario Inicial Trackfiz';
        """
    )
