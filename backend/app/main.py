import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 Starting {settings.APP_NAME}...")
    yield
    # Shutdown
    print(f"👋 Shutting down {settings.APP_NAME}...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Plataforma SaaS multi-tenant para profesionales de fitness, wellness y salud",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# CORS - Build allowed origins list
cors_origins = settings.cors_origins_list.copy()

# Add Coolify domains if running in Coolify environment
coolify_fqdn = os.environ.get("COOLIFY_FQDN", "")
if coolify_fqdn:
    # Add both http and https variants of the Coolify domain
    cors_origins.append(f"http://{coolify_fqdn}")
    cors_origins.append(f"https://{coolify_fqdn}")

# Add wildcard for sslip.io domains in development/staging
# This allows any Coolify-deployed frontend to access the API
cors_origins.extend([
    "http://v4sw4gwko4gg8448cokswkgg.157.90.237.126.sslip.io",
    "https://v4sw4gwko4gg8448cokswkgg.157.90.237.126.sslip.io",
])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )

