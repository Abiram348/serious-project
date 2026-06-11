# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────
# SwarmDev Web — Next.js 14 Dockerfile
# Multi-stage: deps → builder → runner
# ──────────────────────────────────────────────

ARG NODE_VERSION=22
ARG PNPM_VERSION=11.1.3

# ═══════════════════════════════════════════════
# Stage 1 — Dependencies
# ═══════════════════════════════════════════════
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/

# Install dependencies (web only, filtered by workspace)
RUN pnpm install --frozen-lockfile --filter web

# ═══════════════════════════════════════════════
# Stage 2 — Builder
# ═══════════════════════════════════════════════
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@${PNPM_VERSION}

# Copy the entire dependency tree from deps
COPY --from=deps /app ./

# Overwrite with full source code
COPY package.json pnpm-workspace.yaml ./
COPY apps/web ./apps/web

# Build Next.js with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
WORKDIR /app/apps/web
RUN pnpm exec next build

# ═══════════════════════════════════════════════
# Stage 3 — Runner
# ═══════════════════════════════════════════════
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only the standalone output + static assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
