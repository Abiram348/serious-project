# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SwarmDev is a multi-agent cloud development platform. It uses 9 specialized AI agents (Supervisor, Backend, Database, Frontend, DevOps, QA, Reviewer, Security, Documentation) orchestrated by a LangGraph DAG to build complete web applications from user prompts.

The repository is a pnpm monorepo managed by Turborepo with three main applications:
- **apps/web**: Next.js 14 frontend (port 3000)
- **apps/api**: Express.js backend API (port 3001)
- **apps/orchestrator**: Python + LangGraph agent orchestration (port 8000)

## Common Commands

All commands run from the repository root unless specified otherwise.

### Development

```bash
# Install all dependencies
pnpm install

# Start all applications in development mode (parallel)
pnpm dev

# Start individual applications
cd apps/web && pnpm dev          # Next.js dev server
cd apps/api && pnpm dev          # ts-node-dev with --respawn
cd apps/orchestrator && python main.py   # FastAPI via uvicorn
```

### Build

```bash
# Build all applications
pnpm build

# Build individual applications
cd apps/web && pnpm build
cd apps/api && pnpm build        # tsc compiles to dist/
cd packages/shared-types && pnpm build
```

### Testing

```bash
# Run all tests across the monorepo
pnpm test

# Run API tests (Jest)
cd apps/api && pnpm test

# Run orchestrator tests (pytest)
cd apps/orchestrator && pytest -q
```

### Linting and Formatting

```bash
# Lint all applications
pnpm lint

# Format all files
pnpm format                        # prettier --write "**/*.{js,ts,tsx,json,md}"

# Lint individual applications
cd apps/web && pnpm lint           # next lint
cd apps/api && pnpm lint           # eslint src --ext .ts
```

### Database

```bash
# Generate Prisma client
cd packages/db && pnpm prisma generate

# Run migrations
cd packages/db && pnpm prisma migrate dev

# Open Prisma Studio
cd packages/db && pnpm prisma studio
```

### Security Scans

```bash
# Run all security scans (npm audit, bandit, semgrep)
./scripts/security_scan.sh
```

### Dev Server Health & Safe Cleaning

**If the UI appears blank / unstyled (invisible text, no colors, no layout), the Next.js dev server's build manifest is probably broken.** Symptoms: HTML loads fine, classes like `bg-background` are in the DOM, but `curl -I http://localhost:3000/_next/static/css/app/layout.css` returns `200 OK` with `text/html` (a 404 page) instead of `text/css`.

**Cause:** running `rm -rf apps/web/.next` while the dev server is still up. The server's in-memory manifest then points to files that no longer exist, so every static asset silently 404s.

**Fix — never `rm -rf .next` while a dev server is running.** Use:

```bash
# Safely clean build caches (kills dev servers first, then clears .next/dist/etc.)
pnpm clean:safe               # or: pnpm clean:safe:deep for a deeper wipe
pnpm dev                       # then restart fresh

# Verify dev servers are serving real assets (catches the "200 OK but text/html" bug)
pnpm dev:check                 # warnings allowed
pnpm dev:check:strict          # any warning fails the check
```

Underlying scripts: `scripts/safe-clean.sh` and `scripts/health-check.sh`. The health check extracts the CSS path from the rendered HTML, fetches it, and verifies `Content-Type: text/css` and a real CSS body — not the 404 HTML page that the broken dev server returns with a 200 status.

### Docker

```bash
# Start all infrastructure services (Postgres, Redis, Qdrant)
docker-compose up -d

# Start the full stack including all applications
docker-compose -f docker-compose.yml up -d
```

## Architecture

### Monorepo Structure

The project uses pnpm workspaces (`pnpm-workspace.yaml`) with Turborepo (`turbo.json`) for task orchestration. The workspace includes `apps/*` and `packages/*`.

Key packages:
- **packages/db**: Prisma schema and generated client. The schema is the single source of truth for the PostgreSQL database.
- **packages/shared-types**: Shared TypeScript types compiled to `dist/` and consumed by both web and api.

### Data Flow

1. User creates a project via the Next.js frontend
2. Frontend calls the Express API (`/api/projects`)
3. API validates plan limits, creates a database record via Prisma, and calls the orchestrator
4. Orchestrator runs the LangGraph DAG with the project context
5. Agents generate files and emit events via Socket.io
6. API persists files to PostgreSQL and optionally syncs to Cloudflare R2
7. Frontend receives real-time updates via Socket.io

### Authentication Flow

The application uses Clerk for authentication:
- **Frontend**: `@clerk/nextjs` middleware (`apps/web/src/middleware.ts`) protects routes. Public routes include `/`, `/auth/*`, and `/api/webhooks/*`.
- **API**: `@clerk/express` middleware validates JWTs. The `attachUser` middleware (`apps/api/src/middleware/attachUser.ts`) then fetches the full Prisma User object and attaches it to `req.user`.
- **Orchestrator**: Validates `X-API-SECRET` header against `API_SECRET` env var.

### Real-Time Communication

Socket.io is used for real-time updates:
- The API initializes a Socket.io server on the same HTTP server as Express (`apps/api/src/socket/index.ts`)
- The orchestrator emits events via a utility (`apps/orchestrator/utils/socket_emitter.py`) that publishes to a Redis channel (`swarmdev:events`)
- The API subscribes to the Redis channel and forwards events to Socket.io rooms (`project:${projectId}`)
- The frontend connects via `apps/web/src/app/socket.ts` and hooks like `useSocket.ts`

### Agent Orchestration

The orchestrator uses LangGraph (`apps/orchestrator/graph/graph.py`) to define a DAG:

```
START -> supervisor -> [backend, database, devops] (parallel)
                      -> pre_frontend (join) -> frontend -> qa -> reviewer -> security -> documentation -> END
```

Each agent is a class inheriting from `BaseAgent` (`apps/orchestrator/agents/base.py`). Agents communicate via the shared `ProjectState` TypedDict (`apps/orchestrator/graph/state.py`). The base class provides utilities for:
- Calling the Ollama LLM (`call_llm`)
- Parsing generated files from LLM responses (`_parse_files`)
- Inter-agent communication (`get_agent_output`, `query_agent`, `send_message_to_agent`)
- Emitting socket events (`emit_event`)

### Plan Enforcement

The API enforces usage limits based on subscription tier (FREE, PRO, TEAM, ENTERPRISE):
- **planCheckMiddleware** (`apps/api/src/middleware/planCheck.ts`): Checks project count and token usage limits per request
- **checkPlan** middleware (`apps/api/src/middleware/checkPlan.ts`): Additional plan checks
- Limits are defined in the middleware and checked against the User's plan field in the database

### Rate Limiting

The API uses `express-rate-limit` with three tiers:
- **apiLimiter**: 100 requests per 15 minutes (general API)
- **authLimiter**: 20 requests per 15 minutes (auth endpoints)
- **projectLimiter**: 30 requests per 1 minute (project operations)
- Rate limiting is skipped for localhost IPs in development

### File Storage

Files are stored in two places:
1. **PostgreSQL**: Primary storage via the `ProjectFile` model in Prisma
2. **Cloudflare R2**: Background sync for object storage (`apps/api/src/services/syncService.ts`)

### API Client Pattern

The frontend uses a centralized API client (`apps/web/src/lib/api.ts`) that:
- Automatically injects Clerk JWT tokens via `Authorization: Bearer` headers
- Has both a singleton instance (`apiClient`) and a hook version (`useApiClient`) for React components
- Handles 401/403 errors by throwing descriptive errors

## Important Conventions

### Environment Variables

Copy example files to set up local development:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/orchestrator/.env.example apps/orchestrator/.env
```

Key env vars:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk auth
- `ORCHESTRATOR_URL` / `ORCHESTRATOR_SECRET`: API-to-orchestrator communication
- `OLLAMA_BASE_URL` / `OLLAMA_MODEL`: LLM configuration (default: codellama)
- `STRIPE_SECRET_KEY`: Billing

### Database Schema

The Prisma schema (`packages/db/prisma/schema.prisma`) defines:
- **User**: Clerk ID, plan, credits
- **Project**: Status (PENDING, PLANNING, IN_PROGRESS, REVIEWING, COMPLETED, FAILED, ARCHIVED), tech stack JSON
- **ProjectFile**: Path, content, language, version, createdBy (AgentType)
- **AgentRun**: Execution history with input/output JSON
- **ChatMessage**: Project chat history
- **UsageLog**: Token consumption tracking

### TypeScript Path Mapping

- **API**: `@shared-types` maps to `../packages/shared-types/src`
- **Web**: `@/*` maps to `./src/*`

### Middleware Order in API

The Express middleware stack is initialized in this order (`apps/api/src/index.ts`):
1. `helmet()`
2. `cors()`
3. `express.json()` / `express.urlencoded()`
4. `apiLimiter` (rate limiting)
5. `attachUser` (Clerk auth + Prisma user lookup)
6. `planCheckMiddleware` (plan limits)
7. `checkPlan` (additional plan checks)
8. Route handlers

### CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `main`:
1. Sets up Node.js 20 + pnpm, Python 3.11
2. Installs dependencies for web, api, and orchestrator
3. Runs lint and test for each application
4. Runs security scans (pnpm audit, bandit, semgrep)
5. Builds Docker images for all three services

## External Services

- **Clerk**: Authentication and user management
- **Stripe**: Billing and subscriptions
- **Cloudflare R2**: Object storage for file sync
- **Ollama**: LLM inference (default model: codellama)
- **E2B**: Cloud sandbox execution (planned)
- **Qdrant**: Vector database for RAG (planned)

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).
