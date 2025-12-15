"""Exercise and Food library models."""
from sqlalchemy import Column, String, Text, Numeric, Integer, Boolean, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from .base import Base, TimestampMixin, WorkspaceMixin


class ExerciseCategory(Base, TimestampMixin):
    """Exercise category model."""
    
    __tablename__ = "exercise_categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    icon = Column(String(50))
    parent_id = Column(UUID(as_uuid=True), ForeignKey('exercise_categories.id', ondelete='SET NULL'))
    is_system = Column(Boolean, default=False)  # True for default categories
    
    # Relationships
    exercises = relationship("Exercise", back_populates="category")
    children = relationship("ExerciseCategory", backref="parent", remote_side=[id])


class Exercise(Base, TimestampMixin, WorkspaceMixin):
    """Exercise library model."""
    
    __tablename__ = "exercises"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey('exercise_categories.id', ondelete='SET NULL'))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    instructions = Column(Text)
    video_url = Column(String(500))
    thumbnail_url = Column(String(500))
    muscle_groups = Column(ARRAY(String), default=[])
    equipment = Column(ARRAY(String), default=[])
    difficulty = Column(String(20), default='intermediate')  # beginner, intermediate, advanced
    is_public = Column(Boolean, default=False)  # If True, visible to all workspaces
    is_system = Column(Boolean, default=False)  # True for default exercises
    metadata = Column(JSONB, default={})
    
    # Relationships
    category = relationship("ExerciseCategory", back_populates="exercises")


class FoodCategory(Base, TimestampMixin):
    """Food category model."""
    
    __tablename__ = "food_categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    icon = Column(String(50))
    parent_id = Column(UUID(as_uuid=True), ForeignKey('food_categories.id', ondelete='SET NULL'))
    is_system = Column(Boolean, default=False)
    
    # Relationships
    foods = relationship("Food", back_populates="category")
    children = relationship("FoodCategory", backref="parent", remote_side=[id])


class Food(Base, TimestampMixin, WorkspaceMixin):
    """Food library model."""
    
    __tablename__ = "foods"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey('food_categories.id', ondelete='SET NULL'))
    name = Column(String(255), nullable=False)
    brand = Column(String(100))
    serving_size = Column(Numeric(10, 2), default=100)
    serving_unit = Column(String(20), default='g')
    calories = Column(Numeric(10, 2))
    protein = Column(Numeric(10, 2))
    carbs = Column(Numeric(10, 2))
    fat = Column(Numeric(10, 2))
    fiber = Column(Numeric(10, 2))
    sugar = Column(Numeric(10, 2))
    sodium = Column(Numeric(10, 2))
    micronutrients = Column(JSONB, default={})  # vitamins, minerals, etc.
    allergens = Column(ARRAY(String), default=[])
    is_public = Column(Boolean, default=False)
    is_system = Column(Boolean, default=False)
    barcode = Column(String(50))
    
    # Relationships
    category = relationship("FoodCategory", back_populates="foods")


class ClientMeasurement(Base, TimestampMixin):
    """Client body measurements and progress tracking."""
    
    __tablename__ = "client_measurements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey('clients.id', ondelete='CASCADE'), nullable=False)
    measured_at = Column(String, nullable=False)
    weight_kg = Column(Numeric(5, 2))
    body_fat_percentage = Column(Numeric(5, 2))
    muscle_mass_kg = Column(Numeric(5, 2))
    measurements = Column(JSONB, default={})  # chest, waist, hips, arms, legs, etc.
    photos = Column(JSONB, default=[])  # Array of photo URLs
    notes = Column(Text)
    
    # Relationships
    client = relationship("Client", back_populates="measurements")


class ClientTask(Base, TimestampMixin, WorkspaceMixin):
    """Tasks/Activities assigned to clients."""
    
    __tablename__ = "client_tasks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey('clients.id', ondelete='CASCADE'), nullable=False)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    task_type = Column(String(50), default='general')  # general, workout, nutrition, form, payment
    due_date = Column(String)
    completed_at = Column(String)
    status = Column(String(20), default='pending')  # pending, in_progress, completed, cancelled
    priority = Column(String(20), default='medium')  # low, medium, high, urgent
    related_booking_id = Column(UUID(as_uuid=True), ForeignKey('bookings.id', ondelete='SET NULL'))
    related_form_id = Column(UUID(as_uuid=True), ForeignKey('forms.id', ondelete='SET NULL'))
    
    # Relationships
    client = relationship("Client", back_populates="tasks")
    assigned_by_user = relationship("User")

