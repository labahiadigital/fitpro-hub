from sqlalchemy import Column, String, Text, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Exercise(BaseModel):
    __tablename__ = "exercises"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Exercise details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    
    # Categorization
    muscle_groups = Column(ARRAY(String), default=[])
    equipment = Column(ARRAY(String), default=[])
    difficulty = Column(String(50), default="intermediate")  # beginner, intermediate, advanced
    category = Column(String(100), nullable=True)  # strength, cardio, flexibility, etc.
    
    # Media
    video_url = Column(String(500), nullable=True)
    image_url = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    
    # Global exercise (null workspace_id) or workspace-specific
    is_global = Column(String(1), default="N")  # Y/N
    
    def __repr__(self):
        return f"<Exercise {self.name}>"


class WorkoutProgram(BaseModel):
    __tablename__ = "workout_programs"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Program details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    duration_weeks = Column(Integer, default=4)
    difficulty = Column(String(50), default="intermediate")
    
    # Template structure
    # Contains: weeks -> days -> exercises with sets, reps, rest, etc.
    template = Column(JSONB, default={
        "weeks": []
    })
    
    # Tags for categorization
    tags = Column(ARRAY(String), default=[])
    
    # Is this a template or assigned program
    is_template = Column(String(1), default="Y")  # Y/N
    
    # Relationships
    workspace = relationship("Workspace", back_populates="workout_programs")
    logs = relationship("WorkoutLog", back_populates="program", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<WorkoutProgram {self.name}>"


class WorkoutLog(BaseModel):
    __tablename__ = "workout_logs"
    
    program_id = Column(UUID(as_uuid=True), ForeignKey("workout_programs.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Log details
    # Contains: completed exercises, actual weights, reps, notes, etc.
    log = Column(JSONB, default={
        "date": None,
        "week": 1,
        "day": 1,
        "exercises": [],
        "notes": None,
        "duration_minutes": None,
        "perceived_effort": None  # 1-10 scale
    })
    
    # Relationships
    program = relationship("WorkoutProgram", back_populates="logs")
    client = relationship("Client", back_populates="workout_logs")
    
    def __repr__(self):
        return f"<WorkoutLog for {self.client_id}>"

