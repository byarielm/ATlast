# ─── Stage 1: Builder ────────────────────────────────────────────────────────
# This stage has all the dev tools needed to compile TypeScript.
# It will NOT be included in the final image.
FROM node:20-alpine AS builder

WORKDIR /app

# Enable Corepack and activate the exact pnpm version from package.json.
# This ensures we use pnpm 10.28.0 — the same version that generated the lockfile.
# Using a different pnpm version with --frozen-lockfile can cause build failures.
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# ── Layer caching: copy package manifests BEFORE source code ──
# Docker caches each layer. If these files do not change, the
# expensive `pnpm install` step below is skipped on subsequent builds.
# Changing a .ts source file will NOT invalidate this layer.
# Copy ALL workspace package.json files before running pnpm install.
# pnpm needs to see every package in the workspace to correctly resolve
# the lockfile and install each package's dependencies into the virtual store.
# Without all 6 package.json files, workspace package deps (kysely, hono, pg)
# are not linked even though the install appears to succeed.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/worker/package.json ./packages/worker/
COPY packages/web/package.json ./packages/web/
COPY packages/functions/package.json ./packages/functions/
COPY packages/extension/package.json ./packages/extension/

# Install ALL dependencies (including devDependencies needed for TypeScript compilation).
# --frozen-lockfile: fail if pnpm-lock.yaml would be updated (ensures reproducible builds).
RUN pnpm install --frozen-lockfile

# Now copy source code. This layer changes often, but that is fine because
# the slow `pnpm install` layer above is already cached.
COPY packages/api ./packages/api
COPY packages/shared ./packages/shared

# Build shared package first — api imports from @atlast/shared.
# The TypeScript compiler needs shared's output before compiling api.
RUN pnpm --filter=@atlast/shared build

# Build the API package (tsc outputs to packages/api/dist/).
RUN pnpm --filter=@atlast/api build

# Create a self-contained production deployment bundle.
# `pnpm deploy` resolves workspace symlinks (@atlast/shared) into real files,
# installs only production dependencies, and writes everything to /deploy.
# Without this, the container would have broken symlinks to packages that
# do not exist at the expected path inside the container.
# --legacy flag required in pnpm v10 for workspaces without inject-workspace-packages=true
RUN pnpm --filter=@atlast/api --prod deploy --legacy /deploy


# ─── Stage 2: Production ─────────────────────────────────────────────────────
# Start fresh from a minimal Node.js image.
# NOTHING from the builder stage is included — no TypeScript, no pnpm, no source.
FROM node:20-alpine

WORKDIR /app

# Create a non-root user.
# By default, Node.js containers run as root. If an attacker exploits a
# vulnerability in the app, running as non-root limits what they can do.
# They cannot modify system files, install packages, or affect other containers.
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

# Copy only the deployment bundle from the builder stage.
# This includes: dist/ (compiled JS) + node_modules/ (resolved deps, no symlinks).
# --chown sets file ownership to the non-root user we created above.
COPY --from=builder --chown=nodejs:nodejs /deploy .

# Switch to non-root user before the process starts.
USER nodejs

# Document which port the app listens on (does not actually open the port).
EXPOSE 3000

# Start the compiled server.
CMD ["node", "dist/server.js"]
