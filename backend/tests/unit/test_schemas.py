"""Unit tests for Pydantic schemas."""
import pytest
from datetime import datetime
from uuid import uuid4
from pydantic import ValidationError

from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.schemas.auth import LoginRequest, RegisterRequest, Token
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse


class TestClientSchemas:
    """Tests for Client schemas."""
    
    def test_client_create_valid(self):
        """Test valid client creation schema."""
        data = ClientCreate(
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            phone="+34612345678",
        )
        assert data.first_name == "John"
        assert data.email == "john.doe@example.com"
    
    def test_client_create_invalid_email(self):
        """Test client creation with invalid email."""
        with pytest.raises(ValidationError):
            ClientCreate(
                first_name="John",
                last_name="Doe",
                email="invalid-email",
            )
    
    def test_client_create_missing_required(self):
        """Test client creation with missing required fields."""
        with pytest.raises(ValidationError):
            ClientCreate(
                first_name="John",
                # Missing last_name and email
            )
    
    def test_client_update_partial(self):
        """Test partial client update."""
        data = ClientUpdate(
            first_name="Jane",
        )
        assert data.first_name == "Jane"
        assert data.last_name is None

    def test_client_update_height_weight_accept_numbers(self):
        """El frontend manda ``height_cm``/``weight_kg`` como números
        (Mantine ``NumberInput``). El schema debe aceptarlos y
        normalizarlos a string porque en BD la columna es ``VARCHAR``.
        Regresión por el error 422 "Input should be a valid string"
        reportado por el cliente Berta el 11/5/2026.
        """
        # int → "160"
        d1 = ClientUpdate(height_cm=160, weight_kg=70)
        assert d1.height_cm == "160"
        assert d1.weight_kg == "70"

        # float con parte decimal → conserva decimales
        d2 = ClientUpdate(height_cm=160.5, weight_kg=57.5)
        assert d2.height_cm == "160.5"
        assert d2.weight_kg == "57.5"

        # str sigue funcionando
        d3 = ClientUpdate(height_cm="170", weight_kg="65.3")
        assert d3.height_cm == "170"
        assert d3.weight_kg == "65.3"

        # None se preserva (campo opcional sin tocar)
        d4 = ClientUpdate()
        assert d4.height_cm is None
        assert d4.weight_kg is None

        # cadenas vacías o sólo espacios se normalizan a None
        d5 = ClientUpdate(height_cm="   ", weight_kg="")
        assert d5.height_cm is None
        assert d5.weight_kg is None

    def test_client_create_height_weight_accept_numbers(self):
        """Mismo contrato en el endpoint de creación."""
        d = ClientCreate(
            first_name="Jane",
            last_name="Doe",
            email="jane@example.com",
            height_cm=165,
            weight_kg=58.2,
        )
        assert d.height_cm == "165"
        assert d.weight_kg == "58.2"


class TestAuthSchemas:
    """Tests for Auth schemas."""
    
    def test_login_request_valid(self):
        """Test valid login request."""
        data = LoginRequest(
            email="user@example.com",
            password="securepassword123",
        )
        assert data.email == "user@example.com"
    
    def test_login_request_invalid_email(self):
        """Test login request with invalid email."""
        with pytest.raises(ValidationError):
            LoginRequest(
                email="not-an-email",
                password="password",
            )
    
    def test_register_request_valid(self):
        """Test valid register request."""
        data = RegisterRequest(
            email="newuser@example.com",
            password="SecurePass123!",
            full_name="New User",
        )
        assert data.email == "newuser@example.com"
        assert data.full_name == "New User"
    
    def test_token_response(self):
        """Test token response schema."""
        data = Token(
            access_token="eyJhbGciOiJIUzI1NiIs...",
            refresh_token="refresh_token_value",
            token_type="bearer",
            expires_in=3600,
        )
        assert data.token_type == "bearer"
        assert data.access_token.startswith("eyJ")
        assert data.expires_in == 3600


class TestWorkspaceSchemas:
    """Tests for Workspace schemas."""
    
    def test_workspace_create_valid(self):
        """Test valid workspace creation."""
        data = WorkspaceCreate(
            name="My Fitness Studio",
            slug="my-fitness-studio",
        )
        assert data.name == "My Fitness Studio"
        assert data.slug == "my-fitness-studio"
    
    def test_workspace_create_slug_validation(self):
        """Test workspace slug format validation."""
        # Valid slug
        data = WorkspaceCreate(
            name="Test",
            slug="valid-slug-123",
        )
        assert data.slug == "valid-slug-123"
    
    def test_workspace_response(self):
        """Test workspace response schema."""
        workspace_id = uuid4()
        
        data = WorkspaceResponse(
            id=workspace_id,
            name="Test Gym",
            slug="test-gym",
            branding={},
            settings={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        assert data.id == workspace_id
        assert data.name == "Test Gym"
