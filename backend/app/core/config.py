from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Trackfiz"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"
    API_V1_PREFIX: str = "/api/v1"
    
    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    
    # Database
    DATABASE_URL: str = ""
    
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
    
    # Brevo (Email)
    BREVO_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@trackfiz.com"
    FROM_NAME: str = "Trackfiz"
    
    # CORS (comma-separated list of allowed origins)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://app.trackfiz.com"
    
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

