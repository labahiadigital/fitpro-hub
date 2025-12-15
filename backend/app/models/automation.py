from enum import Enum as PyEnum
from sqlalchemy import Column, String, Text, Boolean, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class TriggerType(str, PyEnum):
    CLIENT_CREATED = "client_created"
    CLIENT_INACTIVE = "client_inactive"
    BOOKING_CREATED = "booking_created"
    BOOKING_CANCELLED = "booking_cancelled"
    BOOKING_REMINDER = "booking_reminder"
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_FAILED = "payment_failed"
    SUBSCRIPTION_RENEWAL = "subscription_renewal"
    FORM_SUBMITTED = "form_submitted"
    WORKOUT_COMPLETED = "workout_completed"
    CUSTOM_DATE = "custom_date"


class ActionType(str, PyEnum):
    SEND_EMAIL = "send_email"
    SEND_IN_APP = "send_in_app"
    SEND_SMS = "send_sms"
    CREATE_TASK = "create_task"
    UPDATE_TAG = "update_tag"
    WEBHOOK = "webhook"


class Automation(BaseModel):
    __tablename__ = "automations"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Automation details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Trigger configuration
    trigger_type = Column(Enum(TriggerType), nullable=False)
    trigger_config = Column(JSONB, default={})  # Additional trigger parameters
    
    # Actions (can be multiple)
    actions = Column(JSONB, default=[])
    # Example action structure:
    # [
    #   {
    #     "type": "send_email",
    #     "config": {
    #       "template_id": "...",
    #       "delay_hours": 24,
    #       "subject": "...",
    #       "variables": {}
    #     }
    #   }
    # ]
    
    # Conditions (optional filters)
    conditions = Column(JSONB, default=[])
    # Example condition structure:
    # [
    #   {
    #     "field": "client.tags",
    #     "operator": "contains",
    #     "value": "vip"
    #   }
    # ]
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Statistics
    stats = Column(JSONB, default={
        "total_runs": 0,
        "successful_runs": 0,
        "failed_runs": 0,
        "last_run_at": None
    })
    
    # Relationships
    workspace = relationship("Workspace", back_populates="automations")
    logs = relationship("AutomationLog", back_populates="automation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Automation {self.name}>"


class AutomationLog(BaseModel):
    __tablename__ = "automation_logs"
    
    automation_id = Column(UUID(as_uuid=True), ForeignKey("automations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Execution details
    trigger_data = Column(JSONB, default={})  # Data that triggered the automation
    executed_actions = Column(JSONB, default=[])  # Results of each action
    
    # Status
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    error_message = Column(Text, nullable=True)
    
    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    automation = relationship("Automation", back_populates="logs")
    
    def __repr__(self):
        return f"<AutomationLog {self.automation_id}>"

