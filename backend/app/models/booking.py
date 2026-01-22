from enum import Enum as PyEnum
from sqlalchemy import Column, String, Text, Boolean, Enum, ForeignKey, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class BookingStatus(str, PyEnum):
    """Booking status matching Supabase booking_status enum (lowercase values)."""
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"
    no_show = "no_show"


class SessionType(str, PyEnum):
    """Session type matching Supabase session_type enum (lowercase values)."""
    individual = "individual"
    group = "group"


class SessionModality(str, PyEnum):
    """Session modality matching Supabase session_modality enum (lowercase values)."""
    in_person = "in_person"
    online = "online"


class Booking(BaseModel):
    __tablename__ = "bookings"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    organizer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Session details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    session_type = Column(Enum(SessionType, name="session_type", create_type=False), default=SessionType.individual)
    modality = Column(Enum(SessionModality, name="session_modality", create_type=False), default=SessionModality.in_person)
    
    # Time
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    
    # Location (for in-person or online link)
    location = Column(JSONB, default={
        "type": "in_person",
        "address": None,
        "online_link": None
    })
    
    # Capacity (for group sessions)
    capacity = Column(Integer, default=1)
    current_attendees = Column(Integer, default=0)
    
    # For group sessions - list of client IDs
    attendee_ids = Column(ARRAY(UUID(as_uuid=True)), default=[])
    waitlist_ids = Column(ARRAY(UUID(as_uuid=True)), default=[])
    
    # Status
    status = Column(Enum(BookingStatus, name="booking_status", create_type=False), default=BookingStatus.pending)
    
    # Recurrence
    is_recurring = Column(Boolean, default=False)
    recurrence_rule = Column(JSONB, nullable=True)  # RRULE format
    parent_booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="bookings")
    client = relationship("Client", back_populates="bookings")
    
    def __repr__(self):
        return f"<Booking {self.title} at {self.start_time}>"

