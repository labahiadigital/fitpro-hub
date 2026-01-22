from sqlalchemy import Column, String, Text, Integer, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class WorkoutProgram(BaseModel):
    __tablename__ = "workout_programs"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)
    
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
    
    # Is this a template or assigned program (DB uses boolean)
    is_template = Column(Boolean, default=True)
    
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
