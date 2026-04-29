"""Seed system form template "Hábitos y estilo de vida".

Revision ID: 050
Revises: 049
Create Date: 2026-04-29

Inserta una nueva plantilla global del sistema (``forms.is_global = TRUE``)
con campos sobre rutinas, trabajo, comidas y dificultades pasadas, para
usar durante el onboarding y obtener contexto del estilo de vida del
cliente.
"""
from alembic import op


revision = "050"
down_revision = "049"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        r"""
        INSERT INTO forms (workspace_id, created_by, name, description, form_type, schema, settings, is_active, is_global, is_required)
        SELECT
          NULL,
          NULL,
          'Hábitos y estilo de vida',
          'Cuestionario sobre tus rutinas, horarios, comidas y dificultades previas. Nos ayuda a adaptar el plan a tu día a día real.',
          'custom',
          '{"fields": [
            {"id": "sys_hab_wake_up", "type": "text", "label": "¿A qué hora te despiertas?", "placeholder": "Ej: 07:30", "required": true, "order": 0},
            {"id": "sys_hab_sleep_time", "type": "text", "label": "¿A qué hora te acuestas?", "placeholder": "Ej: 23:30", "required": true, "order": 1},
            {"id": "sys_hab_work_schedule", "type": "textarea", "label": "Horario de trabajo (por franjas)", "placeholder": "Ej: 09:00 - 14:00 y 16:00 - 19:00", "required": true, "order": 2},
            {"id": "sys_hab_work_type", "type": "select", "label": "Tipo de trabajo", "options": ["Sedentario", "Mixto", "Activo"], "required": true, "order": 3},
            {"id": "sys_hab_meals_possible", "type": "select", "label": "¿Cuántas comidas podrías hacer al día?", "options": ["1", "2", "3", "4", "5", "6"], "required": true, "order": 4},
            {"id": "sys_hab_meals_current", "type": "select", "label": "¿Cuántas comidas haces actualmente al día?", "options": ["1", "2", "3", "4", "5", "6"], "required": true, "order": 5},
            {"id": "sys_hab_meal_times", "type": "textarea", "label": "¿A qué horas sueles realizar tus comidas?", "placeholder": "Ej: desayuno 08:00, comida 14:00, cena 21:00", "required": false, "order": 6},
            {"id": "sys_hab_water", "type": "text", "label": "¿Cuánta agua bebes al día (aprox.)?", "placeholder": "Ej: 2L", "required": false, "order": 7},
            {"id": "sys_hab_diet_difficulty", "type": "textarea", "label": "Mayor dificultad que has tenido al seguir un plan nutricional", "required": true, "order": 8},
            {"id": "sys_hab_training_difficulty", "type": "textarea", "label": "Mayor dificultad que has tenido al seguir un programa de entrenamiento", "required": true, "order": 9},
            {"id": "sys_hab_typical_day", "type": "textarea", "label": "Descríbeme cómo es un día a día tuyo", "required": true, "order": 10}
          ]}'::jsonb,
          '{"allow_edit": false, "reminder_days": 3, "send_reminder": true, "require_signature": false, "send_on_onboarding": true}'::jsonb,
          TRUE,
          TRUE,
          FALSE
        WHERE NOT EXISTS (
          SELECT 1 FROM forms WHERE is_global = TRUE AND name = 'Hábitos y estilo de vida'
        );
        """
    )


def downgrade() -> None:
    op.execute(
        "DELETE FROM forms WHERE is_global = TRUE AND name = 'Hábitos y estilo de vida'"
    )
