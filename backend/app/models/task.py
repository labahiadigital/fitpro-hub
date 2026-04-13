"""Task management models."""
from enum import Enum as PyEnum

from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Time
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class TaskStatus(str, PyEnum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class TaskPriority(str, PyEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Task(BaseModel):
    __tablename__ = "tasks"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default=TaskStatus.TODO.value, index=True)
    priority = Column(String(10), nullable=False, default=TaskPriority.MEDIUM.value)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    team_group_id = Column(UUID(as_uuid=True), ForeignKey("team_groups.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    due_time = Column(Time, nullable=True)
    source = Column(String(50), nullable=False, default="manual", server_default="manual")
    source_ref = Column(String(255), nullable=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<Task {self.title[:30]}>"
