# -----------------------------------------------------------------------------
# Frontend (Vite 8 + React 19) — builder + nginx runtime.
# -----------------------------------------------------------------------------
# Notes:
#   * No BuildKit cache mounts. With Coolify building 4 services in parallel
#     the cache-mount lock serialised them and made deploys 3-4× slower
#     than the previous (uncached) version. Docker's native layer cache is
#     enough for this project.
#   * Corepack activates the pinned pnpm from package.json so we don't pay
#     for `npm install -g pnpm` on every build.
#   * Script approval for esbuild/core-js/biome is declared statically in
#     package.json > pnpm.onlyBuiltDependencies (the previous runtime
#     `pnpm approve-builds` command was a no-op in CI).
#   * Only the two PUBLIC VITE_* args are declared. Server secrets must never
#     be passed in here — they end up baked into the bundle.
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

RUN corepack enable && corepack prepare pnpm@10.26.0 --activate

# Manifest layer is copied first so unrelated source changes don't invalidate
# the expensive `pnpm install` layer.
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prefer-offline

COPY . .

ARG VITE_API_URL
ARG VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL \
    VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

RUN pnpm run build

############################
# 2) Runtime — nginx serves pre-built + pre-compressed assets
############################
FROM nginx:${NGINX_VERSION} AS runtime

RUN apk add --no-cache curl && \
    rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -fsS http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
