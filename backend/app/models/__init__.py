from app.models.base import Base, BaseModel, TimestampMixin
from app.models.workspace import Workspace
from app.models.user import User, UserRole, RoleType, DEFAULT_ROLE_PERMISSIONS
from app.models.client import Client, ClientTag, COMMON_ALLERGENS
from app.models.booking import Booking, BookingStatus
from app.models.workout import WorkoutProgram, WorkoutLog
from app.models.nutrition import Food, MealPlan, FoodFavorite
from app.models.exercise import Exercise, ExerciseAlternative, ExerciseFavorite, ClientMeasurement, ClientTask
from app.models.form import Form, FormSubmission
from app.models.message import Message, Conversation
from app.models.payment import StripeAccount, Subscription, Payment
from app.models.automation import Automation, AutomationLog
from app.models.audit import AuditLog
from app.models.product import Product, SessionPackage, ClientPackage, Coupon, ProductStockConsumption, ProductStaff, product_machines, product_boxes
from app.models.notification import Notification, EmailTemplate, ReminderSetting
from app.models.supplement import Supplement, SupplementFavorite
from app.models.feedback import ClientFeedback, ClientWorkoutFeedback, ClientDietFeedback, ClientEmotion
from app.models.document import Document
from app.models.live_classes import (
    VideoIntegration,
    LiveClass,
    LiveClassRegistration,
    LiveClassTemplate,
    LiveClassPackage,
    ClientClassPackage,
    MeetingLog,
)
from app.models.invitation import ClientInvitation, InvitationStatus
from app.models.google_calendar import GoogleCalendarToken, CalendarSyncMapping
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.team_group import TeamGroup, TeamGroupMember
from app.models.rectification import RectificationRequest
from app.models.beverage import Beverage
from app.models.custom_role import CustomRole
from app.models.stock import StockCategory, StockItem, StockMovement
from app.models.supplier import Supplier
from app.models.resource import Box, Machine, Service, ServiceStaff, ServiceStockConsumption, Appointment
from app.models.time_clock import TimeRecord, LeaveRequest, PublicHoliday
from app.models.schedule import StaffSchedule, MachineSchedule, BoxSchedule

__all__ = [
    "Base",
    "BaseModel",
    "TimestampMixin",
    "Workspace",
    "User",
    "UserRole",
    "RoleType",
    "DEFAULT_ROLE_PERMISSIONS",
    "Client",
    "ClientTag",
    "COMMON_ALLERGENS",
    "Booking",
    "BookingStatus",
    "WorkoutProgram",
    "WorkoutLog",
    "Exercise",
    "ExerciseAlternative",
    "ExerciseFavorite",
    "MealPlan",
    "Food",
    "FoodFavorite",
    "Form",
    "FormSubmission",
    "Message",
    "Conversation",
    "StripeAccount",
    "Subscription",
    "Payment",
    "Product",
    "SessionPackage",
    "ClientPackage",
    "Coupon",
    "ClientMeasurement",
    "ClientTask",
    "Notification",
    "EmailTemplate",
    "ReminderSetting",
    "Automation",
    "AutomationLog",
    "AuditLog",
    "Supplement",
    "SupplementFavorite",
    "ClientFeedback",
    "ClientWorkoutFeedback",
    "ClientDietFeedback",
    "ClientEmotion",
    "VideoIntegration",
    "LiveClass",
    "LiveClassRegistration",
    "LiveClassTemplate",
    "LiveClassPackage",
    "ClientClassPackage",
    "MeetingLog",
    "ClientInvitation",
    "InvitationStatus",
    "GoogleCalendarToken",
    "CalendarSyncMapping",
    "Document",
    "Task",
    "TaskStatus",
    "TaskPriority",
    "TeamGroup",
    "TeamGroupMember",
    "RectificationRequest",
    "Beverage",
    "CustomRole",
    "StockCategory",
    "StockItem",
    "StockMovement",
    "Supplier",
    "Box",
    "Machine",
    "Service",
    "ServiceStaff",
    "ServiceStockConsumption",
    "Appointment",
    "TimeRecord",
    "LeaveRequest",
    "PublicHoliday",
    "StaffSchedule",
    "MachineSchedule",
    "BoxSchedule",
    "ProductStockConsumption",
    "ProductStaff",
    "product_machines",
    "product_boxes",
]
