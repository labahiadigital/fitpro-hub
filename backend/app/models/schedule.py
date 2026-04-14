"""Schedule models for staff, machines, and boxes."""
from sqlalchemy import Column, Integer, Time, Boolean, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class StaffSchedule(BaseModel):
    __tablename__ = "staff_schedules"
    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", "day_of_week", name="uq_staff_schedule"),
        CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_staff_dow"),
    )

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False, server_default="09:00")
    end_time = Column(Time, nullable=False, server_default="18:00")
    is_available = Column(Boolean, nullable=False, server_default="true")

    user = relationship("User", lazy="selectin")


class MachineSchedule(BaseModel):
    __tablename__ = "machine_schedules"
    __table_args__ = (
        UniqueConstraint("workspace_id", "machine_id", "day_of_week", name="uq_machine_schedule"),
        CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_machine_dow"),
    )

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False, server_default="08:00")
    end_time = Column(Time, nullable=False, server_default="22:00")
    is_available = Column(Boolean, nullable=False, server_default="true")

    machine = relationship("Machine", lazy="selectin")


class BoxSchedule(BaseModel):
    __tablename__ = "box_schedules"
    __table_args__ = (
        UniqueConstraint("workspace_id", "box_id", "day_of_week", name="uq_box_schedule"),
        CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_box_dow"),
    )

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    box_id = Column(UUID(as_uuid=True), ForeignKey("boxes.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False, server_default="08:00")
    end_time = Column(Time, nullable=False, server_default="22:00")
    is_available = Column(Boolean, nullable=False, server_default="true")

    box = relationship("Box", lazy="selectin")
