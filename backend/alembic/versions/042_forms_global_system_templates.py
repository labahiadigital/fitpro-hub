"""Forms global/system templates

Revision ID: 042
Revises: 041
Create Date: 2026-04-21

Hace que ``forms.workspace_id`` pueda ser NULL y añade la columna
``is_global`` para marcar formularios como plantillas del sistema
compartidas por todos los workspaces (se pueden copiar pero no editar).

Además inserta la plantilla "Cuestionario alimentación" como primer
formulario global.
"""
from alembic import op
import sqlalchemy as sa


revision = "042"
down_revision = "041"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Permitir formularios "de sistema" sin workspace
    op.alter_column("forms", "workspace_id", nullable=True)

    # Flag para plantillas globales del sistema
    op.add_column(
        "forms",
        sa.Column(
            "is_global",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_forms_is_global "
        "ON forms (is_global) WHERE is_global = TRUE"
    )

    # Seed: Cuestionario alimentación (plantilla del sistema)
    op.execute(
        """
        INSERT INTO forms (workspace_id, created_by, name, description, form_type, schema, settings, is_active, is_global)
        SELECT
          NULL,
          NULL,
          'Cuestionario alimentación',
          'Este formulario lo tendremos en cuenta, siempre que se pueda, nuestro objetivo principal es conseguir tus objetivos nutricionales.',
          'custom',
          '{"fields": [
            {"id": "sys_nut_fav_foods", "type": "textarea", "label": "¿Cuáles son tus alimentos favoritos o imprescindibles que te gustaría incluir?", "placeholder": "Ten en cuenta que no siempre se podrán incluir para cumplir con los objetivos", "required": true, "order": 0},
            {"id": "sys_nut_sharing", "type": "select", "label": "¿Con quién sueles compartir tus comidas principales?", "required": true, "options": ["Solo", "En pareja", "En familia"], "order": 1},
            {"id": "sys_nut_kitchen_logistics", "type": "select", "label": "¿Cómo es tu logística de cocina semanal?", "required": true, "options": ["Cocino yo todos los días.", "Cocina otra persona en casa.", "Hago batch cooking (cocino un día para toda la semana).", "Compro comida preparada/salgo fuera."], "order": 2},
            {"id": "sys_nut_cook_time", "type": "select", "label": "En promedio, ¿cuánto tiempo puedes dedicar a preparar una comida principal?", "required": true, "options": ["Menos de 15 min.", "De 15 a 30 min.", "De 30 a 60 min.", "Más de 60 min."], "order": 3},
            {"id": "sys_nut_typical_day", "type": "textarea", "label": "Por favor, describe qué comes y bebes típicamente en un día.", "required": true, "order": 4},
            {"id": "sys_nut_cravings", "type": "textarea", "label": "¿Experimentas picos de ansiedad o ganas intensas de comer ciertos alimentos? ¿En qué momento del día?", "required": true, "order": 5},
            {"id": "sys_nut_emotional", "type": "textarea", "label": "¿Sueles comer por aburrimiento, estrés o tristeza? (Hambre emocional)", "required": true, "order": 6},
            {"id": "sys_nut_alcohol", "type": "text", "label": "¿Cómo es tu consumo de alcohol semanal? (Frecuencia y cantidad)", "required": true, "order": 7},
            {"id": "sys_nut_sugary", "type": "text", "label": "¿Cuál es tu consumo típico de refrescos, zumos o bebidas azucaradas al día?", "required": true, "order": 8},
            {"id": "sys_nut_allergies", "type": "multiselect", "label": "¿Tienes alguna alergia alimentaria diagnosticada?", "required": true, "options": ["Altramuces", "Apio", "Soja", "Huevos", "Crustáceos", "Gluten", "Pescado", "Mostaza", "Sésamo", "Cacahuetes", "Moluscos", "Sulfitos", "Frutos Secos", "Lácteos"], "order": 9},
            {"id": "sys_nut_other_allergy", "type": "text", "label": "¿Tienes alguna otra alergia alimentaria diagnosticada no indicada anteriormente?", "required": true, "order": 10},
            {"id": "sys_nut_dislikes", "type": "textarea", "label": "¿Hay alimentos que NO te gusten y prefieras excluir de tu plan?", "required": true, "order": 11}
          ]}'::jsonb,
          '{"allow_edit": false, "reminder_days": 3, "send_reminder": true, "require_signature": false, "send_on_onboarding": true}'::jsonb,
          TRUE,
          TRUE
        WHERE NOT EXISTS (
          SELECT 1 FROM forms WHERE is_global = TRUE AND name = 'Cuestionario alimentación'
        );
        """
    )


def downgrade() -> None:
    op.execute(
        "DELETE FROM forms WHERE is_global = TRUE AND name = 'Cuestionario alimentación'"
    )
    op.execute("DROP INDEX IF EXISTS idx_forms_is_global")
    op.drop_column("forms", "is_global")
    op.alter_column("forms", "workspace_id", nullable=False)
