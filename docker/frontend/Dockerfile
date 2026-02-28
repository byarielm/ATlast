# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Copy ALL workspace package.json files before running pnpm install.
# pnpm needs to see every package in the workspace to correctly resolve
# the lockfile and install each package's dependencies into the virtual store.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/web/package.json ./packages/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
COPY packages/worker/package.json ./packages/worker/
COPY packages/functions/package.json ./packages/functions/
COPY packages/extension/package.json ./packages/extension/

RUN pnpm install --frozen-lockfile

COPY packages/web ./packages/web
COPY packages/shared ./packages/shared

# Build shared first in case web imports any shared types at build time.
RUN pnpm --filter=@atlast/shared build

# Build the React app with Vite.
# The API base URL is handled by the nginx proxy, so no VITE_API_BASE override
# needs to be baked into the image. All /api/ requests will be proxied by nginx
# to the api container. This makes the same image work in any environment.
WORKDIR /app/packages/web
RUN pnpm build


# ─── Stage 2: Production (Nginx) ─────────────────────────────────────────────
# Switch to the official Nginx image — a static file server with config.
# This stage is tiny: the entire Node.js builder stage is discarded.
FROM nginx:alpine

# Copy the compiled React app into Nginx's web root.
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

# Replace Nginx's default config with ours.
# Our config adds: SPA routing, /api/ proxy, security headers, gzip, asset caching.
# NOTE: this path is relative to the Docker build context (repo root),
# because docker-compose.yml sets context: ..
COPY docker/frontend/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
