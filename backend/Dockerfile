# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Backend (FastAPI + Gunicorn/Uvicorn) — multi-stage image for Coolify/BuildKit.
# -----------------------------------------------------------------------------
# Design choices:
#   * BuildKit cache mounts for apt + pip so rebuilds on Coolify reuse caches
#     between deploys instead of re-downloading 400 MB every push.
#   * Single pip install (gunicorn already pinned in requirements.txt).
#   * Runtime stage has no compilers → ~400 MB smaller, smaller attack surface.
#   * Runs as an unprivileged user in the runtime stage.
# -----------------------------------------------------------------------------

ARG PYTHON_VERSION=3.11-slim

############################
# 1) Builder (compilers)
############################
FROM python:${PYTHON_VERSION} AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore

# Cached apt layer — BuildKit persists /var/cache/apt and /var/lib/apt
# across builds, so re-runs skip re-downloading build-essential/libpq-dev.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev

WORKDIR /build
COPY requirements.txt .

# Cached pip layer. `--compile` writes .pyc once at build time so cold-start
# in the runtime container is noticeably faster (no per-import compilation).
RUN --mount=type=cache,target=/root/.cache/pip,sharing=locked \
    pip install --prefix=/install --compile -r requirements.txt

############################
# 2) Runtime (slim)
############################
FROM python:${PYTHON_VERSION} AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app \
    # Force IPv4 DNS (fix for Supabase pooler connectivity on hosts w/ IPv6)
    ASYNCPG_NO_IPV6=1 \
    # Drop FastAPI/Uvicorn access logs at stderr level; gunicorn handles access log
    UVICORN_LOG_LEVEL=info

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
        tini && \
    echo 'precedence ::ffff:0:0/96 100' >> /etc/gai.conf

# Copy pre-built site-packages from builder — no compilers shipped.
COPY --from=builder /install /usr/local

# Create non-root user and copy app with correct ownership in one pass
# so we don't double the image size with an intermediate chown layer.
RUN groupadd --system --gid 1001 app && \
    useradd --system --uid 1001 --gid app --home /app --shell /sbin/nologin app
COPY --chown=app:app . .

USER app

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=10s --start-period=60s --retries=10 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# tini as PID 1 handles signals cleanly so Coolify's stop events don't time out.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["gunicorn", "app.main:app", \
     "-w", "1", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "-b", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--graceful-timeout", "30", \
     "--preload", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--access-logformat", "%(h)s %(m)s %(U)s %(s)s %(D)sμs", \
     "--log-level", "info"]
