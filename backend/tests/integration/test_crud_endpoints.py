"""Integration tests for CRUD endpoints."""
import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta
from uuid import uuid4


class TestNutritionEndpoints:
    """Tests for nutrition endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_foods_unauthorized(self, client: AsyncClient):
        """Test listing foods requires authentication."""
        response = await client.get("/api/v1/nutrition/foods")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_list_meal_plans_unauthorized(self, client: AsyncClient):
        """Test listing meal plans requires authentication."""
        response = await client.get("/api/v1/nutrition/meal-plans")
        assert response.status_code in [401, 403]


class TestSupplementsEndpoints:
    """Tests for supplements endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_supplements_unauthorized(self, client: AsyncClient):
        """Test listing supplements requires authentication."""
        response = await client.get("/api/v1/supplements")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_create_supplement_unauthorized(self, client: AsyncClient):
        """Test creating supplement requires authentication."""
        response = await client.post(
            "/api/v1/supplements",
            json={
                "name": "Test Supplement",
                "brand": "Test Brand",
            }
        )
        assert response.status_code in [401, 403]


class TestExercisesEndpoints:
    """Tests for exercises endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_exercises_unauthorized(self, client: AsyncClient):
        """Test listing exercises requires authentication."""
        response = await client.get("/api/v1/exercises/")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_create_exercise_unauthorized(self, client: AsyncClient):
        """Test creating exercise requires authentication."""
        response = await client.post(
            "/api/v1/exercises/",
            json={
                "name": "Test Exercise",
                "muscle_groups": ["chest"],
            }
        )
        assert response.status_code in [401, 403]


class TestWorkoutsEndpoints:
    """Tests for workouts endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_programs_unauthorized(self, client: AsyncClient):
        """Test listing workout programs requires authentication."""
        response = await client.get("/api/v1/workouts/programs")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_create_program_unauthorized(self, client: AsyncClient):
        """Test creating workout program requires authentication."""
        response = await client.post(
            "/api/v1/workouts/programs",
            json={
                "name": "Test Program",
                "duration_weeks": 4,
            }
        )
        assert response.status_code in [401, 403]


class TestBookingsEndpoints:
    """Tests for bookings endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_bookings_unauthorized(self, client: AsyncClient):
        """Test listing bookings requires authentication."""
        response = await client.get("/api/v1/bookings")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_create_booking_unauthorized(self, client: AsyncClient):
        """Test creating booking requires authentication."""
        now = datetime.utcnow()
        response = await client.post(
            "/api/v1/bookings",
            json={
                "title": "Test Session",
                "session_type": "individual",
                "modality": "in_person",
                "start_time": now.isoformat(),
                "end_time": (now + timedelta(hours=1)).isoformat(),
            }
        )
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_get_booking_unauthorized(self, client: AsyncClient):
        """Test getting single booking requires authentication."""
        booking_id = str(uuid4())
        response = await client.get(f"/api/v1/bookings/{booking_id}")
        assert response.status_code in [401, 403]


class TestClientsEndpoints:
    """Tests for clients endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_clients_unauthorized(self, client: AsyncClient):
        """Test listing clients requires authentication."""
        response = await client.get("/api/v1/clients")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_create_client_unauthorized(self, client: AsyncClient):
        """Test creating client requires authentication."""
        response = await client.post(
            "/api/v1/clients",
            json={
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
            }
        )
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_get_client_unauthorized(self, client: AsyncClient):
        """Test getting single client requires authentication."""
        client_id = str(uuid4())
        response = await client.get(f"/api/v1/clients/{client_id}")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_list_client_tags_unauthorized(self, client: AsyncClient):
        """Test listing client tags requires authentication."""
        response = await client.get("/api/v1/clients/tags")
        assert response.status_code in [401, 403]


class TestPaymentsEndpoints:
    """Tests for payments endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_subscriptions_unauthorized(self, client: AsyncClient):
        """Test listing subscriptions requires authentication."""
        response = await client.get("/api/v1/payments/subscriptions")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_list_payments_unauthorized(self, client: AsyncClient):
        """Test listing payments requires authentication."""
        response = await client.get("/api/v1/payments/payments")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_stripe_connect_status_unauthorized(self, client: AsyncClient):
        """Test Stripe connect status requires authentication."""
        response = await client.get("/api/v1/payments/connect/status")
        assert response.status_code in [401, 403]


class TestFormsEndpoints:
    """Tests for forms endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_forms_unauthorized(self, client: AsyncClient):
        """Test listing forms requires authentication."""
        response = await client.get("/api/v1/forms")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_create_form_unauthorized(self, client: AsyncClient):
        """Test creating form requires authentication."""
        response = await client.post(
            "/api/v1/forms",
            json={
                "name": "Test Form",
                "form_type": "custom",
                "schema": {"fields": []},
            }
        )
        assert response.status_code in [401, 403]


class TestMessagesEndpoints:
    """Tests for messages endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_conversations_unauthorized(self, client: AsyncClient):
        """Test listing conversations requires authentication."""
        response = await client.get("/api/v1/messages/conversations")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_send_message_unauthorized(self, client: AsyncClient):
        """Test sending message requires authentication."""
        response = await client.post(
            "/api/v1/messages/messages",
            json={
                "conversation_id": str(uuid4()),
                "content": "Test message",
            }
        )
        assert response.status_code in [401, 403]


class TestReportsEndpoints:
    """Tests for reports endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_kpis_unauthorized(self, client: AsyncClient):
        """Test getting KPIs requires authentication."""
        response = await client.get("/api/v1/reports/kpis")
        assert response.status_code in [401, 403]


class TestNotificationsEndpoints:
    """Tests for notifications endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_notifications_unauthorized(self, client: AsyncClient):
        """Test listing notifications requires authentication."""
        response = await client.get("/api/v1/notifications/alerts")
        assert response.status_code in [401, 403]


class TestInvitationsEndpoints:
    """Tests for invitations endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_invitations_unauthorized(self, client: AsyncClient):
        """Test listing invitations requires authentication."""
        response = await client.get("/api/v1/invitations")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_create_invitation_unauthorized(self, client: AsyncClient):
        """Test creating invitation requires authentication."""
        response = await client.post(
            "/api/v1/invitations",
            json={
                "email": "client@example.com",
                "first_name": "New",
                "last_name": "Client",
            }
        )
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_validate_token_public(self, client: AsyncClient):
        """Test token validation is public."""
        response = await client.get("/api/v1/invitations/validate/fake-token")
        # Should return 200 with valid=false for non-existent token
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
