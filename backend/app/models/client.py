from sqlalchemy import Column, String, Text, Boolean, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


# Association table for client tags
client_tags_association = Table(
    "client_tags_association",
    BaseModel.metadata,
    Column("client_id", UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("client_tags.id", ondelete="CASCADE"), primary_key=True)
)


class ClientTag(BaseModel):
    __tablename__ = "client_tags"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    color = Column(String(7), default="#2D6A4F")
    
    # Relationships
    clients = relationship("Client", secondary=client_tags_association, back_populates="tags")
    
    def __repr__(self):
        return f"<ClientTag {self.name}>"


class Client(BaseModel):
    __tablename__ = "clients"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Link to user account (if client has app access)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True)
    
    # Personal info
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Health data
    birth_date = Column(String(10), nullable=True)  # YYYY-MM-DD
    gender = Column(String(20), nullable=True)
    height_cm = Column(String(10), nullable=True)
    weight_kg = Column(String(10), nullable=True)
    health_data = Column(JSONB, default={})
    
    # Goals and notes
    goals = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)
    
    # GDPR Consents
    consents = Column(JSONB, default={
        "data_processing": False,
        "marketing": False,
        "health_data": False,
        "consent_date": None
    })
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="clients")
    tags = relationship("ClientTag", secondary=client_tags_association, back_populates="clients")
    bookings = relationship("Booking", back_populates="client", cascade="all, delete-orphan")
    workout_logs = relationship("WorkoutLog", back_populates="client", cascade="all, delete-orphan")
    meal_plans = relationship("MealPlan", back_populates="client", cascade="all, delete-orphan")
    form_submissions = relationship("FormSubmission", back_populates="client", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="client")
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    def __repr__(self):
        return f"<Client {self.full_name}>"

