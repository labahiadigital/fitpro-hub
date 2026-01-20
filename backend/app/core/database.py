from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from typing import AsyncGenerator
import ssl
import socket

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def resolve_host_to_ipv4(url: str) -> str:
    """
    Resolve the hostname in the URL to IPv4 address to avoid IPv6 issues.
    Some hosting providers don't support IPv6, but Supabase returns IPv6 addresses.
    """
    try:
        from urllib.parse import urlparse, urlunparse
        
        parsed = urlparse(url)
        if parsed.hostname:
            # Try to resolve to IPv4
            try:
                # Force IPv4 resolution
                ipv4_addr = socket.getaddrinfo(
                    parsed.hostname, 
                    parsed.port or 5432, 
                    socket.AF_INET,  # Force IPv4
                    socket.SOCK_STREAM
                )[0][4][0]
                
                # Replace hostname with IPv4 in URL
                # We need to keep the original hostname for SSL verification
                # So we'll just log this for now and use the original URL
                print(f"✅ Resolved {parsed.hostname} to IPv4: {ipv4_addr}")
            except socket.gaierror as e:
                print(f"⚠️ Could not resolve {parsed.hostname} to IPv4: {e}")
    except Exception as e:
        print(f"⚠️ Error in resolve_host_to_ipv4: {e}")
    
    return url


def get_async_database_url(url: str) -> str:
    """Convert database URL to async version using asyncpg driver."""
    if not url:
        return "postgresql+asyncpg://localhost/fitprohub"
    
    # Replace postgresql:// with postgresql+asyncpg://
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    
    return url


# Get the async database URL
DATABASE_URL = get_async_database_url(settings.DATABASE_URL)

# Log the database host for debugging
print(f"🔌 Database URL configured (host hidden for security)")

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

