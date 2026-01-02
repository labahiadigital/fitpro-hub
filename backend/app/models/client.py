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


# List of common food allergens
COMMON_ALLERGENS = [
    "gluten",
    "lactosa",
    "huevo",
    "pescado",
    "marisco",
    "frutos_secos",
    "cacahuete",
    "soja",
    "apio",
    "mostaza",
    "sesamo",
    "sulfitos",
    "moluscos",
    "altramuces",
]


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
    
    # Allergies and intolerances
    allergies = Column(ARRAY(String), default=[])  # e.g., ["gluten", "lactosa", "frutos_secos"]
    intolerances = Column(ARRAY(String), default=[])  # e.g., ["lactosa", "fructosa"]
    injuries = Column(JSONB, default=[])  # List of injuries with details
    
    # Chat settings
    chat_enabled = Column(Boolean, default=True)  # Enable/disable chat for this client
    
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
    documents = relationship("Document", back_populates="client", cascade="all, delete-orphan")
    progress_photos = relationship("ProgressPhoto", back_populates="client", cascade="all, delete-orphan")
    supplement_recommendations = relationship("SupplementRecommendation", back_populates="client", cascade="all, delete-orphan")
    measurements = relationship("ClientMeasurement", back_populates="client", cascade="all, delete-orphan")
    tasks = relationship("ClientTask", back_populates="client", cascade="all, delete-orphan")
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    def __repr__(self):
        return f"<Client {self.full_name}>"

