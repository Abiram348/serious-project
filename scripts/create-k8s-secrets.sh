#!/bin/bash
# ──────────────────────────────────────────────
# SwarmDev — Create Kubernetes Secrets from Terraform Outputs
# Run this AFTER Terraform apply to sync secrets into EKS
# ──────────────────────────────────────────────
set -euo pipefail

ENVIRONMENT="${1:-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"

usage() {
    echo "Usage: $0 [dev|staging|production]"
    exit 1
}

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    usage
fi

ns="swarmdev-${ENVIRONMENT}"
prefix=""
[[ "$ENVIRONMENT" == "dev" ]] && prefix="dev-"
[[ "$ENVIRONMENT" == "staging" ]] && prefix="staging-"
[[ "$ENVIRONMENT" == "production" ]] && prefix="prod-"

echo "Creating Kubernetes secrets for ${ENVIRONMENT}..."

# Ensure kubectl is connected
kubectl cluster-info >/dev/null 2>&1 || {
    echo "ERROR: kubectl not connected to cluster"
    echo "Run: aws eks update-kubeconfig --region ${AWS_REGION} --name swarmdev-${ENVIRONMENT}"
    exit 1
}

# Ensure namespace exists
kubectl create namespace "${ns}" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

# Get values from Terraform outputs
cd "/Users/abiramreddymartala/serious project/infra/terraform/environments/${ENVIRONMENT}"

DB_ENDPOINT=$(terraform output -raw db_endpoint 2>/dev/null || echo "")
REDIS_ENDPOINT=$(terraform output -raw redis_endpoint 2>/dev/null || echo "")

echo "DB Endpoint: ${DB_ENDPOINT}"
echo "Redis Endpoint: ${REDIS_ENDPOINT}"

# For dev, use in-cluster services (postgres/redis/qdrant)
if [[ "$ENVIRONMENT" == "dev" ]]; then
    DB_URL="postgresql://orchestrator:orchestratorpw@postgres:5432/swarmdev"
    REDIS_URL="redis://redis:6379"
# For staging/production, use AWS managed services
else
    # Extract host:port from RDS endpoint
    DB_HOST=$(echo "${DB_ENDPOINT}" | cut -d: -f1)
    DB_URL="postgresql://orchestrator:Abiram!2005@${DB_ENDPOINT}/swarmdev"
    REDIS_URL="redis://${REDIS_ENDPOINT}:6379"
fi

# Create/update the secret
echo "Creating secret swarmdev-secrets in namespace ${ns}..."
kubectl create secret generic swarmdev-secrets \
    --namespace="${ns}" \
    --from-literal=DATABASE_URL="${DB_URL}" \
    --from-literal=REDIS_URL="${REDIS_URL}" \
    --from-literal=CLERK_SECRET_KEY="${CLERK_SECRET_KEY:-}" \
    --from-literal=NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" \
    --from-literal=STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}" \
    --from-literal=ORCHESTRATOR_SECRET="${ORCHESTRATOR_SECRET:-dev-secret}" \
    --dry-run=client -o yaml | kubectl apply -f -

echo "Secret created/updated in ${ns}"
echo ""
echo "Verify with:"
echo "  kubectl get secret swarmdev-secrets -n ${ns} -o yaml"
