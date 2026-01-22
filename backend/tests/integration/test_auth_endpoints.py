"""Integration tests for authentication endpoints."""
import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock, MagicMock


class TestHealthEndpoint:
    """Tests for health check endpoint."""
    
    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        """Test health endpoint returns OK."""
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestAuthEndpoints:
    """Tests for authentication endpoints."""
    
    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, client: AsyncClient):
        """Test login with invalid credentials."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "wrongpassword",
            }
        )
        # Should return 401 or 400 for invalid credentials
        assert response.status_code in [400, 401]
    
    @pytest.mark.asyncio
    async def test_login_missing_fields(self, client: AsyncClient):
        """Test login with missing fields."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                # Missing password
            }
        )
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_login_invalid_email_format(self, client: AsyncClient):
        """Test login with invalid email format."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "not-an-email",
                "password": "password123",
            }
        )
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_register_missing_fields(self, client: AsyncClient):
        """Test registration with missing fields."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                # Missing password and full_name
            }
        )
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_me_unauthorized(self, client: AsyncClient):
        """Test /me endpoint without authentication."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_logout_unauthorized(self, client: AsyncClient):
        """Test logout without authentication."""
        response = await client.post("/api/v1/auth/logout")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_refresh_without_token(self, client: AsyncClient):
        """Test token refresh without refresh token."""
        response = await client.post(
            "/api/v1/auth/refresh",
            json={}
        )
        assert response.status_code in [400, 401, 422]


class TestProtectedEndpoints:
    """Tests for protected endpoints without authentication."""
    
    @pytest.mark.asyncio
    async def test_workspaces_unauthorized(self, client: AsyncClient):
        """Test workspaces endpoint requires auth."""
        response = await client.get("/api/v1/workspaces")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_clients_unauthorized(self, client: AsyncClient):
        """Test clients endpoint requires auth."""
        response = await client.get("/api/v1/clients")
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_bookings_unauthorized(self, client: AsyncClient):
        """Test bookings endpoint requires auth."""
        response = await client.get("/api/v1/bookings")
        assert response.status_code in [401, 403]
