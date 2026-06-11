#!/bin/bash
# ──────────────────────────────────────────────
# SwarmDev — Kubernetes Deployment Script
# Deploys or updates SwarmDev on EKS
# ──────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

ENVIRONMENT="${1:-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"

usage() {
    echo "Usage: $0 [dev|staging|production] [image-tag]"
    echo ""
    echo "Deploys SwarmDev to EKS using Kustomize."
    echo "If image-tag is not provided, uses 'latest'."
    exit 1
}

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    usage
fi

IMAGE_TAG="${2:-latest}"
OVERLAY_DIR="${PROJECT_ROOT}/infra/k8s/overlays/${ENVIRONMENT}"
ECR_REGISTRY="${AWS_ACCOUNT_ID:-ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v kubectl >/dev/null 2>&1; then
        log_error "kubectl is not installed"
        exit 1
    fi

    if ! command -v kustomize >/dev/null 2>&1 && ! kubectl kustomize --help >/dev/null 2>&1; then
        log_error "kustomize is not installed"
        exit 1
    fi

    # Check cluster connection
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        log_info "Run: aws eks update-kubeconfig --region ${AWS_REGION} --name swarmdev-${ENVIRONMENT}"
        exit 1
    fi

    log_info "Prerequisites OK"
}

# Update image tags in Kustomize
update_images() {
    log_info "Updating image tags to ${IMAGE_TAG}..."

    cd "${OVERLAY_DIR}"

    kustomize edit set image \
        swarmdev-web="${ECR_REGISTRY}/swarmdev/web:${IMAGE_TAG}" \
        swarmdev-api="${ECR_REGISTRY}/swarmdev/api:${IMAGE_TAG}" \
        swarmdev-orchestrator="${ECR_REGISTRY}/swarmdev/orchestrator:${IMAGE_TAG}"
}

# Check/create secrets
check_secrets() {
    local ns="swarmdev-${ENVIRONMENT}"

    if ! kubectl get secret swarmdev-secrets -n "${ns}" >/dev/null 2>&1; then
        if [[ "$ENVIRONMENT" == "staging" || "$ENVIRONMENT" == "production" ]]; then
            log_warn "K8s secret 'swarmdev-secrets' not found in ${ns}"
            log_info "Creating secrets from Terraform outputs..."
            "${SCRIPT_DIR}/create-k8s-secrets.sh" "${ENVIRONMENT}" || {
                log_error "Failed to create secrets. Make sure Terraform has been applied."
                exit 1
            }
        fi
    fi
}

# Deploy to Kubernetes
deploy() {
    log_info "Deploying to ${ENVIRONMENT}..."

    cd "${OVERLAY_DIR}"

    if command -v kustomize >/dev/null 2>&1; then
        kustomize build . | kubectl apply -f -
    else
        kubectl apply -k .
    fi

    log_info "Waiting for deployments to roll out..."

    local prefix=""
    if [[ "$ENVIRONMENT" == "dev" ]]; then prefix="dev-"; fi
    if [[ "$ENVIRONMENT" == "staging" ]]; then prefix="staging-"; fi
    if [[ "$ENVIRONMENT" == "production" ]]; then prefix="prod-"; fi

    local ns="swarmdev-${ENVIRONMENT}"

    kubectl rollout status deployment/${prefix}web -n "${ns}" --timeout=300s
    kubectl rollout status deployment/${prefix}api -n "${ns}" --timeout=300s
    kubectl rollout status deployment/${prefix}orchestrator -n "${ns}" --timeout=300s

    log_info "Deployments rolled out successfully"
}

# Run DB migrations
run_migrations() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_warn "Skipping automatic DB migration in production"
        log_info "Please run migrations manually if needed:"
        echo "  kubectl create job api-migrate-manual -n swarmdev-prod --from=cronjob/prod-api-migrate"
        return
    fi

    log_info "Running database migrations..."

    local ns="swarmdev-${ENVIRONMENT}"
    local job_name="api-migrate-$(date +%s)"

    # Create migration job from API deployment template
    kubectl get deployment -n "${ns}" -l app.kubernetes.io/name=api -o yaml | \
        sed 's/kind: Deployment/kind: Job/' | \
        sed "s/name: .*/name: ${job_name}/" | \
        kubectl apply -f - || true

    kubectl wait --for=condition=complete job/${job_name} -n "${ns}" --timeout=300s || true
}

# Verify deployment
verify() {
    log_info "Verifying deployment..."

    local ns="swarmdev-${ENVIRONMENT}"

    echo ""
    echo "Pods:"
    kubectl get pods -n "${ns}"

    echo ""
    echo "Services:"
    kubectl get svc -n "${ns}"

    echo ""
    echo "Ingress:"
    kubectl get ingress -n "${ns}"
}

# Main
main() {
    log_info "SwarmDev Kubernetes Deployment"
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Image Tag: ${IMAGE_TAG}"
    log_info "==============================="

    check_prerequisites
    check_secrets
    update_images
    deploy
    run_migrations
    verify

    log_info "Deployment complete!"
}

main "$@"
