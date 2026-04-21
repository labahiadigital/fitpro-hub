"""Forms is_required + Actividad Física y Descanso template

Revision ID: 043
Revises: 042
Create Date: 2026-04-22

1. Añade la columna ``forms.is_required`` (booleano) que marca un
   formulario como obligatorio para el cliente. Los formularios
   obligatorios deben permanecer visibles en las notificaciones del
   cliente (con indicador rojo) hasta que se rellenan.
2. Inserta la segunda plantilla global del sistema:
   "Actividad Física y Descanso".
"""
from alembic import op
import sqlalchemy as sa


revision = "043"
down_revision = "042"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # is_required (obligatorio) — default false
    op.add_column(
        "forms",
        sa.Column(
            "is_required",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # Seed: Actividad Física y Descanso (plantilla del sistema)
    op.execute(
        r"""
        INSERT INTO forms (workspace_id, created_by, name, description, form_type, schema, settings, is_active, is_global, is_required)
        SELECT
          NULL,
          NULL,
          'Actividad Física y Descanso',
          'Cuestionario que nos ayuda a entender tu nivel de actividad, tipo de entrenamiento, descanso, lugar y material disponible para personalizar tu plan.',
          'custom',
          '{"fields": [
            {"id": "sys_act_daily_level", "type": "radio", "label": "¿Cómo describirías tu nivel de movimiento en tu día a día (trabajo/estilo de vida)?", "required": true, "options": ["Nada (Inactivo) — paso prácticamente todo el día sentado o tumbado.", "Sedentario — mayor parte del día sentado, con desplazamientos mínimos a pie.", "Ligeramente activo — paso parte del día de pie o caminando distancias cortas.", "Activo / Muy activo — trabajo físico intenso o movimiento constante durante muchas horas."], "order": 0},
            {"id": "sys_act_training_type", "type": "checkbox", "label": "¿Qué tipo de entrenamiento o deporte realizas de forma planificada?", "required": true, "options": ["Nada", "Pesas / Fuerza (Gimnasio)", "Pesas / Fuerza (En casa)", "Cardio (Correr, nadar, bici)", "Clases colectivas (Crossfit, HIIT, Yoga, Pilates)", "Deportes de equipo"], "order": 1},
            {"id": "sys_act_frequency", "type": "radio", "label": "¿Cuántos días a la semana entrenas?", "required": true, "options": ["Nada", "1 a 2 días", "3 a 4 días", "5 o más días"], "order": 2},
            {"id": "sys_act_duration", "type": "radio", "label": "¿Cuánto tiempo dura cada sesión de entrenamiento?", "required": true, "options": ["Nada", "Menos de 30 minutos", "30 a 60 minutos", "60 a 90 minutos", "Más de 90 minutos"], "order": 3},
            {"id": "sys_act_intensity", "type": "radio", "label": "Cuando realizas actividad, ¿qué intensidad sueles aplicar?", "required": true, "options": ["Nada", "Baja (Ritmo muy tranquilo)", "Media (Esfuerzo moderado, respiración algo agitada)", "Alta (Esfuerzo intenso)"], "order": 4},
            {"id": "sys_act_feeling", "type": "radio", "label": "Cuando realizas actividad, ¿cómo te sientes?", "required": true, "options": ["Excelente (puedo hablar sin esfuerzo)", "Normal (me cuesta hablar, pero aguanto)", "Mal (no puedo hablar)"], "order": 5},
            {"id": "sys_act_sleep_hours", "type": "number", "label": "¿Cuántas horas duermes de media al día?", "required": true, "placeholder": "Ej: 7", "order": 6},
            {"id": "sys_act_sleep_quality", "type": "radio", "label": "¿Cómo es la calidad de tu descanso?", "required": true, "options": ["Mala (me despierto cansado)", "Regular", "Buena (reparadora)"], "order": 7},
            {"id": "sys_act_location", "type": "radio", "label": "¿Dónde vas a realizar tu plan de entrenamiento?", "required": true, "options": ["En ningún sitio (Nada)", "Gimnasio comercial completo", "En casa (Sin material)", "En casa (Con algo de material: mancuernas, bandas)", "Exterior / Parque de calistenia"], "order": 8},
            {"id": "sys_act_home_material", "type": "checkbox", "label": "Si entrenas en casa, ¿de qué material dispones?", "required": false, "options": ["Nada", "Mancuernas / Pesas rusas (Kettlebells)", "Bandas elásticas", "Barra de dominadas", "Banco o soporte"], "order": 9},
            {"id": "sys_act_skills", "type": "checkbox", "label": "¿Qué habilidades quieres trabajar especialmente?", "required": false, "options": ["Fuerza", "Velocidad", "Potencia", "Flexibilidad", "Movilidad"], "order": 10},
            {"id": "sys_act_experience", "type": "radio", "label": "Capacidad de entrenamiento", "required": true, "options": ["Iniciación — no tengo mucha experiencia", "Intermedio — llevo algunos meses entrenando", "Avanzado — llevo muchos años entrenando"], "order": 11},
            {"id": "sys_act_muscle_focus", "type": "checkbox", "label": "Si quieres potenciar uno o varios grupos musculares indícalo", "required": false, "options": ["Brazos", "Abdominales", "Pecho", "Espalda", "Glúteos", "Hombros", "Piernas"], "order": 12},
            {"id": "sys_act_no_cardio_machines", "type": "checkbox", "label": "Máquinas de cardio que NO dispones en tu lugar de entrenamiento (podrás modificarlo más adelante)", "required": false, "options": ["Assault Bike", "Bicicleta estática", "Cinta de correr", "Elíptica", "Máquina de remo sentado", "Máquina escaladora", "Remoergómetro", "Stepper"], "order": 13},
            {"id": "sys_act_no_strength_machines", "type": "checkbox", "label": "Máquinas de fuerza que NO dispones en tu lugar de entrenamiento (podrás modificarlo más adelante)", "required": false, "options": ["Banco abdominal", "Banco lumbar 45°", "Máquina crunch abdominal", "Máquina de Abducción de Piernas", "Máquina de Aducción de Piernas", "Máquina de Poleas", "Máquina de apertura de pecho", "Máquina de bíceps", "Máquina de extensión de Isquiotibiales", "Máquina de extensión de cuádriceps", "Máquina de tríceps", "Máquina dominadas", "Máquina elevación gemelos", "Máquina patada trasera glúteo", "Máquina press militar", "Máquina press pecho", "Máquina tracción de espalda", "Multipower", "Prensa de piernas horizontal", "Prensa de piernas inclinada", "Prensa de piernas vertical"], "order": 14},
            {"id": "sys_act_no_materials", "type": "checkbox", "label": "Materiales que NO dispones en tu lugar de entrenamiento (podrás modificarlo más adelante)", "required": false, "options": ["Balón medicinal", "Banco Inclinado Regulable", "Banco Plano", "Bandas Box", "Bandas Elásticas", "Barra Z", "Barra de dominadas", "Barra olímpica", "Barra para Flexiones", "Barras Paralelas", "Barras para Dominadas de Pared", "Bosu", "Cajón de altura", "Comba", "Conos", "Cuerda de batalla", "Cuerda de boxeo", "Deslizantes", "Disco", "Fitball", "Guantes de Boxeo", "Kettlebell (Kb)", "Mancuernas", "Miniband", "Pera de Boxeo", "Rodillo", "Rueda Abdominal", "Saco de Boxeo", "Step", "TRX"], "order": 15}
          ]}'::jsonb,
          '{"allow_edit": false, "reminder_days": 3, "send_reminder": true, "require_signature": false, "send_on_onboarding": true}'::jsonb,
          TRUE,
          TRUE,
          FALSE
        WHERE NOT EXISTS (
          SELECT 1 FROM forms WHERE is_global = TRUE AND name = 'Actividad Física y Descanso'
        );
        """
    )


def downgrade() -> None:
    op.execute(
        "DELETE FROM forms WHERE is_global = TRUE AND name = 'Actividad Física y Descanso'"
    )
    op.drop_column("forms", "is_required")
