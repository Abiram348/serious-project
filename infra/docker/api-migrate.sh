#!/bin/sh
# ──────────────────────────────────────────────
# API Database Migration Entrypoint
# Runs Prisma migrate deploy before starting the app
# ──────────────────────────────────────────────
set -e

echo "Running Prisma migrate deploy..."
npx prisma migrate deploy --schema=/app/packages/db/prisma/schema.prisma

echo "Migration complete. Starting API server..."
exec "$@"
