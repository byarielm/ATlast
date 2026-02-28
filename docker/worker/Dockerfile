# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Copy ALL workspace package.json files before running pnpm install.
# pnpm needs to see every package in the workspace to correctly resolve
# the lockfile and install each package's dependencies into the virtual store.
# Without all 6 package.json files, workspace package deps (kysely, bullmq, pg)
# are not linked even though the install appears to succeed.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/worker/package.json ./packages/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/
COPY packages/functions/package.json ./packages/functions/
COPY packages/extension/package.json ./packages/extension/

RUN pnpm install --frozen-lockfile

COPY packages/worker ./packages/worker
COPY packages/shared ./packages/shared

# Build shared first (worker imports Database type from @atlast/shared).
RUN pnpm --filter=@atlast/shared build

# Build the worker package (tsc outputs to packages/worker/dist/).
RUN pnpm --filter=@atlast/worker build

# Create production deployment bundle with resolved workspace dependencies.
# --legacy flag required in pnpm v10 for workspaces without inject-workspace-packages=true
RUN pnpm --filter=@atlast/worker --prod deploy --legacy /deploy


# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

# Copy deployment bundle: dist/ (compiled JS) + node_modules/ (production deps).
COPY --from=builder --chown=nodejs:nodejs /deploy .

USER nodejs

# Worker does not expose any port — it only connects outward to Redis and PostgreSQL.
CMD ["node", "dist/index.js"]
