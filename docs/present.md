# SwarmDev — Present Architecture & Workflow

> **Document date:** 2026-06-09  
> **Scope:** Describes the SwarmDev platform as it exists in this repository today — no aspirational features, no planned work. Strictly current state.

---

## 1. What SwarmDev Is

SwarmDev is a multi-agent cloud development platform. A user types a project description in plain English on a landing page, and nine specialized AI agents collaborate — in parallel where possible — to generate a complete full-stack web application: Next.js frontend, Express.js API, Prisma database schema, tests, Docker configs, and documentation.

The agents run in a Python FastAPI orchestrator backed by an Ollama LLM. The generated files are streamed in real time to a Next.js dashboard via Socket.io. Files are stored in PostgreSQL (primary) with optional sync to Cloudflare R2.

**Repository type:** pnpm monorepo managed by Turborepo.

---

## 2. Repository Layout (Current)

```
serious-project/
├── apps/
│   ├── api/              # Express.js 4 backend (port 3001)
│   │   ├── src/
│   │   │   ├── index.ts              # Express server entry + middleware stack
│   │   │   ├── socket/index.ts     # Socket.io + Redis pub/sub bridge
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts         # Clerk JWT validation (lax mode)
│   │   │   │   ├── attachUser.ts   # Fetch Prisma User from Clerk ID
│   │   │   │   ├── planCheck.ts    # Subscription plan enforcement
│   │   │   │   ├── checkPlan.ts    # Additional plan checks
│   │   │   │   └── rateLimit.ts    # express-rate-limit tiers
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── projects.ts
│   │   │   │   ├── agents.ts
│   │   │   │   ├── files.ts
│   │   │   │   ├── chat.ts
│   │   │   │   ├── models.ts
│   │   │   │   ├── terminal.ts
│   │   │   │   ├── git.ts
│   │   │   │   ├── billing.ts
│   │   │   │   └── preview.ts
│   │   │   ├── services/
│   │   │   │   ├── billingService.ts
│   │   │   │   ├── projectService.ts
│   │   │   │   └── syncService.ts  # Background R2 sync
│   │   │   └── prisma/client.ts    # Prisma client singleton
│   │   ├── Dockerfile              # Multi-stage: deps → builder → runner
│   │   └── package.json
│   ├── orchestrator/     # Python FastAPI + LangGraph (port 8000)
│   │   ├── main.py                 # FastAPI entry: /projects/{id}/agents/start, /chat
│   │   ├── graph/
│   │   │   ├── graph.py            # LangGraph DAG definition (9 agents)
│   │   │   └── state.py            # ProjectState TypedDict
│   │   ├── agents/
│   │   │   ├── base.py             # BaseAgent: call_llm, _parse_files, emit_event
│   │   │   ├── supervisor.py
│   │   │   ├── backend.py
│   │   │   ├── database.py
│   │   │   ├── frontend.py
│   │   │   ├── devops.py
│   │   │   ├── qa.py
│   │   │   ├── reviewer.py
│   │   │   ├── security.py
│   │   │   └── documentation.py
│   │   ├── utils/
│   │   │   └── socket_emitter.py   # Publish to Redis `swarmdev:events`
│   │   ├── tools/
│   │   │   └── search_tools.py
│   │   ├── prompts/                # Agent system prompts
│   │   ├── requirements.txt
│   │   └── Dockerfile              # Multi-stage Python 3.11 slim
│   └── web/              # Next.js 14 (App Router) frontend (port 3000)
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx        # Landing page (hero, features, pricing)
│       │   │   ├── layout.tsx
│       │   │   ├── dashboard/      # Project dashboard
│       │   │   ├── project/[id]/   # Project editor + chat + terminal
│       │   │   └── socket.ts       # Socket.io client singleton
│       │   ├── components/
│       │   │   ├── chat/           # ChatWindow, ChatMessage
│       │   │   ├── editor/         # FileTree, MonacoEditor, Terminal
│       │   │   └── ui/             # shadcn/ui components (badge, button, card)
│       │   ├── hooks/
│       │   │   └── useSocket.ts
│       │   ├── store/
│       │   │   ├── chatStore.ts
│       │   │   └── projectStore.ts
│       │   └── lib/
│       │       └── api.ts          # Axios client with Clerk JWT injection
│       ├── middleware.ts           # Clerk route protection
│       ├── Dockerfile              # Multi-stage with output: 'standalone'
│       └── package.json
├── packages/
│   ├── db/               # Prisma schema + generated client
│   │   ├── prisma/
│   │   │   └── schema.prisma       # Single source of truth
│   │   └── package.json
│   ├── shared-types/     # Shared TypeScript types (compiled to dist/)
│   │   ├── src/
│   │   └── package.json
│   └── ui/               # Shared React UI components
├── infra/
│   ├── docker-compose.yml          # Local dev: postgres, redis, qdrant, web, api, orchestrator
│   ├── docker/
│   │   └── api-migrate.sh          # DB migration entrypoint for Docker
│   ├── k8s/
│   │   ├── base/                   # Namespace, ConfigMap, Deployments, Services, HPA, PDB, Ingress
│   │   └── overlays/
│   │       ├── dev/
│   │       ├── staging/            # Uses RDS (no in-cluster postgres)
│   │       └── production/
│   └── terraform/
│       ├── modules/                # VPC, EKS, RDS, ElastiCache, ECR, S3, Secrets, CloudWatch
│       └── environments/
│           └── staging/            # Terraform workspace for staging
├── scripts/              # All automation scripts
│   ├── setup-aws.sh
│   ├── setup-local.sh
│   ├── build-and-push.sh
│   ├── deploy-k8s.sh
│   ├── create-k8s-secrets.sh
│   ├── db-backup.sh
│   ├── rollback.sh
│   ├── safe-clean.sh
│   ├── health-check.sh
│   └── security_scan.sh
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PROJECT_BLUEPRINT.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── AGENT_PROMPTS.md
│   ├── INVESTIGATION_REPORT.md
│   ├── diagrams/
│   │   └── architecture.mmd
│   ├── plans/              # Implementation plans
│   ├── specs/              # Design specs
│   └── adr/                # Architecture decision records
├── .github/workflows/
│   ├── ci.yml              # Lint, test, Trivy scan, build & push to ECR
│   └── deploy.yml          # Deploy to EKS staging + manual prod approval
├── CLAUDE.md               # AI coding instructions for this repo
├── README.md
├── package.json            # Root Turborepo manifest
├── turbo.json
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

---

## 3. Technology Stack (Current)

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui, Monaco Editor |
| **Backend API** | Express.js 4, TypeScript, Prisma ORM, Socket.io |
| **Orchestrator** | Python 3.11, FastAPI, LangGraph, Uvicorn |
| **LLM** | Ollama (OpenAI-compatible API at `/v1`) — default models: codellama, llama4, mistral-small, gpt-oss |
| **Database** | PostgreSQL 15 (Prisma schema in `packages/db/prisma/schema.prisma`) |
| **Cache / Pub-Sub** | Redis 7 (ioredis in API, redis-py in orchestrator) |
| **Vector DB** | Qdrant (for RAG indexing of generated files) |
| **Auth** | Clerk (`@clerk/nextjs` frontend, `@clerk/express` backend) |
| **Billing** | Stripe (`STRIPE_SECRET_KEY`) |
| **Object Storage** | Cloudflare R2 (background sync via `syncService.ts`) |
| **Monorepo** | pnpm workspaces + Turborepo |
| **Container** | Docker multi-stage builds, Docker Compose for local dev |
| **CI/CD** | GitHub Actions with OIDC to AWS (no long-lived credentials) |
| **Infrastructure** | AWS EKS, RDS PostgreSQL, ElastiCache Redis, ECR, S3, Secrets Manager, CloudWatch |
| **K8s Tooling** | Kustomize (base + overlays for dev/staging/production) |
| **IaC** | Terraform (S3 backend with DynamoDB locking) |

---

## 4. Core Data Flow

### 4.1 Project Creation Flow

```
User (browser)
  │
  ▼
┌─────────────────┐
│  Next.js Web    │  ← Landing page /dashboard/new
│  (port 3000)    │
└────────┬────────┘
         │ POST /api/projects  + Clerk JWT
         ▼
┌─────────────────┐
│  Express API    │  ← Validates plan limits (planCheckMiddleware)
│  (port 3001)    │  ← Creates Project record in PostgreSQL via Prisma
│                 │  ← Calls orchestrator: POST /projects/{id}/agents/start
└────────┬────────┘
         │ X-API-SECRET, X-USER-ID, X-USER-PROMPT, X-TECH-STACK
         ▼
┌─────────────────┐
│  Orchestrator   │  ← FastAPI endpoint queues background task
│  (port 8000)    │  ← LangGraph DAG runs 9 agents
│                 │  ← Emits events to Redis `swarmdev:events`
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Redis Pub/Sub │  ← `swarmdev:events` channel
│                │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Express API    │  ← Subscribes to Redis, forwards to Socket.io rooms
│  Socket.io     │  ← `project:${projectId}` room
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│  Next.js Web    │  ← Real-time file creation, agent logs, terminal output
│  (browser)      │
└─────────────────┘
```

### 4.2 Agent Orchestration DAG

Defined in `apps/orchestrator/graph/graph.py`:

```
START
  │
  ▼
supervisor ──► [backend, database, devops]  (parallel)
                  │        │         │
                  └────────┴─────────┘
                            │
                            ▼
                      pre_frontend  (join node)
                            │
                            ▼
                      frontend
                            │
                            ▼
                      qa ──► reviewer ──► security ──► documentation ──► index ──► END
```

- **Supervisor**: Breaks user prompt into tasks, creates task plan.
- **Backend, Database, DevOps**: Run in parallel after supervisor.
- **Pre-frontend**: Pass-through join node — waits for all three parallel branches.
- **Frontend**: Runs after join, consumes outputs from backend/database/devops.
- **QA → Reviewer → Security → Documentation**: Sequential post-frontend pipeline.
- **Index**: Indexes all generated files into Qdrant vector DB for RAG.

Each agent is a class inheriting from `BaseAgent` (`apps/orchestrator/agents/base.py`). The base class provides:
- `call_llm()` — calls Ollama via OpenAI-compatible client
- `_parse_files()` — extracts file blocks from LLM markdown responses
- `emit_event()` — publishes to Redis `swarmdev:events`
- Inter-agent communication: `get_agent_output()`, `query_agent()`, `send_message_to_agent()`

### 4.3 Real-Time Event System

**Orchestrator → Redis → API → Socket.io → Browser**

1. Orchestrator agents publish JSON events to Redis channel `swarmdev:events` via `utils/socket_emitter.py`.
2. API's Socket.io server (`apps/api/src/socket/index.ts`) subscribes to the same Redis channel.
3. On message, the API forwards the event to the Socket.io room `project:${projectId}`.
4. Browser client (`apps/web/src/app/socket.ts`) receives the event and updates React state.

**Event types emitted:**
- `agent_status` — Agent started/completed/failed
- `agent_log` — Structured log lines from agents
- `file_created` / `file_updated` — Generated file content
- `project_status` — Overall pipeline status (PLANNING → IN_PROGRESS → COMPLETED/FAILED)
- `terminal_output` — Shell command output
- `build_result` — Build success/failure
- `preview_ready` — Live preview URL

---

## 5. Authentication Flow

### 5.1 Frontend (Clerk Next.js)
- Middleware at `apps/web/src/middleware.ts` uses `@clerk/nextjs`.
- **Public routes**: `/`, `/auth/*`, `/api/webhooks/*`
- **Protected routes**: Everything else redirects to `/auth/login` with `redirect_url` param.
- Authenticated users are redirected away from auth pages to `/dashboard`.

### 5.2 Backend (Clerk Express)
- `clerkAuthMiddleware` (`apps/api/src/middleware/auth.ts`) runs in lax mode on all routes.
- Sets `req.auth.userId` from Clerk JWT.
- `attachUser` middleware (`apps/api/src/middleware/attachUser.ts`) fetches/creates the Prisma User record and attaches it to `req.user`.

### 5.3 Orchestrator
- Validates `X-API-SECRET` header against `API_SECRET` env var.
- No Clerk — the API acts as a trusted client.

---

## 6. Middleware Stack (API)

Order matters. Defined in `apps/api/src/index.ts`:

1. `helmet()` — Security headers
2. `cors()` — Cross-origin (origin from `NEXT_PUBLIC_SOCKET_URL`)
3. `express.json()` / `express.urlencoded()` — Body parsing
4. `apiLimiter` — Rate limiting (100 req/15min, skipped for localhost in dev)
5. `clerkAuthMiddleware` — JWT validation (lax, sets `req.auth`)
6. `attachUser` — Prisma User lookup from Clerk ID
7. `planCheckMiddleware` — Subscription tier checks (project count, token usage)
8. `checkPlan` — Additional plan enforcement
9. **Route handlers**

---

## 7. Database Schema (Prisma)

Defined in `packages/db/prisma/schema.prisma`:

| Model | Key Fields |
|-------|-----------|
| **User** | `clerkId` (unique), `plan` (FREE/PRO/TEAM/ENTERPRISE), `credits`, `createdAt` |
| **Project** | `id`, `userId`, `name`, `description`, `status` (PENDING/PLANNING/IN_PROGRESS/REVIEWING/COMPLETED/FAILED/ARCHIVED), `techStack` (JSON), `createdAt` |
| **ProjectFile** | `id`, `projectId`, `path`, `content`, `language`, `version`, `createdBy` (AgentType), `createdAt` |
| **AgentRun** | `id`, `projectId`, `agentType`, `input` (JSON), `output` (JSON), `status`, `duration`, `createdAt` |
| **ChatMessage** | `id`, `projectId`, `role` (USER/AGENT), `content`, `agentType`, `createdAt` |
| **UsageLog** | `id`, `userId`, `projectId`, `tokensUsed`, `cost`, `createdAt` |

---

## 8. Local Development Flow

### 8.1 Prerequisites
- Node.js ≥ 20, pnpm ≥ 8, Python 3.11, Docker & Docker Compose
- Ollama running locally (or via `OLLAMA_BASE_URL` pointing to a remote instance)
- Clerk account (publishable key + secret key)

### 8.2 Start Everything
```bash
# Install monorepo dependencies
pnpm install

# Start infrastructure services (Postgres 15, Redis 7, Qdrant)
cd infra && docker-compose up -d

# Generate Prisma client
cd packages/db && pnpm prisma generate

# Run migrations
cd packages/db && pnpm prisma migrate dev

# Start all 3 apps in parallel (Turborepo)
pnpm dev
```

This starts:
- **Web**: http://localhost:3000
- **API**: http://localhost:3001
- **Orchestrator**: http://localhost:8000

### 8.3 Environment Files Required
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/orchestrator/.env.example apps/orchestrator/.env
```

Key variables:
- `DATABASE_URL` — PostgreSQL connection (local Docker or Supabase pooler)
- `REDIS_URL` — Redis connection
- `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Auth
- `ORCHESTRATOR_URL` / `ORCHESTRATOR_SECRET` — API ↔ orchestrator trust
- `OLLAMA_BASE_URL` / `OLLAMA_MODEL` — LLM endpoint
- `STRIPE_SECRET_KEY` — Billing
- `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` — Object storage sync

### 8.4 Docker Compose Override (Hot Reload)
`infra/docker-compose.override.yml` exists for mounting local source code into containers for hot-reload development.

---

## 9. Staging / Production Deployment Flow

### 9.1 Architecture: Option B (Hybrid)

| Environment | PostgreSQL | Redis | Notes |
|-------------|------------|-------|-------|
| **Local dev** | Supabase (pooler) or Docker | Docker container | `.env` files |
| **Dev K8s** | In-cluster postgres | In-cluster | ConfigMap + manual secrets |
| **Staging** | **AWS RDS** (`db.t3.micro`) | In-cluster redis | Secrets auto-synced from Terraform |
| **Production** | **AWS RDS Multi-AZ** | **ElastiCache** | Manual approval gate in GitHub Actions |

### 9.2 AWS Infrastructure (Terraform)

Created by `infra/terraform/environments/staging/main.tf`:

| Resource | Details |
|----------|---------|
| **VPC** | `10.1.0.0/16`, 2 AZs, public + private subnets, NAT Gateways, IGW |
| **EKS** | `swarmdev-staging`, Kubernetes 1.30, 2× `t3.large` nodes (auto-scaling 1–4), KMS-encrypted secrets |
| **RDS** | PostgreSQL 15, `db.t3.micro`, 20GB gp3, encrypted, 3-day backups |
| **ElastiCache** | Redis 7, `cache.t3.micro`, 1 node (staging only) |
| **ECR** | 3 repos: `swarmdev/web`, `swarmdev/api`, `swarmdev/orchestrator`, lifecycle policy (max 20 images) |
| **S3** | `swarmdev-staging-files`, AES256 encryption, versioning, lifecycle to Standard-IA after 30 days |
| **Secrets Manager** | `swarmdev/staging/app` — contains all app secrets including `database_url` |
| **CloudWatch** | Log groups for web/api/orchestrator, CPU alarm, RDS free-storage alarm |

**Terraform backend:** S3 bucket `swarmdev-terraform-state` with DynamoDB locking.

### 9.3 Deployment Steps

```bash
# 1. Apply infrastructure (one-time or on change)
./scripts/setup-aws.sh staging

# 2. Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name swarmdev-staging

# 3. Create K8s secrets from Terraform outputs
./scripts/create-k8s-secrets.sh staging

# 4. Build and push Docker images to ECR
./scripts/build-and-push.sh staging

# 5. Deploy to EKS
./scripts/deploy-k8s.sh staging
```

### 9.4 CI/CD (GitHub Actions)

**`.github/workflows/ci.yml`** — runs on every push/PR to `main`:
1. Lint & test web (Next.js)
2. Lint & test api (Express + Jest)
3. Test orchestrator (pytest)
4. Security scans (pnpm audit, bandit, semgrep)
5. Build Docker images (no push on PR, push to ECR on `main` merge)
6. Trivy container vulnerability scan

**`.github/workflows/deploy.yml`** — runs on `main` push or manual dispatch:
1. Configure AWS credentials via OIDC (`swarmdev-github-actions-role`)
2. Login to ECR, build & push images tagged with commit SHA
3. Update kubeconfig for EKS
4. `kustomize edit set image` for all 3 services
5. `kubectl apply -k .` to staging namespace
6. Wait for rollouts, run DB migrations as K8s Job
7. **Production deploy** requires manual approval (GitHub Environment protection)

**OIDC setup:** AWS IAM OIDC provider for `token.actions.githubusercontent.com` + IAM role `swarmdev-github-actions-role` with trust policy limiting access to `repo:abiramreddymartala/serious-project:*`.

---

## 10. Plan & Billing System

Subscription tiers enforced by middleware:

| Tier | Projects | Tokens/Month | Agents | Price |
|------|----------|--------------|--------|-------|
| **FREE** | 3 | 100K | Supervisor + 2 | $0 |
| **PRO** | Unlimited | 2M | All 9 | $29/mo |
| **TEAM** | Unlimited | 10M | All 9 + custom roles | $99/mo |
| **ENTERPRISE** | Unlimited | Custom | All 9 + BYOK | Custom |

**Enforcement points:**
- `planCheckMiddleware` (`apps/api/src/middleware/planCheck.ts`) — checks project count and token usage on every request
- `checkPlan` (`apps/api/src/middleware/checkPlan.ts`) — additional limit checks
- `billingService.ts` — Stripe integration for subscriptions and usage tracking

---

## 11. File Storage

1. **Primary**: PostgreSQL via `ProjectFile` model (path, content, language, version, createdBy agent)
2. **Secondary**: Cloudflare R2 background sync (`apps/api/src/services/syncService.ts`)
   - Runs periodically in the background
   - Syncs files from PostgreSQL to R2 bucket
   - Skipped in `test` environment

---

## 12. Rate Limiting

Three tiers in `apps/api/src/middleware/rateLimit.ts`:

| Limiter | Limit | Scope |
|---------|-------|-------|
| `apiLimiter` | 100 requests / 15 min | All API routes |
| `authLimiter` | 20 requests / 15 min | Auth endpoints |
| `projectLimiter` | 30 requests / 1 min | Project operations |

**Development bypass:** Rate limiting is skipped for localhost IPs (`127.0.0.1`, `::1`).

---

## 13. Chat System

Users can chat with individual agents via `@mention` syntax:

1. User types `@frontend Make the button blue` in the project chat panel.
2. Frontend sends to API Socket.io `send_message` event.
3. API saves to `ChatMessage` table and forwards to orchestrator `/chat` endpoint.
4. Orchestrator's `ChatRouter` (`agents/chat_router.py`):
   - Parses `@mention` to determine target agent
   - Loads agent's model preference from chat history
   - Loads last 10 messages for context
   - Builds system prompt for the target agent
   - Calls Ollama with the resolved model
   - Returns response to API, which broadcasts back to room

**Model resolution:** Friendly aliases (`llama4`, `codellama`, `kimi`, `mistral-small`, `gpt-oss`) are mapped to actual Ollama model names via `MODEL_ALIASES` in `main.py`.

---

## 14. Known Limitations (Current State)

1. **E2B sandbox integration** — Terminal commands in Socket.io show a warning: "requires E2B sandbox integration" (not yet connected).
2. **Ollama dependency** — Requires an accessible Ollama instance. No fallback to OpenAI/Anthropic API in current code.
3. **Qdrant** — Used for file indexing but RAG retrieval in chat is basic (loads last 10 messages only).
4. **Single-region AWS** — All staging infrastructure is in `us-east-1`.
5. **No production overlay yet** — Production K8s overlay exists in structure but not fully configured.
6. **Health checks** — K8s liveness/readiness probes reference `/health` but may need tuning for cold-start Prisma connections.

---

## 15. External Service Dependencies

| Service | Used For | Configuration |
|---------|----------|---------------|
| **Clerk** | Auth (frontend + backend) | `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| **Stripe** | Billing, subscriptions | `STRIPE_SECRET_KEY` |
| **Ollama** | LLM inference | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |
| **Cloudflare R2** | Object storage sync | `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` |
| **E2B** | Cloud sandbox execution | `E2B_API_KEY` (planned integration) |
| **AWS (EKS/RDS/ElastiCache/ECR/S3)** | Production infrastructure | Terraform-managed |
| **Supabase** | Local dev PostgreSQL (Option B) | `DATABASE_URL` via pooler |

---

## 16. How to Verify This Document

Every claim in this document can be traced to a specific file in the repository:

- **Agent DAG**: `apps/orchestrator/graph/graph.py` (lines 102–138)
- **Middleware stack**: `apps/api/src/index.ts` (lines 35–93)
- **Socket.io bridge**: `apps/api/src/socket/index.ts` (lines 123–155)
- **BaseAgent**: `apps/orchestrator/agents/base.py` (lines 24–60)
- **Auth flow**: `apps/web/src/middleware.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/middleware/attachUser.ts`
- **Plan limits**: `apps/api/src/middleware/planCheck.ts`
- **Terraform**: `infra/terraform/environments/staging/main.tf`
- **CI/CD**: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- **Docker Compose**: `infra/docker-compose.yml`

---

*End of present.md — reflects repository state as of 2026-06-09.*
