from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from typing import AsyncGenerator
import ssl

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def get_async_database_url(url: str) -> str:
    """Convert database URL to async version using asyncpg driver."""
    if not url:
        return "postgresql+asyncpg://localhost/fitprohub"
    
    # Replace postgresql:// with postgresql+asyncpg://
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    
    return url


# Get the async database URL
DATABASE_URL = get_async_database_url(settings.DATABASE_URL)

# Create SSL context for Supabase connections
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Connection arguments for asyncpg with SSL support
connect_args = {
    "ssl": ssl_context,
    "server_settings": {
        "application_name": "e13fitness_backend"
    }
}

# Use NullPool in production for better connection handling with serverless DBs
# Use standard pool in development for connection reuse
if settings.APP_ENV == "production":
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        poolclass=NullPool,  # Each request gets a new connection
        connect_args=connect_args,
    )
else:
    engine = create_async_engine(
        DATABASE_URL,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,  # Recycle connections after 30 minutes
        connect_args=connect_args,
    )

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

