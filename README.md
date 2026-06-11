# SwarmDev

Multi-Agent Cloud Development Platform powered by LangGraph orchestration.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-beta-yellow.svg)]()

## Overview

SwarmDev is an AI-powered development platform that uses 9 specialized agents to build complete web applications:

- **Supervisor** - Analyzes requirements and creates task plans
- **Backend** - Builds APIs and server-side logic
- **Database** - Designs schemas and migrations
- **Frontend** - Creates React/Next.js UI components
- **DevOps** - Generates Docker and deployment configs
- **QA** - Writes comprehensive tests
- **Reviewer** - Reviews code for quality and bugs
- **Security** - Scans for vulnerabilities
- **Documentation** - Writes docs and API specs

## Project Structure

```
serious-project/
├── apps/
│   ├── web/           # Next.js 14 frontend
│   ├── api/           # Express.js backend API
│   └── orchestrator/  # Python + LangGraph agent orchestration
├── docs/
│   ├── API.md              # API documentation
│   ├── DEPLOYMENT.md       # Deployment guide
│   ├── AGENT_PROMPTS.md    # Agent prompt reference
│   ├── ARCHITECTURE.md     # System architecture
│   ├── PROJECT_BLUEPRINT.md # Complete feature specification
│   └── diagrams/           # Architecture diagrams
├── packages/
│   ├── shared-types/  # Shared TypeScript types
│   └── db/            # Prisma database schema
└── infra/             # Docker, Kubernetes, Terraform configs
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- Python >= 3.11
- pnpm >= 8.0.0
- Docker and Docker Compose
- PostgreSQL, Redis, Qdrant (can be started with Docker Compose)

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   cp apps/orchestrator/.env.example apps/orchestrator/.env
   ```

3. Start infrastructure services:
   ```bash
   cd infra
   docker-compose up -d
   ```

4. Set up the database:
   ```bash
   cd packages/db
   pnpm prisma generate
   pnpm prisma migrate dev
   ```

5. Start all applications:
   ```bash
   pnpm dev
   ```

   This will start:
   - Frontend: http://localhost:3000
   - API: http://localhost:3001
   - Orchestrator: http://localhost:8000

## Available Scripts

In the root directory:
- `pnpm dev` - Start all applications in development mode
- `pnpm build` - Build all applications
- `pnpm test` - Run all tests
- `pnpm lint` - Run ESLint on all applications

In individual packages:
- In `packages/db`: `pnpm prisma generate`, `pnpm prisma migrate dev`

## Documentation

- [Present State](docs/present.md) — **Current workflow, architecture, and data flow (strictly factual)**
- [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- [API Reference](docs/API.md) - REST API documentation
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [Agent Prompts](docs/AGENT_PROMPTS.md) - All agent prompts and responsibilities
- [Project Blueprint](docs/PROJECT_BLUEPRINT.md) - Complete feature specification

## Orchestrator Details

The Orchestrator (FastAPI) runs the LangGraph DAG that coordinates multiple agents. Each agent emits a `agent_done` socket.io event to the API's Socket.io server (listening at the URL defined by `SOCKET_URL`, default `http://localhost:3001`).

The web client (`apps/web`) connects to this socket endpoint and logs events, allowing real‑time visibility of agent progress.

OpenAPI specification is available at `http://localhost:8000/openapi.json` when the service runs.

## Security Scans

Run the provided security scan script locally:
```bash
./scripts/security_scan.sh
```
The CI pipeline also executes the same scans.

## License

MIT License - see [LICENSE](LICENSE) for details.
