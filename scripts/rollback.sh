#!/bin/bash
# ──────────────────────────────────────────────
# SwarmDev — Rollback Script
# Rolls back a deployment to the previous revision
# ──────────────────────────────────────────────
set -euo pipefail

ENVIRONMENT="${1:-staging}"
SERVICE="${2:-}"

usage() {
    echo "Usage: $0 [dev|staging|production] [web|api|orchestrator|all]"
    exit 1
}

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    usage
fi

if [[ -z "$SERVICE" ]]; then
    usage
fi

ns="swarmdev-${ENVIRONMENT}"

get_prefix() {
    case "$1" in
        dev) echo "dev-" ;;
        staging) echo "staging-" ;;
        production) echo "prod-" ;;
    esac
}

prefix=$(get_prefix "${ENVIRONMENT}")

rollback_service() {
    local svc="$1"
    echo "Rolling back ${prefix}${svc} in ${ns}..."
    kubectl rollout undo "deployment/${prefix}${svc}" -n "${ns}"
    kubectl rollout status "deployment/${prefix}${svc}" -n "${ns}" --timeout=300s
    echo "Rollback of ${svc} complete"
}

if [[ "$SERVICE" == "all" ]]; then
    rollback_service "web"
    rollback_service "api"
    rollback_service "orchestrator"
else
    rollback_service "${SERVICE}"
fi

echo "Rollback complete"
