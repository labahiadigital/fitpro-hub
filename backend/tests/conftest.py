"""Pytest configuration and fixtures for testing."""
import asyncio
import os
from datetime import datetime
from typing import AsyncGenerator, Generator
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app
from app.core.database import get_db
from app.models.base import Base


# Test database URL - use SQLite for tests
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "sqlite+aiosqlite:///./test.db"
)

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,
    echo=False,
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()
    
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async HTTP client with overridden database dependency."""
    
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
def sync_client(db_session: AsyncSession) -> Generator[TestClient, None, None]:
    """Create synchronous test client for simpler tests."""
    
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as c:
        yield c
    
    app.dependency_overrides.clear()


# ============ Mock Data Fixtures ============

@pytest.fixture
def mock_user_data():
    """Generate mock user data."""
    return {
        "id": str(uuid4()),
        "email": "test@example.com",
        "full_name": "Test User",
        "is_active": True,
    }


@pytest.fixture
def mock_workspace_data():
    """Generate mock workspace data."""
    return {
        "id": str(uuid4()),
        "name": "Test Fitness Studio",
        "slug": "test-fitness-studio",
        "owner_id": str(uuid4()),
    }


@pytest.fixture
def mock_client_data():
    """Generate mock client data."""
    return {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "phone": "+34612345678",
        "goals": "Build muscle",
    }


@pytest.fixture
def mock_booking_data():
    """Generate mock booking data."""
    return {
        "title": "Training Session",
        "description": "Personal training",
        "session_type": "individual",
        "modality": "in_person",
        "start_time": datetime.utcnow().isoformat(),
        "end_time": datetime.utcnow().isoformat(),
        "capacity": 1,
    }


@pytest.fixture
def mock_auth_headers():
    """Generate mock auth headers for testing authenticated endpoints."""
    return {
        "Authorization": "Bearer test_token_12345"
    }


# ============ Helper Functions ============

def create_test_token(user_id: str, workspace_id: str = None) -> str:
    """Create a test JWT token for authentication testing."""
    # In real tests, this would create a proper JWT
    return f"test_token_{user_id}"
