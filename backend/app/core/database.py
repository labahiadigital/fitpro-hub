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


def _build_ssl_context() -> ssl.SSLContext:
    """
    Build an SSL context that actually validates the server certificate.

    Uses the system CA bundle. For Supabase, the PgBouncer/Postgres certificate
    is signed by a public CA so hostname + chain verification works out of the box.
    Fall back to a self-signed bundle via DATABASE_SSL_CA if provided.
    """
    ca_file = settings.DATABASE_SSL_CA or None
    ctx = ssl.create_default_context(cafile=ca_file) if ca_file else ssl.create_default_context()
    ctx.check_hostname = True
    ctx.verify_mode = ssl.CERT_REQUIRED
    # Avoid falling back to legacy ciphers / TLS <1.2
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2
    return ctx


def _is_supabase_pooler(url: str) -> bool:
    """Heuristic: Supabase pooler hostnames always contain '.pooler.supabase.'.

    We use this to auto-disable features that break on PgBouncer session /
    transaction mode, such as prepared statements.
    """
    return ".pooler.supabase." in url


def _create_engine():
    """Create the async database engine lazily."""
    database_url = get_async_database_url(settings.DATABASE_URL)
    uses_supabase_pooler = _is_supabase_pooler(database_url)

    connect_args: dict = {
        "server_settings": {
            "application_name": "trackfiz_backend",
            # Hard server-side statement timeout so a rogue query can't hold a conn forever.
            "statement_timeout": str(settings.DATABASE_STATEMENT_TIMEOUT_MS),
            "idle_in_transaction_session_timeout": "30000",
        },
    }

    if uses_supabase_pooler:
        # PgBouncer doesn't keep per-connection state across session boundaries,
        # so asyncpg's prepared-statement cache breaks. Disabling it lets us
        # safely switch between session (:5432) and transaction (:6543) mode
        # without sporadic "prepared statement already exists" errors.
        connect_args["statement_cache_size"] = 0
        connect_args["prepared_statement_cache_size"] = 0
        logger.info("Supabase pooler detected -> disabling asyncpg statement cache")

    if settings.DATABASE_SSL:
        if settings.APP_ENV == "production" or settings.DATABASE_SSL_VERIFY:
            connect_args["ssl"] = _build_ssl_context()
        else:
            # Dev/staging: allow self-signed without hostname checks, but still encrypt.
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = ctx
            logger.warning(
                "DATABASE_SSL is enabled without certificate verification (APP_ENV=%s). "
                "Set DATABASE_SSL_VERIFY=true and APP_ENV=production to enforce full TLS validation.",
                settings.APP_ENV,
            )

    return create_async_engine(
        database_url,
        echo=False,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_POOL_MAX_OVERFLOW,
        pool_pre_ping=True,
        pool_recycle=settings.DATABASE_POOL_RECYCLE_SECONDS,
        pool_timeout=30,
        # Kill the connection if it looks stuck on checkout to avoid
        # cascading greenlet hangs when the pool is saturated.
        pool_reset_on_return="rollback",
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
