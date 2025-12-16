# Single stage build for better compatibility with Coolify
# Build version: 2025-12-16-v2 (force rebuild)
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Copy application code
COPY . .

# Make sure scripts are usable
ENV PATH=/root/.local/bin:$PATH

# Expose port
EXPOSE 8000

# Health check with longer start period for app initialization
HEALTHCHECK --interval=10s --timeout=10s --start-period=60s --retries=10 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application with gunicorn for production
# - Using 1 worker to minimize memory usage on small servers
# - Timeout of 120s to allow for slow startup with Supabase connections
# - Graceful timeout for clean shutdowns
# - Preload app to catch startup errors early
CMD ["gunicorn", "app.main:app", "-w", "1", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000", "--timeout", "120", "--graceful-timeout", "30", "--preload"]
