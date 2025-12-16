"""Exercise library models."""
from sqlalchemy import Column, String, Text, Numeric, Integer, Boolean, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.models.base import BaseModel


class ExerciseCategory(BaseModel):
    """Exercise category model."""
    
    __tablename__ = "exercise_categories"
    
    name = Column(String(100), nullable=False)
    description = Column(Text)
    icon = Column(String(50))
    parent_id = Column(UUID(as_uuid=True), ForeignKey('exercise_categories.id', ondelete='SET NULL'))
    is_system = Column(Boolean, default=False)
    
    # Relationships
    exercises = relationship("Exercise", back_populates="category")
    children = relationship("ExerciseCategory", backref="parent", remote_side="ExerciseCategory.id")


class Exercise(BaseModel):
    """Exercise library model."""
    
    __tablename__ = "exercises"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=True, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey('exercise_categories.id', ondelete='SET NULL'))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    instructions = Column(Text)
    video_url = Column(String(500))
    thumbnail_url = Column(String(500))
    muscle_groups = Column(ARRAY(String), default=[])
    equipment = Column(ARRAY(String), default=[])
    difficulty = Column(String(20), default='intermediate')
    is_public = Column(Boolean, default=False)
    is_system = Column(Boolean, default=False)
    extra_data = Column(JSONB, default={})
    
    # Relationships
    category = relationship("ExerciseCategory", back_populates="exercises")


class ClientMeasurement(BaseModel):
    """Client body measurements and progress tracking."""
    
    __tablename__ = "client_measurements"
    
    client_id = Column(UUID(as_uuid=True), ForeignKey('clients.id', ondelete='CASCADE'), nullable=False)
    measured_at = Column(String, nullable=False)
    weight_kg = Column(Numeric(5, 2))
    body_fat_percentage = Column(Numeric(5, 2))
    muscle_mass_kg = Column(Numeric(5, 2))
    measurements = Column(JSONB, default={})
    photos = Column(JSONB, default=[])
    notes = Column(Text)
    
    # Relationships
    client = relationship("Client", back_populates="measurements")


class ClientTask(BaseModel):
    """Tasks/Activities assigned to clients."""
    
    __tablename__ = "client_tasks"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey('clients.id', ondelete='CASCADE'), nullable=False)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    task_type = Column(String(50), default='general')
    due_date = Column(String)
    completed_at = Column(String)
    status = Column(String(20), default='pending')
    priority = Column(String(20), default='medium')
    related_booking_id = Column(UUID(as_uuid=True), ForeignKey('bookings.id', ondelete='SET NULL'))
    related_form_id = Column(UUID(as_uuid=True), ForeignKey('forms.id', ondelete='SET NULL'))
    
    # Relationships
    client = relationship("Client", back_populates="tasks")
    assigned_by_user = relationship("User")
