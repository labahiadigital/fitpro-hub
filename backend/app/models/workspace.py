from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


# Default CRM field configuration
DEFAULT_CRM_FIELDS = {
    "groups": [
        {
            "id": "personal",
            "name": "Información Personal",
            "order": 1,
            "fields": ["first_name", "last_name", "email", "phone", "birth_date", "gender"]
        },
        {
            "id": "physical",
            "name": "Datos Físicos",
            "order": 2,
            "fields": ["height_cm", "weight_kg", "body_fat", "muscle_mass"]
        },
        {
            "id": "health",
            "name": "Salud",
            "order": 3,
            "fields": ["allergies", "intolerances", "injuries", "health_data"]
        },
        {
            "id": "goals",
            "name": "Objetivos y Notas",
            "order": 4,
            "fields": ["goals", "internal_notes"]
        }
    ],
    "fields": {
        "first_name": {"label": "Nombre", "type": "text", "required": True, "visible": True},
        "last_name": {"label": "Apellidos", "type": "text", "required": True, "visible": True},
        "email": {"label": "Email", "type": "email", "required": True, "visible": True},
        "phone": {"label": "Teléfono", "type": "phone", "required": False, "visible": True},
        "birth_date": {"label": "Fecha de Nacimiento", "type": "date", "required": False, "visible": True},
        "gender": {"label": "Género", "type": "select", "required": False, "visible": True, "options": ["male", "female", "other"]},
        "height_cm": {"label": "Altura (cm)", "type": "number", "required": False, "visible": True},
        "weight_kg": {"label": "Peso (kg)", "type": "number", "required": False, "visible": True},
        "body_fat": {"label": "% Grasa Corporal", "type": "number", "required": False, "visible": True},
        "muscle_mass": {"label": "Masa Muscular (kg)", "type": "number", "required": False, "visible": True},
        "allergies": {"label": "Alergias", "type": "multiselect", "required": False, "visible": True},
        "intolerances": {"label": "Intolerancias", "type": "multiselect", "required": False, "visible": True},
        "injuries": {"label": "Lesiones", "type": "json", "required": False, "visible": True},
        "health_data": {"label": "Datos de Salud", "type": "json", "required": False, "visible": True},
        "goals": {"label": "Objetivos", "type": "textarea", "required": False, "visible": True},
        "internal_notes": {"label": "Notas Internas", "type": "textarea", "required": False, "visible": True},
    },
    "custom_fields": []  # User-defined custom fields
}


class Workspace(BaseModel):
    __tablename__ = "workspaces"
    
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    domain = Column(String(255), unique=True, nullable=True)
    description = Column(Text, nullable=True)
    
    # Branding
    logo_url = Column(String(500), nullable=True)
    branding = Column(JSONB, default={
        "primary_color": "#2D6A4F",
        "secondary_color": "#40916C",
        "accent_color": "#F08A5D"
    })
    
    # Settings
    settings = Column(JSONB, default={
        "timezone": "Europe/Madrid",
        "currency": "EUR",
        "language": "es",
        "booking_policies": {
            "cancellation_hours": 24,
            "reschedule_hours": 12,
            "max_advance_days": 30
        },
        "payment_gateway": "stripe",  # stripe, redsys, or both
        "redsys_enabled": False,
    })
    
    # CRM field configuration (editable by trainer)
    crm_config = Column(JSONB, default=DEFAULT_CRM_FIELDS)
    
    # Meal name configuration (editable names for meals)
    meal_names = Column(JSONB, default={
        "meal_1": "Desayuno",
        "meal_2": "Media Mañana",
        "meal_3": "Almuerzo",
        "meal_4": "Merienda",
        "meal_5": "Cena",
        "meal_6": "Pre-entreno",
        "meal_7": "Post-entreno",
    })
    
    # Glossary for tooltips (acronyms and terms)
    glossary = Column(JSONB, default={
        "RM": "Repetición Máxima - El peso máximo que puedes levantar una vez",
        "RPE": "Rate of Perceived Exertion - Escala de esfuerzo percibido del 1 al 10",
        "AMRAP": "As Many Reps As Possible - Tantas repeticiones como sea posible",
        "EMOM": "Every Minute On the Minute - Cada minuto durante un minuto",
        "PR": "Personal Record - Récord personal",
        "WOD": "Workout Of the Day - Entrenamiento del día",
        "HIIT": "High Intensity Interval Training - Entrenamiento de intervalos de alta intensidad",
        "LISS": "Low Intensity Steady State - Cardio de baja intensidad constante",
        "TUT": "Time Under Tension - Tiempo bajo tensión",
        "RIR": "Reps In Reserve - Repeticiones en reserva",
        "TDEE": "Total Daily Energy Expenditure - Gasto energético diario total",
        "BMR": "Basal Metabolic Rate - Tasa metabólica basal",
        "NEAT": "Non-Exercise Activity Thermogenesis - Termogénesis por actividad no relacionada con ejercicio",
        "KCAL": "Kilocalorías - Unidad de energía",
        "MACROS": "Macronutrientes - Proteínas, carbohidratos y grasas",
    })
    
    # Relationships
    users = relationship("UserRole", back_populates="workspace", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="workspace", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="workspace", cascade="all, delete-orphan")
    workout_programs = relationship("WorkoutProgram", back_populates="workspace", cascade="all, delete-orphan")
    meal_plans = relationship("MealPlan", back_populates="workspace", cascade="all, delete-orphan")
    forms = relationship("Form", back_populates="workspace", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="workspace", cascade="all, delete-orphan")
    stripe_account = relationship("StripeAccount", back_populates="workspace", uselist=False)
    automations = relationship("Automation", back_populates="workspace", cascade="all, delete-orphan")
    custom_roles = relationship("CustomRole", back_populates="workspace", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Workspace {self.name}>"

