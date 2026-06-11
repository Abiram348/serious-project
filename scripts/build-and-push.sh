#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Build and push Docker images to ECR
# Usage: ./scripts/build-and-push.sh <environment>
# ──────────────────────────────────────────────

set -euo pipefail

ENVIRONMENT=${1:-staging}
AWS_REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "🔧 Building and pushing images for ${ENVIRONMENT}..."
echo "   ECR Registry: ${ECR_REGISTRY}"

# Login to ECR
echo "🔑 Logging into Amazon ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Get the absolute path to the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

cd "${PROJECT_ROOT}"

# ─── Build Web ───
echo ""
echo "🏗️  Building web image..."
docker build -f apps/web/Dockerfile -t swarmdev/web:latest .
docker tag swarmdev/web:latest ${ECR_REGISTRY}/swarmdev/web:latest
echo "📤 Pushing web image..."
docker push ${ECR_REGISTRY}/swarmdev/web:latest

# ─── Build API ───
echo ""
echo "🏗️  Building api image..."
docker build -f apps/api/Dockerfile -t swarmdev/api:latest .
docker tag swarmdev/api:latest ${ECR_REGISTRY}/swarmdev/api:latest
echo "📤 Pushing api image..."
docker push ${ECR_REGISTRY}/swarmdev/api:latest

# ─── Build Orchestrator ───
echo ""
echo "🏗️  Building orchestrator image..."
docker build -f apps/orchestrator/Dockerfile -t swarmdev/orchestrator:latest .
docker tag swarmdev/orchestrator:latest ${ECR_REGISTRY}/swarmdev/orchestrator:latest
echo "📤 Pushing orchestrator image..."
docker push ${ECR_REGISTRY}/swarmdev/orchestrator:latest

echo ""
echo "✅ All images built and pushed successfully!"
echo ""
echo "Images:"
echo "  web:          ${ECR_REGISTRY}/swarmdev/web:latest"
echo "  api:          ${ECR_REGISTRY}/swarmdev/api:latest"
echo "  orchestrator: ${ECR_REGISTRY}/swarmdev/orchestrator:latest"
