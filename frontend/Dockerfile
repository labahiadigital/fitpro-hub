# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Frontend (Vite 8 + React 19) — builder + nginx runtime.
# -----------------------------------------------------------------------------
# Key optimisations vs. the previous version:
#   * Corepack activates the exact pnpm pinned in package.json → no
#     "npm install -g pnpm" download on every build.
#   * BuildKit pnpm-store cache mount means warm builds skip re-downloading
#     packages (~200 MB) between Coolify deploys.
#   * Script approval is handled declaratively via package.json > pnpm >
#     onlyBuiltDependencies instead of the interactive `pnpm approve-builds`
#     command (which is a no-op in CI).
#   * Only public VITE_* build args are declared — everything else must come
#     in as runtime env on nginx (no secrets baked into the image layer).
# -----------------------------------------------------------------------------

ARG NODE_VERSION=20-alpine
ARG NGINX_VERSION=1.27-alpine

############################
# 1) Builder
############################
FROM node:${NODE_VERSION} AS builder

ENV NODE_OPTIONS="--max-old-space-size=4096" \
    PNPM_HOME="/root/.local/share/pnpm" \
    PATH="/root/.local/share/pnpm:$PATH" \
    CI=true

WORKDIR /app

# Enable corepack (ships with Node >=16) so pnpm version is pinned by
# package.json#packageManager. No extra download, no version drift.
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate

# Manifest layer — only copy what pnpm needs to resolve the graph so that
# unrelated source changes don't bust the install cache.
COPY package.json pnpm-lock.yaml .npmrc ./

# Cache mount keeps the pnpm store warm across Coolify rebuilds.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

# Application source (second layer — changes most often).
COPY . .

# Public build-time env. Only safe-to-expose values belong here.
# DO NOT add server secrets — they will end up in the bundle.
ARG VITE_API_URL
ARG VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL \
    VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

RUN pnpm run build

############################
# 2) Runtime — nginx serves pre-built + pre-compressed assets
############################
FROM nginx:${NGINX_VERSION} AS runtime

# curl is needed for the HEALTHCHECK below.
RUN apk add --no-cache curl && \
    # nginx:alpine ships with a default server block — our config replaces it.
    rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -fsS http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
