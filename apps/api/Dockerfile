# Dockerfile for the SwarmDev API (Express + TypeScript)
FROM node:22-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm@9.15.0
# Copy workspace configuration files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
# Copy only the API source and any workspace packages it depends on
COPY apps/api ./apps/api
COPY packages ./packages
# Install only the API's dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile --filter ./apps/api... --config.enable-pre-post-scripts=true --config.ignore-scripts=false
# Change to the API directory and build if a build script exists
WORKDIR /app/apps/api
RUN pnpm run build || true

# Production image
FROM node:22-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app
# Copy the built API artifacts from the builder stage
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/src ./src

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]