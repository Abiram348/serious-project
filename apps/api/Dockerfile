# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────
# SwarmDev API — Express.js + Prisma Dockerfile
# Multi-stage: deps → builder → runner
# ──────────────────────────────────────────────

ARG NODE_VERSION=22
ARG PNPM_VERSION=11.1.3

# ═══════════════════════════════════════════════
# Stage 1 — Dependencies
# ═══════════════════════════════════════════════
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

RUN npm install -g pnpm@${PNPM_VERSION}

# Copy root + workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install dependencies (api + db workspace packages)
RUN pnpm install --frozen-lockfile --filter api

# ═══════════════════════════════════════════════
# Stage 2 — Builder
# ═══════════════════════════════════════════════
FROM node:${NODE_VERSION}-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
RUN npm install -g pnpm@${PNPM_VERSION}

# Copy the entire dependency tree from deps (handles hoisted vs isolated node_modules)
COPY --from=deps /app ./

# Overwrite with full source code
COPY package.json pnpm-workspace.yaml ./
COPY packages/db ./packages/db
COPY apps/api ./apps/api

# Generate Prisma client and build TypeScript
WORKDIR /app/apps/api
ENV NODE_ENV=production
# Ensure prisma CLI is available (peer dep may not be auto-installed by pnpm)
RUN npm install -g prisma
RUN prisma generate --schema=../../packages/db/prisma/schema.prisma
RUN pnpm exec tsc

# ═══════════════════════════════════════════════
# Stage 3 — Runner
# ═══════════════════════════════════════════════
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache dumb-init
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apijs

# Copy built artifacts + Prisma client
COPY --from=builder --chown=apijs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=apijs:nodejs /app/packages/db ./packages/db
COPY --from=builder --chown=apijs:nodejs /app/node_modules ./node_modules

# Prisma schema (needed for runtime migrations)
COPY --from=builder --chown=apijs:nodejs /app/packages/db/prisma ./packages/db/prisma

# Migration entrypoint script
COPY --chown=apijs:nodejs infra/docker/api-migrate.sh /usr/local/bin/api-migrate.sh
RUN chmod +x /usr/local/bin/api-migrate.sh

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

USER apijs
EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
