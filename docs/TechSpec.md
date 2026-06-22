# SwarmDev — Technical Specification

> **Version:** 1.0  
> **Last updated:** 2026-06-13  
> **Owner:** SwarmDev Core Team  
> **Status:** Active

---

## 1. Purpose

This document specifies the technical architecture, stack decisions, API contracts, and integration patterns for SwarmDev. It is the single source of truth for implementation details that cut across the monorepo.

---

## 2. Technology Stack

### 2.1 Rationale

| Layer | Choice | Alternatives Considered | Why Chosen |
|-------|--------|------------------------|------------|
| **Frontend framework** | Next.js 14 (App Router) | Remix, Nuxt, plain Vite | SSR + SSG for landing; API routes for webhooks; mature ecosystem |
| **Frontend language** | TypeScript 5.4 | JavaScript, Dart | Type safety across monorepo; shared-types package |
| **Styling** | Tailwind CSS 3.4 | CSS Modules, Styled Components | Rapid UI iteration; shadcn/ui compatibility |
| **UI components** | shadcn/ui + Radix | Material UI, Chakra | Unstyled primitives; full source ownership; no vendor lock-in |
| **State management** | Zustand | Redux, Jotai | Minimal boilerplate; excellent TypeScript inference |
| **Backend API** | Express.js 4 | Fastify, NestJS | Team familiarity; vast middleware ecosystem |
| **Backend language** | TypeScript 5.4 | Python, Go | Shared types with frontend; Prisma client |
| **ORM** | Prisma 5 | Drizzle, TypeORM | Migration engine; excellent DX; schema-as-source-of-truth |
| **Database** | PostgreSQL 15 | MySQL 8, PlanetScale | JSONB for tech stack; full text search for files; mature hosting |
| **Orchestrator** | Python 3.11 + FastAPI | Node.js, Go | LangGraph is Python-native; FastAPI auto-docs |
| **Agent framework** | LangGraph | CrewAI, AutoGen | Explicit DAG control; shared state typing; observability hooks |
| **LLM inference** | Ollama (OpenAI-compatible) | OpenAI API, Anthropic | Cost control (self-hosted); no vendor lock-in; multi-model support |
| **Auth** | Clerk | Auth0, Supabase Auth | Pre-built Next.js components; JWT middleware for Express; webhooks |
| **Billing** | Stripe | LemonSqueezy, Paddle | Market standard; robust subscription primitives |
| **Real-time** | Socket.io | SSE, WebSockets raw | Room-based routing; fallback transports; Redis adapter |
| **Pub/Sub** | Redis 7 | RabbitMQ, NATS | Already used for sessions; lightweight; Socket.io adapter |
| **Object storage** | Cloudflare R2 | AWS S3, MinIO | S3-compatible API; zero egress fees; great for file sync |
| **Containers** | Docker + Compose | Podman, Nix | Ubiquitous; local dev parity with production |
| **Orchestration** | Kubernetes (EKS) | ECS, Nomad | Multi-service complexity; Kustomize overlays; industry standard |
| **IaC** | Terraform | Pulumi, CDK | State locking with DynamoDB; module reusability |
| **CI/CD** | GitHub Actions | GitLab CI, CircleCI | Native GitHub integration; OIDC to AWS |
| **Monorepo** | pnpm + Turborepo | npm workspaces, Nx | Fast installs; task pipeline caching; proven at scale |

---

## 3. Monorepo Structure

```
serious-project/
├── apps/
│   ├── web/            # Next.js 14 (port 3000)
│   ├── api/            # Express.js 4 (port 3001)
│   └── orchestrator/   # Python FastAPI + LangGraph (port 8000)
├── packages/
│   ├── db/             # Prisma schema + generated client
│   ├── shared-types/   # TypeScript types compiled to dist/
│   └── ui/             # Shared React components
├── infra/
│   ├── docker-compose.yml
│   ├── k8s/            # Kustomize overlays
│   └── terraform/      # AWS modules + environments
├── scripts/            # Automation scripts
└── docs/               # Project documentation
```

### 3.1 Dependency Graph (Turborepo)

```
shared-types ──► web
    │
    ▼
    db ─────────► api
    │
    ▼
 orchestrator   (no deps — standalone Python)
```

- `shared-types` builds first; `web` and `api` depend on it.
- `db` builds second; `api` depends on it.
- `orchestrator` is Python; no Turborepo dependency link.

---

## 4. API Contracts

### 4.1 REST API (Express)

Base URL: `https://api.swarmdev.io/v1` (staging: `https://api.staging.swarmdev.io/v1`)

#### Projects

| Method | Route | Auth | Middleware | Description |
|--------|-------|------|------------|-------------|
| POST | `/projects` | Clerk JWT | `planCheckMiddleware` | Create project; triggers orchestrator |
| GET | `/projects` | Clerk JWT | — | List user's projects |
| GET | `/projects/:id` | Clerk JWT | — | Get project details |
| PATCH | `/projects/:id` | Clerk JWT | — | Update name, description, status |
| DELETE | `/projects/:id` | Clerk JWT | — | Soft delete (cascade files) |

**Request body (POST /projects):**
```json
{
  "name": "E-commerce Dashboard",
  "description": "A Next.js admin panel with product CRUD and analytics charts",
  "techStack": {
    "frontend": "nextjs",
    "backend": "express",
    "database": "postgresql",
    "styling": "tailwind"
  }
}
```

#### Files

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/projects/:id/files` | Clerk JWT | List all files for project |
| GET | `/projects/:id/files/:path` | Clerk JWT | Get single file content |
| PATCH | `/projects/:id/files/:path` | Clerk JWT | Update file content (user edit) |

#### Chat

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/projects/:id/chat` | Clerk JWT | Send message; may include `@mention` |
| GET | `/projects/:id/chat` | Clerk JWT | Paginated chat history |

#### Billing

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/billing/checkout` | Clerk JWT | Create Stripe Checkout session |
| POST | `/billing/portal` | Clerk JWT | Create Stripe Customer Portal session |
| POST | `/billing/webhook` | Stripe sig | Handle Stripe webhooks (no Clerk) |

### 4.2 Orchestrator API (FastAPI)

Base URL: `http://orchestrator:8000` (internal only)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/projects/{id}/agents/start` | `X-API-SECRET` | Start agent DAG for project |
| POST | `/chat` | `X-API-SECRET` | Route chat message to target agent |
| GET | `/health` | None | Health check |

**Headers for orchestrator:**
- `X-API-SECRET` — shared secret (env `API_SECRET`)
- `X-USER-ID` — Prisma User.id
- `X-USER-PROMPT` — original project description
- `X-TECH-STACK` — JSON string of tech stack

### 4.3 Socket.io Events

**Namespace:** `/`

**Client → Server:**

| Event | Payload | Description |
|-------|---------|-------------|
| `join_project` | `{ projectId: string }` | Subscribe to project room |
| `send_message` | `{ projectId, content, targetAgent? }` | Send chat message |
| `request_file` | `{ projectId, path }` | Request file content (replay) |

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `agent_status` | `{ projectId, agentType, status, timestamp }` | Agent state change |
| `agent_log` | `{ projectId, agentType, level, message, timestamp }` | Structured log |
| `file_created` | `{ projectId, path, content, language, createdBy }` | New file generated |
| `file_updated` | `{ projectId, path, content, version }` | File updated |
| `project_status` | `{ projectId, status, progress? }` | Pipeline status |
| `terminal_output` | `{ projectId, stream, data }` | stdout / stderr |
| `build_result` | `{ projectId, success, exitCode, logs }` | Build complete |
| `preview_ready` | `{ projectId, url }` | Preview URL available |
| `chat_message` | `{ projectId, role, content, agentType?, model? }` | Chat response |

---

## 5. Authentication & Authorization

### 5.1 Clerk Flow

```
Browser ──► Clerk (OAuth / passwordless / SAML)
              │
              ▼
         JWT issued
              │
    ┌─────────┴─────────┐
    ▼                   ▼
Next.js           Express API
(middleware.ts)   (auth.ts + attachUser.ts)
```

- Frontend: `@clerk/nextjs` middleware protects routes.
- Backend: `@clerk/express` validates JWT; `attachUser` fetches/creates Prisma User.
- Webhooks: `/api/webhooks/clerk` handles `user.created`, `user.updated`.

### 5.2 Orchestrator Trust

- Orchestrator is **not** exposed publicly.
- API → Orchestrator uses `X-API-SECRET` header.
- No Clerk JWT in orchestrator; API acts as trusted proxy.

---

## 6. Data Flow Architecture

### 6.1 Project Creation (Detailed)

```
User
  │ POST /projects (Clerk JWT)
  ▼
┌─────────────┐    planCheckMiddleware ──► check project count + token usage
│  Express    │    Prisma ──► INSERT Project (status=PENDING)
│  API        │    HTTP POST ──► Orchestrator /projects/{id}/agents/start
└──────┬──────┘
       │ X-API-SECRET + context
       ▼
┌─────────────┐    LangGraph.compile() ──► START
│  FastAPI    │
│ Orchestrator│    supervisor ──► [backend, database, devops] (parallel)
└──────┬──────┘         │
       │               ▼
       │         pre_frontend (join)
       │               │
       │               ▼
       │         frontend ──► qa ──► reviewer ──► security ──► documentation
       │               │
       │               ▼
       │            index ──► END
       │
       │ Redis PUBLISH swarmdev:events
       ▼
┌─────────────┐
│   Redis     │
└──────┬──────┘
       │ SUBSCRIBE swarmdev:events
       ▼
┌─────────────┐    Socket.io emit ──► room: project:${projectId}
│  Express    │
│  Socket.io  │
└──────┬──────┘
       │ WebSocket
       ▼
┌─────────────┐
│   Browser   │    React state update ──► FileTree, Editor, Terminal, Chat
└─────────────┘
```

### 6.2 File Persistence Dual-Write

1. **Primary:** PostgreSQL `ProjectFile` table — immediate write on every `file_created` / `file_updated` event.
2. **Secondary:** Cloudflare R2 — background sync via `syncService.ts` (non-blocking, batched, skipped in test env).

---

## 7. Agent Orchestration Details

### 7.1 LangGraph State (`ProjectState`)

```python
class ProjectState(TypedDict):
    project_id: str
    user_prompt: str
    tech_stack: dict
    task_plan: list[str]          # From supervisor
    files: dict[str, str]         # path -> content
    agent_outputs: dict[str, Any]   # agentType -> output JSON
    reviews: list[dict]           # QA / reviewer feedback
    errors: list[str]
    status: str                   # PENDING → PLANNING → ...
```

### 7.2 Agent Responsibilities

| Agent | Input | Output | Parallel? |
|-------|-------|--------|-----------|
| **Supervisor** | User prompt, tech stack | Task plan, architecture decision | No |
| **Backend** | Task plan | `routes/`, `controllers/`, `services/`, `middleware/` files | Yes |
| **Database** | Task plan | `prisma/schema.prisma`, migration SQL | Yes |
| **DevOps** | Task plan | `Dockerfile`, `docker-compose.yml`, `k8s/` manifests | Yes |
| **Frontend** | Task plan + backend files + schema | `pages/`, `components/`, `hooks/`, `lib/` files | No |
| **QA** | All files | Test files (`*.test.ts`, `*.spec.py`) | No |
| **Reviewer** | All files + tests | Code review comments | No |
| **Security** | All files | Security audit report, fixes | No |
| **Documentation** | All files | `README.md`, `API.md`, `ARCHITECTURE.md` | No |

### 7.3 LLM Calling

- **Client:** OpenAI-compatible client pointing to `OLLAMA_BASE_URL`.
- **Default model:** `codellama` (configurable per agent via `ModelPreference`).
- **Other supported aliases:** `llama4`, `mistral-small`, `gpt-oss`, `kimi`.
- **Context window:** Managed by truncating prior messages + including relevant file snippets.

---

## 8. Infrastructure Specification

### 8.1 AWS Resources (Staging)

| Resource | Spec | Cost (approx) |
|----------|------|---------------|
| EKS | 1.30, 2× t3.large, 1–4 ASG | ~$150/mo |
| RDS | PostgreSQL 15, db.t3.micro, 20 GB gp3 | ~$15/mo |
| ElastiCache | Redis 7, cache.t3.micro | ~$13/mo |
| ECR | 3 repos, lifecycle 20 images | ~$1/mo |
| S3 | Staging files bucket | ~$2/mo |
| CloudWatch | Log groups + 2 alarms | ~$5/mo |

### 8.2 Terraform Backend

- **State bucket:** `swarmdev-terraform-state`
- **Lock table:** `swarmdev-terraform-locks` (DynamoDB)
- **Encryption:** AES-256-SSE

### 8.3 K8s Overlays

```
infra/k8s/
├── base/                 # Namespace, Deployments, Services, HPA, PDB, Ingress
└── overlays/
    ├── dev/              # In-cluster postgres, local images, 1 replica
    ├── staging/          # RDS, ECR images, 2 replicas, resource limits
    └── production/       # Multi-AZ RDS, ElastiCache, 3+ replicas, PDB
```

---

## 9. Security Architecture

| Layer | Control |
|-------|---------|
| **Transport** | TLS 1.3 on all public endpoints; HSTS headers via Helmet |
| **Authn** | Clerk JWT (RS256); short-lived tokens |
| **Authz** | User-scoped queries (`WHERE userId = req.user.id` on every project route) |
| **Rate limiting** | 100 req/15 min (general), 20 req/15 min (auth), 30 req/1 min (projects) |
| **Secrets** | AWS Secrets Manager (staging); injected as K8s secrets; never in Git |
| **CSP** | `script-src 'self'`; `connect-src` restricted to API domain |
| **Sandbox** | E2B for untrusted code execution (planned) |
| **Scanning** | Trivy container scans in CI; npm audit; bandit + semgrep |

---

## 10. Monitoring & Observability

| Signal | Tool | What |
|--------|------|------|
| **Logs** | CloudWatch Logs | Application stdout; K8s pod logs |
| **Metrics** | CloudWatch Metrics | CPU, memory, RDS storage, Redis connections |
| **Alarms** | CloudWatch Alarms | CPU > 80%, RDS free storage < 20% |
| **Tracing** | X-Ray (planned) | Distributed trace across Web → API → Orchestrator |
| **Errors** | Sentry (planned) | Exception tracking with source maps |
| **Health** | `/health` | API returns 200 + Prisma + Redis connectivity status |

---

## 11. Environment Configuration

### 11.1 Required Variables (all apps)

| Variable | apps/web | apps/api | apps/orchestrator |
|----------|----------|----------|-------------------|
| `DATABASE_URL` | — | ✅ | — |
| `REDIS_URL` | — | ✅ | ✅ |
| `CLERK_SECRET_KEY` | — | ✅ | — |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | — | — |
| `ORCHESTRATOR_URL` | — | ✅ | — |
| `ORCHESTRATOR_SECRET` | — | ✅ | ✅ |
| `OLLAMA_BASE_URL` | — | — | ✅ |
| `OLLAMA_MODEL` | — | — | ✅ |
| `STRIPE_SECRET_KEY` | — | ✅ | — |
| `STRIPE_WEBHOOK_SECRET` | — | ✅ | — |
| `R2_ENDPOINT` | — | ✅ | — |
| `R2_ACCESS_KEY_ID` | — | ✅ | — |
| `R2_SECRET_ACCESS_KEY` | — | ✅ | — |
| `R2_BUCKET_NAME` | — | ✅ | — |
| `E2B_API_KEY` | — | — | ✅ (planned) |

### 11.2 Local Development

Copy example files:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/orchestrator/.env.example apps/orchestrator/.env
```

---

## 12. Testing Strategy

| Layer | Framework | Coverage Target |
|-------|-----------|-----------------|
| **Web unit** | Vitest + React Testing Library | 60% components |
| **Web E2E** | Playwright | Critical flows (login, create project, chat) |
| **API unit** | Jest + Supertest | 70% routes & services |
| **API integration** | Jest + Testcontainers (Postgres/Redis) | Auth, plan enforcement |
| **Orchestrator** | pytest + pytest-asyncio | Agent parsing, state transitions |
| **Infra** | Terraform validate + checkov | Security policy compliance |
| **Security** | Trivy + npm audit + bandit | Zero critical CVEs |

---

*End of TechSpec.md*
