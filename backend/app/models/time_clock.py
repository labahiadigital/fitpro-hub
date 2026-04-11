"""Time Clock models for staff attendance tracking."""
import uuid
from datetime import date, datetime

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID

from app.models.base import BaseModel


class TimeRecord(BaseModel):
    __tablename__ = "time_records"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    clock_in = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    clock_out = Column(DateTime(timezone=True), nullable=True)
    pauses = Column(JSON, default=list)
    net_minutes = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(
        Enum("active", "completed", "edited", name="time_record_status"),
        nullable=False,
        default="active",
        server_default="active",
    )


class LeaveRequest(BaseModel):
    __tablename__ = "leave_requests"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type = Column(
        Enum(
            "vacaciones",
            "baja_medica",
            "asunto_personal",
            "maternidad_paternidad",
            "formacion",
            "otros",
            name="leave_type_enum",
        ),
        nullable=False,
    )
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(
        Enum("pendiente", "aprobada", "rechazada", name="leave_status_enum"),
        nullable=False,
        default="pendiente",
        server_default="pendiente",
    )
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)


class PublicHoliday(BaseModel):
    __tablename__ = "public_holidays"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    name = Column(String(255), nullable=False)
