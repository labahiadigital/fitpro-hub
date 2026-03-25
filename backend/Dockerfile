# ---- Build stage: compile C extensions (psycopg2, asyncpg, etc.) ----
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt \
    && pip install --no-cache-dir --prefix=/install gunicorn

# ---- Runtime stage: slim image without compilers (~400 MB smaller) ----
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

# Force IPv4 DNS resolution (fix for Supabase connectivity issues with IPv6)
RUN echo 'precedence ::ffff:0:0/96 100' >> /etc/gai.conf
ENV ASYNCPG_NO_IPV6=1

# Copy pre-built Python packages from builder
COPY --from=builder /install /usr/local

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=10s --start-period=60s --retries=10 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["gunicorn", "app.main:app", "-w", "1", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000", "--timeout", "120", "--graceful-timeout", "30", "--preload", "--access-logfile", "-", "--access-logformat", "%(h)s %(m)s %(U)s %(s)s %(D)sμs"]
