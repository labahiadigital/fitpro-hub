"""Unit tests for database models."""
import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from app.models.user import User, UserRole
from app.models.client import Client, ClientTag
from app.models.booking import Booking, BookingStatus, SessionType, SessionModality
from app.models.payment import Subscription, Payment, SubscriptionStatus, PaymentStatus
from app.models.workspace import Workspace
from app.models.nutrition import Food, MealPlan
from app.models.exercise import Exercise
from app.models.supplement import Supplement


class TestUserModel:
    """Tests for User model."""
    
    def test_user_creation(self):
        """Test basic user creation."""
        user = User(
            id=uuid4(),
            email="test@example.com",
            full_name="Test User",
            auth_id=uuid4(),
            is_active=True,
        )
        assert user.email == "test@example.com"
        assert user.full_name == "Test User"
        assert user.is_active is True
    
    def test_user_role_creation(self):
        """Test user role creation."""
        role = UserRole(
            id=uuid4(),
            user_id=uuid4(),
            workspace_id=uuid4(),
            role="trainer",
        )
        assert role.role == "trainer"


class TestClientModel:
    """Tests for Client model."""
    
    def test_client_creation(self):
        """Test basic client creation."""
        client = Client(
            id=uuid4(),
            workspace_id=uuid4(),
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            is_active=True,
        )
        assert client.first_name == "John"
        assert client.last_name == "Doe"
        assert client.full_name == "John Doe"
    
    def test_client_full_name_property(self):
        """Test client full_name hybrid property."""
        client = Client(
            first_name="Jane",
            last_name="Smith",
        )
        assert client.full_name == "Jane Smith"


class TestBookingModel:
    """Tests for Booking model."""
    
    def test_booking_creation(self):
        """Test basic booking creation."""
        now = datetime.utcnow()
        booking = Booking(
            id=uuid4(),
            workspace_id=uuid4(),
            title="Training Session",
            session_type=SessionType.individual,
            modality=SessionModality.in_person,
            start_time=now,
            end_time=now + timedelta(hours=1),
            status=BookingStatus.confirmed,
        )
        assert booking.title == "Training Session"
        assert booking.session_type == SessionType.individual
        assert booking.status == BookingStatus.confirmed
    
    def test_booking_status_enum(self):
        """Test booking status enum values."""
        assert BookingStatus.pending.value == "pending"
        assert BookingStatus.confirmed.value == "confirmed"
        assert BookingStatus.cancelled.value == "cancelled"
        assert BookingStatus.completed.value == "completed"
        assert BookingStatus.no_show.value == "no_show"
    
    def test_session_type_enum(self):
        """Test session type enum values."""
        assert SessionType.individual.value == "individual"
        assert SessionType.group.value == "group"
        assert SessionType.online.value == "online"


class TestPaymentModels:
    """Tests for Payment models."""
    
    def test_subscription_creation(self):
        """Test subscription creation."""
        subscription = Subscription(
            id=uuid4(),
            workspace_id=uuid4(),
            client_id=uuid4(),
            name="Monthly Plan",
            amount=50.00,
            currency="EUR",
            status=SubscriptionStatus.active,
        )
        assert subscription.name == "Monthly Plan"
        assert subscription.status == SubscriptionStatus.active
    
    def test_subscription_status_enum(self):
        """Test subscription status enum values."""
        assert SubscriptionStatus.active.value == "active"
        assert SubscriptionStatus.cancelled.value == "cancelled"
        assert SubscriptionStatus.past_due.value == "past_due"
    
    def test_payment_creation(self):
        """Test payment creation."""
        payment = Payment(
            id=uuid4(),
            workspace_id=uuid4(),
            client_id=uuid4(),
            amount=100.00,
            currency="EUR",
            status=PaymentStatus.succeeded,
            payment_type="one_time",
        )
        assert payment.amount == 100.00
        assert payment.status == PaymentStatus.succeeded
    
    def test_payment_status_enum(self):
        """Test payment status enum values."""
        assert PaymentStatus.pending.value == "pending"
        assert PaymentStatus.succeeded.value == "succeeded"
        assert PaymentStatus.failed.value == "failed"
        assert PaymentStatus.refunded.value == "refunded"


class TestWorkspaceModel:
    """Tests for Workspace model."""
    
    def test_workspace_creation(self):
        """Test workspace creation."""
        workspace = Workspace(
            id=uuid4(),
            name="Elite Fitness",
            slug="elite-fitness",
            owner_id=uuid4(),
        )
        assert workspace.name == "Elite Fitness"
        assert workspace.slug == "elite-fitness"


class TestNutritionModels:
    """Tests for Nutrition models."""
    
    def test_food_creation(self):
        """Test food creation."""
        food = Food(
            id=uuid4(),
            name="Chicken Breast",
            calories=165.0,
            protein=31.0,
            carbs=0.0,
            fat=3.6,
            is_global=True,
        )
        assert food.name == "Chicken Breast"
        assert food.protein == 31.0
    
    def test_meal_plan_creation(self):
        """Test meal plan creation."""
        plan = MealPlan(
            id=uuid4(),
            workspace_id=uuid4(),
            name="Weight Loss Plan",
            description="Calorie deficit diet",
            target_calories=1800,
        )
        assert plan.name == "Weight Loss Plan"
        assert plan.target_calories == 1800


class TestExerciseModel:
    """Tests for Exercise model."""
    
    def test_exercise_creation(self):
        """Test exercise creation."""
        exercise = Exercise(
            id=uuid4(),
            name="Bench Press",
            description="Compound chest exercise",
            muscle_groups=["chest", "triceps", "shoulders"],
            equipment=["barbell", "bench"],
            difficulty="intermediate",
            is_global=True,
        )
        assert exercise.name == "Bench Press"
        assert "chest" in exercise.muscle_groups
        assert exercise.difficulty == "intermediate"


class TestSupplementModel:
    """Tests for Supplement model."""
    
    def test_supplement_creation(self):
        """Test supplement creation."""
        supplement = Supplement(
            id=uuid4(),
            name="Whey Protein",
            brand="Optimum Nutrition",
            category="protein",
            protein=24.0,
            carbs=3.0,
            fat=1.0,
            is_global=True,
        )
        assert supplement.name == "Whey Protein"
        assert supplement.brand == "Optimum Nutrition"
        assert supplement.protein == 24.0
