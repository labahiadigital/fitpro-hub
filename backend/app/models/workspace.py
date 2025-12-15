from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


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
        }
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
    
    def __repr__(self):
        return f"<Workspace {self.name}>"

