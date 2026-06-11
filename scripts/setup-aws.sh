#!/bin/bash
# ──────────────────────────────────────────────
# SwarmDev — AWS Infrastructure Setup Script
# Bootstraps Terraform backend and applies infra
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
    echo "Usage: $0 [dev|staging|production]"
    echo ""
    echo "Sets up AWS infrastructure for SwarmDev using Terraform."
    echo "Requires AWS CLI credentials with sufficient permissions."
    exit 1
}

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    usage
fi

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v aws >/dev/null 2>&1; then
        log_error "AWS CLI is not installed"
        exit 1
    fi

    if ! command -v terraform >/dev/null 2>&1; then
        log_error "Terraform is not installed"
        exit 1
    fi

    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials are not configured or invalid"
        exit 1
    fi

    log_info "Prerequisites OK"
}

# Bootstrap Terraform backend (S3 + DynamoDB)
bootstrap_backend() {
    log_info "Bootstrapping Terraform backend..."

    local bucket_name="swarmdev-terraform-state"
    local lock_table="swarmdev-terraform-locks"

    # Create S3 bucket if it doesn't exist
    if ! aws s3api head-bucket --bucket "${bucket_name}" 2>/dev/null; then
        log_info "Creating S3 bucket for Terraform state..."
        aws s3api create-bucket \
            --bucket "${bucket_name}" \
            --region "${AWS_REGION}" \
            $( [[ "${AWS_REGION}" != "us-east-1" ]] && echo "--create-bucket-configuration LocationConstraint=${AWS_REGION}" )

        aws s3api put-bucket-versioning \
            --bucket "${bucket_name}" \
            --versioning-configuration Status=Enabled

        aws s3api put-bucket-encryption \
            --bucket "${bucket_name}" \
            --server-side-encryption-configuration '{
                "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
            }'
    else
        log_info "S3 bucket already exists"
    fi

    # Create DynamoDB table for state locking
    if ! aws dynamodb describe-table --table-name "${lock_table}" >/dev/null 2>&1; then
        log_info "Creating DynamoDB table for state locking..."
        aws dynamodb create-table \
            --table-name "${lock_table}" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST
    else
        log_info "DynamoDB table already exists"
    fi
}

# Apply Terraform
apply_terraform() {
    log_info "Applying Terraform for ${ENVIRONMENT} environment..."

    local tf_dir="${PROJECT_ROOT}/infra/terraform/environments/${ENVIRONMENT}"

    if [[ ! -d "${tf_dir}" ]]; then
        log_error "Terraform directory not found: ${tf_dir}"
        exit 1
    fi

    cd "${tf_dir}"

    # Check for tfvars
    if [[ ! -f "terraform.tfvars" ]]; then
        if [[ -f "terraform.tfvars.example" ]]; then
            log_error "terraform.tfvars not found. Please create it from terraform.tfvars.example"
            exit 1
        fi
    fi

    terraform init
    terraform plan -out=tfplan
    terraform apply tfplan

    log_info "Terraform apply complete for ${ENVIRONMENT}"

    # Output key values
    echo ""
    log_info "Key outputs:"
    terraform output
}

# Main
main() {
    log_info "SwarmDev AWS Infrastructure Setup"
    log_info "Environment: ${ENVIRONMENT}"
    log_info "==================================="

    check_prerequisites
    bootstrap_backend
    apply_terraform

    log_info "Setup complete!"
    log_info "Next steps:"
    echo "  1. Configure kubectl: aws eks update-kubeconfig --region ${AWS_REGION} --name swarmdev-${ENVIRONMENT}"
    echo "  2. Deploy apps: ./scripts/deploy-k8s.sh ${ENVIRONMENT}"
}

main "$@"
