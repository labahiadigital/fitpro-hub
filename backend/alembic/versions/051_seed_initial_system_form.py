"""Seed system form template "Cuestionario Inicial Trackfiz".

Revision ID: 051
Revises: 050
Create Date: 2026-05-01

Inserta el formulario obligatorio del Sistema que cada cliente completa
después del pago. Reemplaza al cuestionario que se rellenaba dentro del
flujo de invitación (objetivos, salud, PAR-Q, alergias). Distinto de las
"plantillas globales" porque va con ``form_type = 'system'``: el frontend
lo trata como built-in (no se edita ni se copia) y el backend lo asigna
de forma automática a cada cliente nuevo.
"""
from alembic import op


revision = "051"
down_revision = "050"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        r"""
        INSERT INTO forms (workspace_id, created_by, name, description, form_type, schema, settings, is_active, is_global, is_required)
        SELECT
          NULL,
          NULL,
          'Cuestionario Inicial Trackfiz',
          'Cuestionario obligatorio que cada cliente rellena después del pago. Recoge objetivos, datos de salud y PAR-Q para que el entrenador pueda diseñar un plan personalizado.',
          'system',
          '{"fields": [
            {"id": "sys_init_primary_goal", "type": "select", "label": "Objetivo principal", "required": true, "options": ["Perder peso", "Ganar masa muscular", "Mejorar condición física", "Mantener peso actual", "Mejorar salud general", "Rendimiento deportivo", "Rehabilitación"], "order": 0},
            {"id": "sys_init_secondary_goals", "type": "multiselect", "label": "Objetivos secundarios", "required": false, "options": ["Mejorar flexibilidad", "Aumentar fuerza", "Mejorar resistencia", "Corregir postura", "Reducir estrés", "Aumentar energía", "Mejorar sueño"], "order": 1},
            {"id": "sys_init_target_weight", "type": "number", "label": "Peso objetivo (kg)", "placeholder": "Ej: 70", "required": false, "order": 2},
            {"id": "sys_init_activity_level", "type": "select", "label": "Nivel de actividad actual", "required": true, "options": ["Sedentario (poco o nada de ejercicio)", "Ligero (1-2 días/semana)", "Moderado (3-4 días/semana)", "Activo (5-6 días/semana)", "Muy activo (ejercicio intenso diario)"], "order": 3},
            {"id": "sys_init_training_days", "type": "number", "label": "¿Cuántos días a la semana puedes entrenar?", "placeholder": "Ej: 3", "required": true, "order": 4},
            {"id": "sys_init_goals_description", "type": "textarea", "label": "Cuéntanos más sobre tus objetivos", "placeholder": "Por ejemplo: quiero perder 5kg en 3 meses, mejorar mi resistencia…", "required": false, "order": 5},

            {"id": "sys_init_has_injuries", "type": "radio", "label": "¿Tienes lesiones actuales o pasadas?", "required": true, "options": ["Sí", "No"], "order": 6},
            {"id": "sys_init_injuries_detail", "type": "textarea", "label": "Describe tus lesiones", "placeholder": "Detalle de las lesiones (zona, gravedad, año…)", "required": false, "order": 7},
            {"id": "sys_init_has_medical_conditions", "type": "radio", "label": "¿Padeces alguna condición médica?", "required": true, "options": ["Sí", "No"], "order": 8},
            {"id": "sys_init_medical_conditions_detail", "type": "textarea", "label": "Describe las condiciones médicas", "required": false, "order": 9},
            {"id": "sys_init_medications", "type": "textarea", "label": "Medicación actual", "placeholder": "Indica medicamentos que tomas regularmente", "required": false, "order": 10},
            {"id": "sys_init_allergies", "type": "multiselect", "label": "Alergias alimentarias", "required": false, "options": ["Cacahuetes", "Frutos secos", "Mariscos", "Pescado", "Lácteos", "Huevos", "Soja", "Trigo", "Sésamo", "Ninguna"], "order": 11},
            {"id": "sys_init_intolerances", "type": "multiselect", "label": "Intolerancias alimentarias", "required": false, "options": ["Lactosa", "Gluten", "Fructosa", "Histamina", "Ninguna"], "order": 12},

            {"id": "sys_init_parq_heart", "type": "radio", "label": "¿Te ha dicho alguna vez un médico que padeces alguna afección del corazón y que solo deberías hacer la actividad física que te recomiende?", "required": true, "options": ["Sí", "No"], "order": 13},
            {"id": "sys_init_parq_heart_detail", "type": "textarea", "label": "Detalle (afección cardiaca)", "required": false, "order": 14},
            {"id": "sys_init_parq_chest_pain", "type": "radio", "label": "¿Sientes dolor en el pecho cuando realizas actividad física?", "required": true, "options": ["Sí", "No"], "order": 15},
            {"id": "sys_init_parq_chest_pain_detail", "type": "textarea", "label": "Detalle (dolor en el pecho)", "required": false, "order": 16},
            {"id": "sys_init_parq_dizziness", "type": "radio", "label": "¿Has perdido el equilibrio o la consciencia tras un mareo en el último mes?", "required": true, "options": ["Sí", "No"], "order": 17},
            {"id": "sys_init_parq_dizziness_detail", "type": "textarea", "label": "Detalle (mareos / pérdida de consciencia)", "required": false, "order": 18},
            {"id": "sys_init_parq_bone_joint", "type": "radio", "label": "¿Tienes algún problema óseo o articular que pueda agravarse con el ejercicio?", "required": true, "options": ["Sí", "No"], "order": 19},
            {"id": "sys_init_parq_bone_joint_detail", "type": "textarea", "label": "Detalle (problema óseo o articular)", "required": false, "order": 20},
            {"id": "sys_init_parq_blood_pressure", "type": "radio", "label": "¿Estás siendo tratado por hipertensión o problemas cardiacos con medicamentos?", "required": true, "options": ["Sí", "No"], "order": 21},
            {"id": "sys_init_parq_blood_pressure_detail", "type": "textarea", "label": "Detalle (hipertensión / corazón)", "required": false, "order": 22},
            {"id": "sys_init_parq_other", "type": "radio", "label": "¿Conoces alguna otra razón por la que no debas realizar actividad física?", "required": true, "options": ["Sí", "No"], "order": 23},
            {"id": "sys_init_parq_other_detail", "type": "textarea", "label": "Detalle (otras razones)", "required": false, "order": 24}
          ]}'::jsonb,
          '{"allow_edit": false, "reminder_days": 3, "send_reminder": true, "require_signature": false, "send_on_onboarding": true}'::jsonb,
          TRUE,
          TRUE,
          TRUE
        WHERE NOT EXISTS (
          SELECT 1 FROM forms WHERE is_global = TRUE AND form_type = 'system' AND name = 'Cuestionario Inicial Trackfiz'
        );
        """
    )


def downgrade() -> None:
    op.execute(
        "DELETE FROM forms WHERE is_global = TRUE AND form_type = 'system' AND name = 'Cuestionario Inicial Trackfiz'"
    )
