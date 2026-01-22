from contextlib import asynccontextmanager
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"[START] Starting {settings.APP_NAME}...")
    yield
    # Shutdown
    print(f"[STOP] Shutting down {settings.APP_NAME}...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Plataforma SaaS multi-tenant para profesionales de fitness, wellness y salud",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)


# Custom exception handler to ensure CORS headers are always present
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions and ensure CORS headers are present."""
    # Log the error for debugging
    print(f"[ERROR] Unhandled exception: {exc}")
    print(f"   Path: {request.url.path}")
    print(f"   Method: {request.method}")
    traceback.print_exc()
    
    # Get origin from request
    origin = request.headers.get("origin", "*")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An unexpected error occurred"
        },
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )


# CORS - Allow all origins in development/staging
# Note: When allow_credentials=True, we cannot use allow_origins=["*"]
# So we use allow_origin_regex to match all origins
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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


@app.get("/test-dns")
async def test_dns():
    """Test DNS resolution and HTTP connection to Supabase."""
    import socket
    import httpx
    from supabase._async.client import create_client as create_async_client
    from app.core.config import settings
    
    results = {}
    
    # Test DNS resolution
    try:
        addrs = socket.getaddrinfo("ougfmkbjrpnjvujhuuyy.supabase.co", 443)
        results["dns"] = f"OK - {len(addrs)} addresses"
    except Exception as e:
        results["dns"] = f"Error: {str(e)}"
    
    # Test HTTP connection
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("https://ougfmkbjrpnjvujhuuyy.supabase.co/rest/v1/", timeout=10)
            results["http"] = f"OK - Status {response.status_code}"
    except Exception as e:
        results["http"] = f"Error: {str(e)}"
    
    # Test Supabase client
    try:
        client = await create_async_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        results["supabase_client"] = "OK - Client created"
        
        # Test auth
        try:
            auth_response = await client.auth.sign_in_with_password({
                "email": "e13fitnessofficial@gmail.com",
                "password": "E13Fitness2024!Secure#"
            })
            results["supabase_auth"] = f"OK - User: {auth_response.user.email if auth_response.user else 'None'}"
        except Exception as e:
            results["supabase_auth"] = f"Error: {str(e)}"
    except Exception as e:
        results["supabase_client"] = f"Error: {str(e)}"
    
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )

