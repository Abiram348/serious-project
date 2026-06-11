#!/bin/bash
# ──────────────────────────────────────────────
# SwarmDev — DB Backup Script
# Creates manual RDS snapshot
# ──────────────────────────────────────────────
set -euo pipefail

ENVIRONMENT="${1:-staging}"
DB_INSTANCE_IDENTIFIER="swarmdev-${ENVIRONMENT}-db"
SNAPSHOT_ID="swarmdev-${ENVIRONMENT}-manual-$(date +%Y%m%d-%H%M%S)"

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo "Usage: $0 [dev|staging|production]"
    exit 1
fi

echo "Creating RDS snapshot: ${SNAPSHOT_ID}..."
aws rds create-db-snapshot \
    --db-instance-identifier "${DB_INSTANCE_IDENTIFIER}" \
    --db-snapshot-identifier "${SNAPSHOT_ID}"

echo "Waiting for snapshot to complete..."
aws rds wait db-snapshot-available \
    --db-snapshot-identifier "${SNAPSHOT_ID}"

echo "Snapshot complete: ${SNAPSHOT_ID}"
