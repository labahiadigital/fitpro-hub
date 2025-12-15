from enum import Enum as PyEnum
from sqlalchemy import Column, String, Text, Boolean, Enum, ForeignKey, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class BookingStatus(str, PyEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"


class SessionType(str, PyEnum):
    INDIVIDUAL = "individual"
    GROUP = "group"


class SessionModality(str, PyEnum):
    IN_PERSON = "in_person"
    ONLINE = "online"


class Booking(BaseModel):
    __tablename__ = "bookings"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    organizer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Session details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    session_type = Column(Enum(SessionType), default=SessionType.INDIVIDUAL)
    modality = Column(Enum(SessionModality), default=SessionModality.IN_PERSON)
    
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
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING)
    
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

