# -----------------------------------------------------------------------------
# Backend (FastAPI + Gunicorn/Uvicorn) — multi-stage image for Coolify.
# -----------------------------------------------------------------------------
# Design notes:
#   * Multi-stage keeps the runtime image ~400 MB smaller (no compilers shipped).
#   * Layer ordering is optimised so Docker's built-in layer cache is reused
#     whenever requirements.txt hasn't changed — no BuildKit cache mounts
#     needed. Cache mounts with sharing=locked cross-serialised the four
#     services Coolify builds in parallel (backend/celery-beat/celery-worker/
#     frontend), which was WORSE than no cache mounts at all.
#   * Runs as an unprivileged user. We don't chown the app tree (slow on big
#     trees) — Python just needs read access, which is the default (mode 755).
# -----------------------------------------------------------------------------

ARG PYTHON_VERSION=3.11-slim

############################
# 1) Builder (compilers)
############################
FROM python:${PYTHON_VERSION} AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_ROOT_USER_ACTION=ignore

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

############################
# 2) Runtime (slim)
############################
FROM python:${PYTHON_VERSION} AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app \
    ASYNCPG_NO_IPV6=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    && echo 'precedence ::ffff:0:0/96 100' >> /etc/gai.conf \
    && groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app --home /app --shell /sbin/nologin app

COPY --from=builder /install /usr/local
COPY . .

USER app

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=10s --start-period=60s --retries=10 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["gunicorn", "app.main:app", \
     "-w", "1", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "-b", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--graceful-timeout", "30", \
     "--worker-tmp-dir", "/dev/shm", \
     "--preload", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--access-logformat", "%(h)s %(m)s %(U)s %(s)s %(D)sμs", \
     "--log-level", "info"]
