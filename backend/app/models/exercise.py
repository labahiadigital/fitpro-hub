"""Exercise library models."""
from sqlalchemy import Column, String, Text, Numeric, Integer, Boolean, ForeignKey, ARRAY, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.models.base import BaseModel


# NOTE: ExerciseCategory table does not exist in DB - exercises have 'category' as text directly
# class ExerciseCategory(BaseModel):
#     """Exercise category model."""
#     __tablename__ = "exercise_categories"
#     ... (table not in current schema)


class Exercise(BaseModel):
    """Exercise library model - matches Supabase schema."""
    
    __tablename__ = "exercises"
    
    # DB columns: id, workspace_id, name, description, instructions, muscle_groups, equipment, 
    #             difficulty, category, video_url, image_url, thumbnail_url, is_global, created_at, updated_at
    workspace_id = Column(UUID(as_uuid=True), ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=True, index=True)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    muscle_groups = Column(ARRAY(Text), default=[])
    equipment = Column(ARRAY(Text), default=[])
    difficulty = Column(Text, default='intermediate')
    category = Column(Text, nullable=True)  # Direct text, no FK
    video_url = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    custom_thumbnail_url = Column(Text, nullable=True)  # Custom thumbnail uploaded by user
    is_global = Column(Boolean, default=False)


class ExerciseFavorite(BaseModel):
    """Exercise favorites for users."""
    
    __tablename__ = "exercise_favorites"
    __table_args__ = (
        UniqueConstraint('user_id', 'exercise_id', name='unique_user_exercise_favorite'),
    )
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_id = Column(UUID(as_uuid=True), ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    exercise = relationship("Exercise")
    
    def __repr__(self):
        return f"<ExerciseFavorite user={self.user_id} exercise={self.exercise_id}>"


class ClientMeasurement(BaseModel):
    """Client body measurements and progress tracking."""
    
    __tablename__ = "client_measurements"
    
    client_id = Column(UUID(as_uuid=True), ForeignKey('clients.id', ondelete='CASCADE'), nullable=False)
    measured_at = Column(DateTime(timezone=True), nullable=True)
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
