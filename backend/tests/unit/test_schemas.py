"""Unit tests for Pydantic schemas."""
import pytest
from datetime import datetime
from uuid import uuid4
from pydantic import ValidationError

from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
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
        data = TokenResponse(
            access_token="eyJhbGciOiJIUzI1NiIs...",
            refresh_token="refresh_token_value",
            token_type="bearer",
        )
        assert data.token_type == "bearer"
        assert data.access_token.startswith("eyJ")


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
        owner_id = uuid4()
        
        data = WorkspaceResponse(
            id=workspace_id,
            name="Test Gym",
            slug="test-gym",
            owner_id=owner_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        assert data.id == workspace_id
        assert data.name == "Test Gym"
