from app.models.base import Base, BaseModel, TimestampMixin
from app.models.workspace import Workspace
from app.models.user import User, UserRole, RoleType, DEFAULT_ROLE_PERMISSIONS
from app.models.client import Client, ClientTag, COMMON_ALLERGENS
from app.models.booking import Booking, BookingStatus
from app.models.workout import WorkoutProgram, WorkoutLog
from app.models.nutrition import Food, MealPlan, FoodFavorite
from app.models.exercise import Exercise, ExerciseFavorite, ClientMeasurement, ClientTask
from app.models.form import Form, FormSubmission
from app.models.message import Message, Conversation
from app.models.payment import StripeAccount, Subscription, Payment
from app.models.automation import Automation, AutomationLog
from app.models.audit import AuditLog
from app.models.product import Product, SessionPackage, ClientPackage, Coupon
from app.models.notification import Notification, EmailTemplate, ReminderSetting
from app.models.supplement import Supplement, SupplementFavorite
from app.models.feedback import ClientFeedback, ClientWorkoutFeedback, ClientDietFeedback, ClientEmotion
# NOTE: Document, ProgressPhoto, SupplementRecommendation tables don't exist in DB
from app.models.live_classes import (
    VideoIntegration,
    LiveClass,
    LiveClassRegistration,
    LiveClassTemplate,
    LiveClassPackage,
    ClientClassPackage,
    MeetingLog,
)
from app.models.google_calendar import GoogleCalendarToken, CalendarSyncMapping

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
    "GoogleCalendarToken",
    "CalendarSyncMapping",
]
