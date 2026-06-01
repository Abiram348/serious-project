# SwarmDev Deployment Guide

## Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- pnpm 9+
- Docker (optional)

## Environment Variables

### API (`.env` in `apps/api/`)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/swarmdev"

# Redis
REDIS_URL="redis://localhost:6379"

# Authentication
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Billing
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Storage
CLOUDFLARE_R2_ENDPOINT="https://<account>.r2.cloudflarestorage.com"
CLOUDFLARE_R2_ACCESS_KEY="..."
CLOUDFLARE_R2_SECRET_KEY="..."
CLOUDFLARE_R2_BUCKET="swarmdev"

# Orchestrator
ORCHESTRATOR_URL="http://localhost:8000"
ORCHESTRATOR_SECRET="your-secret-key"

# API
API_SECRET="your-api-secret"
API_URL="http://localhost:3001"
```

### Orchestrator (`.env` in `apps/orchestrator/`)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/swarmdev"

# Redis
REDIS_URL="redis://localhost:6379"

# OLLAMA
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_API_KEY="your-ollama-api-key"
OLLAMA_MODEL="codellama"

# API
API_URL="http://localhost:3001"
ORCHESTRATOR_SECRET="your-secret-key"

# Optional: RAG
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY="..."

# Optional: Sandbox
E2B_API_KEY="..."
```

### Frontend (`.env.local` in `apps/web/`)

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

## Local Development

### 1. Install Dependencies

```bash
# Root
pnpm install

# API
cd apps/api && pnpm install

# Orchestrator
cd apps/orchestrator && pip install -r requirements.txt

# Frontend
cd apps/web && pnpm install
```

### 2. Start Services

```bash
# PostgreSQL
docker run -d \
  -e POSTGRES_USER=swarmdev \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=swarmdev \
  -p 5432:5432 \
  postgres:15

# Redis
docker run -d -p 6379:6379 redis:7

# Qdrant (optional)
docker run -d -p 6333:6333 qdrant/qdrant
```

### 3. Run Migrations

```bash
cd apps/api
pnpm prisma migrate dev
```

### 4. Start Development Servers

```bash
# From root - starts all services
pnpm dev

# Or individually:
# API
cd apps/api && pnpm dev

# Orchestrator
cd apps/orchestrator && python main.py

# Frontend
cd apps/web && pnpm dev
```

## Production Deployment

### Docker Deployment

#### Build Images

```bash
# API
docker build -t swarmdev-api ./apps/api

# Frontend
docker build -t swarmdev-web ./apps/web
```

#### Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    image: swarmdev-api
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    ports:
      - "3001:3001"

  web:
    image: swarmdev-web
    environment:
      - NEXT_PUBLIC_API_URL=https://api.swarmdev.io
    ports:
      - "3000:3000"

  orchestrator:
    build: ./apps/orchestrator
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - OLLAMA_BASE_URL=${OLLAMA_BASE_URL}
      - OLLAMA_API_KEY=${OLLAMA_API_KEY}
      - OLLAMA_MODEL=${OLLAMA_MODEL:-codellama}
```

### Kubernetes Deployment

See `kubernetes/` directory for manifests:

- `namespace.yaml` - SwarmDev namespace
- `configmap.yaml` - Environment configuration
- `secret.yaml` - Sensitive credentials
- `api-deployment.yaml` - API service
- `web-deployment.yaml` - Frontend service
- `orchestrator-deployment.yaml` - Agent orchestrator
- `ingress.yaml` - Traffic routing

### Environment-Specific Configs

#### Staging

```bash
# .env.staging
DATABASE_URL="postgresql://.../swarmdev-staging"
OLLAMA_BASE_URL="http://ollama-staging:11434"
OLLAMA_API_KEY="your-ollama-staging-api-key"
OLLAMA_MODEL="codellama"
```

#### Production

```bash
# .env.production
DATABASE_URL="postgresql://.../swarmdev-prod"
OLLAMA_BASE_URL="http://ollama-prod:11434"
OLLAMA_API_KEY="your-ollama-prod-api-key"
OLLAMA_MODEL="codellama"
```

## Monitoring

### Health Checks

```bash
# API health
curl http://localhost:3001/health

# Expected: {"status": "ok", "timestamp": "..."}
```

### Logging

Logs are output to stdout in JSON format:

```json
{"level": "info", "message": "Project created", "projectId": "proj_123"}
```

### Metrics

Key metrics to monitor:

- API response times (p50, p95, p99)
- Agent execution times
- Token usage per project
- WebSocket connections
- Redis queue depth

## Troubleshooting

### Common Issues

**Orchestrator won't connect:**
- Check `ORCHESTRATOR_URL` points to correct port
- Verify `ORCHESTRATOR_SECRET` matches in both API and orchestrator

**Redis connection errors:**
- Ensure Redis is running: `docker ps | grep redis`
- Check `REDIS_URL` format: `redis://host:port`

**Database migration fails:**
- Drop and recreate: `pnpm prisma migrate reset`
- Check PostgreSQL version: `SELECT version();`

**Agent events not reaching frontend:**
- Verify Redis pub/sub: `redis-cli SUBSCRIBE swarmdev:events`
- Check Socket.io connection in browser console
