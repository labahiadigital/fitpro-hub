from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


# SECRET_KEY must have at least this much entropy to be accepted in production.
# 32 bytes == 256 bits, which is the minimum recommended for HMAC-SHA256 (HS256 JWT).
_MIN_SECRET_KEY_LENGTH = 32


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Trackfiz"
    APP_ENV: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        import os
        import warnings

        is_prod = os.getenv("APP_ENV", "development") == "production"

        if v == "change-me-in-production":
            if is_prod:
                raise ValueError(
                    "SECRET_KEY usa el valor por defecto inseguro en producción. "
                    "Genera uno con: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
                )
            warnings.warn(
                "SECRET_KEY is using the insecure default value. Generate a strong one with "
                "`python -c 'import secrets; print(secrets.token_urlsafe(64))'`.",
                stacklevel=2,
            )
            return v

        if is_prod and len(v) < _MIN_SECRET_KEY_LENGTH:
            raise ValueError(
                f"SECRET_KEY debe tener al menos {_MIN_SECRET_KEY_LENGTH} caracteres en producción "
                "(256 bits recomendado). Regenera con secrets.token_urlsafe(64)."
            )

        if is_prod and len(set(v)) < 16:
            raise ValueError(
                "SECRET_KEY tiene muy poca entropía (demasiados caracteres repetidos). "
                "Usa una clave aleatoria generada con secrets.token_urlsafe(64)."
            )
        return v

    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = ""
    DATABASE_SSL: bool = True
    DATABASE_SSL_VERIFY: bool = False  # Enforces CERT_REQUIRED + hostname check (auto-on in production)
    DATABASE_SSL_CA: str = ""  # Optional path to a CA bundle file for self-hosted Postgres
    DATABASE_STATEMENT_TIMEOUT_MS: int = 15000  # 15s per-statement hard stop
    # Pool tuning.
    # Supabase's Session Pooler (port 5432) caps every client session at
    # `pool_size` connections (default 15). We must stay BELOW this per-worker
    # value or asyncpg will blow up with EMAXCONNSESSION under load.
    # With uvicorn running N workers, total upstream = N * (size + max_overflow)
    # must be <= 15 (or we switch to the Transaction Pooler on :6543).
    DATABASE_POOL_SIZE: int = 10
    DATABASE_POOL_MAX_OVERFLOW: int = 10
    DATABASE_POOL_RECYCLE_SECONDS: int = 1800  # 30m — matches Supabase PgBouncer idle
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    
    # Redsys (pasarela de pago española)
    REDSYS_MERCHANT_CODE: str = ""
    REDSYS_SECRET_KEY: str = ""
    REDSYS_TERMINAL: str = "1"
    REDSYS_ENVIRONMENT: str = "test"  # test o production
    
    # SeQura (pago fraccionado)
    SEQURA_USER: str = ""
    SEQURA_PASSWORD: str = ""
    SEQURA_MERCHANT_ID: str = ""
    SEQURA_ENDPOINT: str = "https://sandbox.sequrapi.com"
    SEQURA_ASSET_KEY: str = ""
    SEQURA_ENVIRONMENT: str = "sandbox"  # sandbox o production
    
    # Kapso (WhatsApp Business API)
    KAPSO_API_KEY: str = ""
    KAPSO_API_BASE_URL: str = "https://api.kapso.ai"
    KAPSO_WEBHOOK_SECRET: str = ""
    
    # Google Calendar Integration
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:5173/auth/google/callback"
    
    # Brevo (Email)
    BREVO_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@trackfiz.com"
    FROM_NAME: str = "Trackfiz"
    
    # Frontend URL (for invitation links)
    FRONTEND_URL: str = "http://localhost:5173"
    
    # CORS (comma-separated list of allowed origins)
    # In production this MUST be overridden in .env — the default only contains dev origins.
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Auth cookies for refresh tokens (hardened httpOnly cookie flow)
    AUTH_COOKIE_NAME: str = "tf_refresh"
    AUTH_COOKIE_DOMAIN: str = ""  # Leave empty for host-only cookie (recommended for single origin)
    AUTH_COOKIE_SECURE: bool = True  # Always true in production; auto-relaxed in dev via property
    AUTH_COOKIE_SAMESITE: str = "lax"  # "lax" | "strict" | "none". "none" requires Secure+HTTPS
    
    # Cloudflare R2 (S3-compatible object storage)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_PLATFORM_BUCKET: str = "trackfiz-platform"
    R2_PLATFORM_PUBLIC_URL: str = "https://trackfiz-platform.trackfiz.com"
    R2_WORKSPACES_BUCKET: str = "trackfiz-workspaces"
    R2_WORKSPACES_PUBLIC_URL: str = "https://trackfiz-workspaces.trackfiz.com"

    # Certificate encryption (AES-256-GCM for FNMT private keys at rest)
    # Generate with: python -c "import os; print(os.urandom(32).hex())"
    CERTIFICATE_ENCRYPTION_KEY: str = ""
    
    # Celery (uses REDIS_URL by default)
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""
    
    @property
    def celery_broker(self) -> str:
        return self.CELERY_BROKER_URL or self.REDIS_URL
    
    @property
    def celery_backend(self) -> str:
        return self.CELERY_RESULT_BACKEND or self.REDIS_URL
    
    @property
    def cors_origins_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        # Hard-block "*" in production to avoid accidental wide-open CORS.
        if self.APP_ENV == "production":
            origins = [o for o in origins if o != "*" and not o.startswith("http://localhost")]
        return origins

    @property
    def auth_cookie_secure(self) -> bool:
        """Force Secure in production regardless of env value."""
        if self.APP_ENV == "production":
            return True
        return self.AUTH_COOKIE_SECURE

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

