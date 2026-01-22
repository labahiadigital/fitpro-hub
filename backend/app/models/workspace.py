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
        "payment_gateway": "stripe",
        "redsys_enabled": False,
    })
    
    # NOTE: crm_config, meal_names, and glossary columns do not exist in current Supabase schema
    # They would need to be added via migration if needed
    
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
    # custom_roles relationship removed - table does not exist in current schema
    
    def __repr__(self):
        return f"<Workspace {self.name}>"

