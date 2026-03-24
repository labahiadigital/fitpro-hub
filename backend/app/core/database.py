import logging
import ssl
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def get_async_database_url(url: str) -> str:
    """Convert database URL to async version using asyncpg driver."""
    if not url:
        return "postgresql+asyncpg://localhost/fitprohub"

    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)

    return url


def _create_engine():
    """Create the async database engine lazily."""
    database_url = get_async_database_url(settings.DATABASE_URL)

    connect_args: dict = {
        "server_settings": {
            "application_name": "e13fitness_backend"
        },
    }

    if settings.DATABASE_SSL:
        db_ssl_context = ssl.create_default_context()
        connect_args["ssl"] = db_ssl_context

    return create_async_engine(
        database_url,
        echo=False,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args=connect_args,
    )


engine = _create_engine()

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

logger.info("Database URL configured (host hidden for security)")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
