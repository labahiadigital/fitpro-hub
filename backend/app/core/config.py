from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Trackfiz"
    APP_ENV: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if v == "change-me-in-production":
            import os
            if os.getenv("APP_ENV", "development") == "production":
                raise ValueError(
                    "SECRET_KEY usa el valor por defecto inseguro en producción. "
                    "Configura un SECRET_KEY fuerte y aleatorio en tu .env"
                )
            import warnings
            warnings.warn(
                "SECRET_KEY is using the insecure default value. "
                "Set a strong random SECRET_KEY in your .env file.",
                stacklevel=2,
            )
        return v
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = ""
    DATABASE_SSL: bool = True
    
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
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://app.trackfiz.com"
    
    # Cloudflare R2 (S3-compatible object storage)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_PLATFORM_BUCKET: str = "trackfiz-platform"
    R2_PLATFORM_PUBLIC_URL: str = "https://pub-242c7b3240bb4ef19469afbf242adcdd.r2.dev"
    R2_WORKSPACES_BUCKET: str = "trackfiz-workspaces"
    R2_WORKSPACES_PUBLIC_URL: str = "https://pub-ca3308254a744147af2224d5e32de7ce.r2.dev"

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
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

