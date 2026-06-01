# Dockerfile for the SwarmDev web (Next.js) application
FROM node:22-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm@9.15.0
# Copy workspace configuration files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
# Copy only the web source and any workspace packages it depends on
COPY apps/web ./apps/web
COPY packages ./packages
# Install only web dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile --filter ./apps/web... --config.enable-pre-post-scripts=true --config.ignore-scripts=false
# Change to the web directory and build the Next.js app
WORKDIR /app/apps/web
RUN pnpm build

# Production image
FROM node:22-alpine

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app
# Copy built assets from the builder stage
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/next.config.js ./next.config.js
COPY --from=builder /app/apps/web/public ./public
# Copy node_modules from builder (production only)
COPY --from=builder /app/apps/web/node_modules ./node_modules
COPY --from=builder /app/packages/shared-types/node_modules ./packages/shared-types/node_modules

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000
ENV NODE_ENV=production
CMD ["pnpm", "start"]