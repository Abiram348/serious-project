#!/bin/bash
# ──────────────────────────────────────────────
# SwarmDev — Local Development Setup Script
# One-command setup for local Docker Compose dev
# ──────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
INFRA_DIR="${PROJECT_ROOT}/infra"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker compose >/dev/null 2>&1; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    log_info "Prerequisites OK"
}

# Setup environment files
setup_env() {
    log_info "Setting up environment files..."

    # API env
    if [[ ! -f "${PROJECT_ROOT}/apps/api/.env" ]]; then
        if [[ -f "${PROJECT_ROOT}/apps/api/.env.example" ]]; then
            cp "${PROJECT_ROOT}/apps/api/.env.example" "${PROJECT_ROOT}/apps/api/.env"
            log_warn "Created apps/api/.env from .env.example — please review and update secrets"
        fi
    fi

    # Web env
    if [[ ! -f "${PROJECT_ROOT}/apps/web/.env.local" ]]; then
        if [[ -f "${PROJECT_ROOT}/apps/web/.env.example" ]]; then
            cp "${PROJECT_ROOT}/apps/web/.env.example" "${PROJECT_ROOT}/apps/web/.env.local"
            log_warn "Created apps/web/.env.local from .env.example — please review and update secrets"
        fi
    fi

    # Orchestrator env
    if [[ ! -f "${PROJECT_ROOT}/apps/orchestrator/.env" ]]; then
        if [[ -f "${PROJECT_ROOT}/apps/orchestrator/.env.example" ]]; then
            cp "${PROJECT_ROOT}/apps/orchestrator/.env.example" "${PROJECT_ROOT}/apps/orchestrator/.env"
            log_warn "Created apps/orchestrator/.env from .env.example — please review and update secrets"
        fi
    fi
}

# Build and start services
start_services() {
    log_info "Building and starting services..."

    cd "${INFRA_DIR}"

    # Build images
    docker compose build --parallel

    # Start services
    docker compose up -d

    # Wait for postgres to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    until docker compose exec -T postgres pg_isready -U orchestrator -d swarmdev >/dev/null 2>&1; do
        sleep 1
    done
    log_info "PostgreSQL is ready"

    # Run Prisma migrate
    log_info "Running database migrations..."
    docker compose exec -T api npx prisma migrate deploy --schema=/app/packages/db/prisma/schema.prisma || true

    # Wait for all services
    log_info "Waiting for all services to be healthy..."
    sleep 5
}

# Print status
print_status() {
    echo ""
    log_info "Services should be running at:"
    echo "  🌐 Web:       http://localhost:3000"
    echo "  🔌 API:       http://localhost:3001"
    echo "  🤖 Orchestrator: http://localhost:8000"
    echo "  🐘 PostgreSQL: localhost:5432"
    echo "  🔄 Redis:     localhost:6379"
    echo "  🔍 Qdrant:    http://localhost:6333"
    echo ""
    log_info "Useful commands:"
    echo "  cd infra && docker compose logs -f    # Follow logs"
    echo "  cd infra && docker compose down        # Stop all services"
    echo "  cd infra && docker compose ps          # Check status"
    echo ""
}

# Main
main() {
    log_info "SwarmDev Local Development Setup"
    log_info "================================"

    check_prerequisites
    setup_env
    start_services
    print_status

    log_info "Setup complete!"
}

main "$@"
