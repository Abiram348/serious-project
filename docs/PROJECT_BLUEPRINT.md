# 🧠 SWARMDEV — Multi-Agent Cloud Development Platform
### Complete Project Blueprint for SwarmDev

---

> **Vision**: A cloud-native AI software company in a browser. Multiple specialized AI agents collaborate simultaneously — like a real dev team — to design, build, test, review, and deploy full-stack applications entirely in the cloud. No local setup. No single-agent bottleneck. Just describe your idea and watch a virtual team build it.

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Core Concepts & Philosophy](#2-core-concepts--philosophy)
3. [Full Tech Stack](#3-full-tech-stack)
4. [System Architecture](#4-system-architecture)
5. [Agent Roles & Responsibilities](#5-agent-roles--responsibilities)
6. [Complete Feature List](#6-complete-feature-list)
7. [Database Schema](#7-database-schema)
8. [API Design](#8-api-design)
9. [Workflows & Flowcharts](#9-workflows--flowcharts)
10. [Real-Time Communication Layer](#10-real-time-communication-layer)
11. [Cloud Execution Environment](#11-cloud-execution-environment)
12. [Frontend UI Structure](#12-frontend-ui-structure)
13. [Authentication & Authorization](#13-authentication--authorization)
14. [File System & Storage](#14-file-system--storage)
15. [Agent Orchestration Engine](#15-agent-orchestration-engine)
16. [Billing & Usage](#16-billing--usage)
17. [Security Model](#17-security-model)
18. [Deployment Strategy](#18-deployment-strategy)
19. [Environment Variables](#19-environment-variables)
20. [Folder Structure](#20-folder-structure)
21. [Implementation Phases](#21-implementation-phases)
22. [Agent Instructions](#22-agent-instructions)

---

## 1. PROJECT OVERVIEW

### What is SwarmDev?

SwarmDev is a **cloud-based multi-agent AI development platform** where users describe a project in natural language and a team of specialized AI agents — each with a distinct role — collaborates to build, test, review, and deploy a complete full-stack application, entirely in the cloud.

### Inspired By
| Product | What we take from it |
|---|---|
| **Cursor** | AI-powered code editing experience |
| **Emergent / Bolt.new** | Full-stack generation from prompt |
| **Google Project IDX** | Cloud-native dev environment |
| **Devin** | Autonomous software engineering agent |
| **CrewAI / AutoGen** | Multi-agent orchestration patterns |

### Key Differentiator
Unlike single-agent tools (Cursor, Copilot, Bolt), SwarmDev runs **multiple specialized agents in parallel**, each owning a domain (frontend, backend, DB, testing, security, etc.), coordinated by a Supervisor Agent — exactly like a real software engineering team.

### Target Users
- Web developers who want to scaffold projects fast
- App developers building SaaS products
- Non-technical founders building MVPs
- Working professionals automating internal tools

---

## 2. CORE CONCEPTS & PHILOSOPHY

### The "IT Company" Model
```
User (Client)
    │
    ▼
Project Manager Agent (PM)
    │
    ├──► Frontend Agent        → Builds UI/UX, React/Next.js components
    ├──► Backend Agent         → Builds APIs, business logic, routes
    ├──► Database Agent        → Designs schemas, writes migrations, queries
    ├──► DevOps Agent          → Dockerfiles, CI/CD, deployment configs
    ├──► QA / Testing Agent    → Unit, integration, e2e tests
    ├──► Code Review Agent     → Reviews all code, flags issues
    ├──► Security Agent        → Audits for vulnerabilities
    └──► Documentation Agent   → Generates README, API docs, comments
```

### Core Principles
1. **No Local Execution** — Everything runs in cloud sandboxes (containers)
2. **Parallel Workstreams** — Agents work simultaneously, not sequentially
3. **Human-in-the-Loop** — User can intervene, redirect, approve at any stage
4. **Full Observability** — Every agent action is visible in real-time
5. **Iterative Refinement** — User can request changes and agents adapt

---

## 3. FULL TECH STACK

### Frontend
| Layer | Technology | Purpose |
|---|---|---|
| Framework | **Next.js 14** (App Router) | Full-stack React framework |
| Language | **TypeScript** | Type safety everywhere |
| Styling | **TailwindCSS + shadcn/ui** | UI components |
| Code Editor | **Monaco Editor** | VS Code-like editor in browser |
| Terminal | **xterm.js** | In-browser terminal emulator |
| File Tree | **react-arborist** | File explorer component |
| State | **Zustand** | Global state management |
| Data Fetching | **TanStack Query (React Query)** | Server state, caching |
| Real-time | **Socket.io-client** | Live agent updates |
| Animation | **Framer Motion** | UI transitions |
| Charts | **Recharts** | Usage/analytics charts |
| Diff Viewer | **react-diff-viewer** | Code diff visualization |
| Markdown | **react-markdown + remark** | Render agent chat/docs |

### Backend
| Layer | Technology | Purpose |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Server runtime |
| Framework | **Express.js + TypeScript** | REST API server |
| AI Orchestration | **Python FastAPI** (microservice) | Agent orchestration engine |
| Agent Framework | **LangGraph** | Multi-agent state machines |
| LLM | **Ollama Cloud** (OpenAI-compatible API) | Primary LLM for all agents |
| LLM Routing | **Tiered model routing** | Reasoning (Llama 4), Code Gen (CodeLlama), Template (Mistral Small) |
| Embedding | **Voyage AI / Cohere** | Code/doc embeddings |
| Task Queue | **BullMQ + Redis** | Agent job queue |
| WebSockets | **Socket.io** | Real-time bidirectional comms |
| Process Mgmt | **PM2** | Node process management |

### Databases
| Database | Technology | Purpose |
|---|---|---|
| Primary DB | **PostgreSQL 16** | Users, projects, sessions, billing |
| Cache | **Redis 7** | Sessions, pub/sub, job queues |
| Vector DB | **Qdrant** | Project context, RAG, code search |
| Object Store | **Cloudflare R2 / AWS S3** | Generated files, project archives |
| Search | **MeiliSearch** | Full-text search across projects |

### Cloud Execution (Sandbox)
| Layer | Technology | Purpose |
|---|---|---|
| Sandbox Runtime | **E2B (e2b.dev)** | Secure cloud code execution |
| Containers | **Docker** | Isolated project environments |
| Orchestration | **Kubernetes (GKE/EKS)** | Container orchestration |
| Preview | **Cloudflare Tunnel** | Live preview URLs for projects |

### Infrastructure & DevOps
| Layer | Technology | Purpose |
|---|---|---|
| Frontend Deploy | **Vercel** | Next.js hosting |
| Backend Deploy | **Google Cloud Run / AWS ECS** | Containerized backend |
| DNS | **Cloudflare** | DNS + CDN + DDoS protection |
| Monitoring | **Grafana + Prometheus** | System metrics |
| Logging | **Axiom / Loki** | Structured log aggregation |
| Error Tracking | **Sentry** | Error monitoring |
| APM | **OpenTelemetry** | Distributed tracing |
| CI/CD | **GitHub Actions** | Automated build & deploy |
| Secrets | **Doppler / AWS SSM** | Secrets management |

### Auth & Payments
| Layer | Technology | Purpose |
|---|---|---|
| Auth | **Clerk** | Authentication + user management |
| Payments | **Stripe** | Subscription billing |
| Email | **Resend** | Transactional emails |

---

## 4. SYSTEM ARCHITECTURE

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    USER BROWSER                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Next.js Frontend                                │   │
│  │  ┌────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │Monaco  │ │ Agent    │ │ File     │           │   │
│  │  │Editor  │ │ Chat UI  │ │ Explorer │           │   │
│  │  └────────┘ └──────────┘ └──────────┘           │   │
│  │  ┌────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │xterm.js│ │ Preview  │ │ Agent    │           │   │
│  │  │Terminal│ │  Frame   │ │ Status   │           │   │
│  │  └────────┘ └──────────┘ └──────────┘           │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS + WebSocket
┌───────────────────────▼─────────────────────────────────┐
│                  API GATEWAY (Express.js)                │
│  REST API + Socket.io Server + Auth Middleware           │
└──────┬──────────────────────────┬───────────────────────┘
       │                          │
┌──────▼──────┐          ┌────────▼────────┐
│  PostgreSQL  │          │  Redis (Cache   │
│  (Primary DB)│          │  + Pub/Sub      │
│             │          │  + BullMQ)      │
└─────────────┘          └────────┬────────┘
                                  │ Job Queue
┌─────────────────────────────────▼───────────────────────┐
│          ORCHESTRATION ENGINE (Python FastAPI)           │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │              SUPERVISOR AGENT                      │ │
│  │         (LangGraph State Machine)                  │ │
│  └──────┬──────────────────────────────────┬──────────┘ │
│         │ spawns & coordinates              │            │
│  ┌──────▼──────┐  ┌──────────┐  ┌──────────▼──────┐   │
│  │  Frontend   │  │ Backend  │  │  Database        │   │
│  │  Agent      │  │ Agent    │  │  Agent           │   │
│  └─────────────┘  └──────────┘  └─────────────────┘   │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  QA/Testing  │  │ Security │  │  DevOps Agent    │  │
│  │  Agent       │  │ Agent    │  │                  │  │
│  └──────────────┘  └──────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌─────────────────────────────────┐  │
│  │ Code Review  │  │     Documentation Agent         │  │
│  │ Agent        │  │                                 │  │
│  └──────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────┘
                              │ executes in
┌─────────────────────────────▼───────────────────────────┐
│            CLOUD SANDBOX LAYER (E2B / Docker)            │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │  Project   │  │  Shell     │  │  Live Preview      │ │
│  │  Files     │  │  Execution │  │  (Cloudflare       │ │
│  │  (R2/S3)   │  │  Container │  │   Tunnel)          │ │
│  └────────────┘  └────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Microservices Breakdown
```
swarmdev/
├── apps/
│   ├── web/              → Next.js frontend (Vercel)
│   ├── api/              → Express.js REST + Socket.io (Cloud Run)
│   └── orchestrator/     → Python FastAPI + LangGraph (Cloud Run)
├── packages/
│   ├── shared-types/     → Shared TypeScript types
│   ├── ui/               → Shared shadcn/ui components
│   └── db/               → Prisma schema + migrations
└── infra/
    ├── k8s/              → Kubernetes manifests
    ├── docker/           → Dockerfiles
    └── terraform/        → Infrastructure as code
```

---

## 5. AGENT ROLES & RESPONSIBILITIES

### 5.1 Supervisor / PM Agent
**Role**: The orchestrator. Reads user requirements, breaks project into tasks, assigns to specialist agents, tracks progress, resolves conflicts, reports back to user.

**Responsibilities**:
- Parse user project description into structured task graph (DAG)
- Assign tasks to appropriate agents with context
- Monitor agent progress and handle failures
- Merge outputs from all agents into cohesive project
- Communicate progress updates to the user in natural language
- Handle user interruptions and re-plan if needed

**Tools Available**:
- Task creation/assignment API
- Agent status polling
- Message bus (publish to any agent)
- Project context (RAG over existing code)

**LLM**: Reasoning tier (Llama 4 via Ollama Cloud)

---

### 5.2 Frontend Agent
**Role**: Builds all UI — components, pages, layouts, styling, animations.

**Responsibilities**:
- Scaffold Next.js/React component tree
- Build pages from design descriptions
- Implement TailwindCSS styling
- Handle state management (Zustand/Context)
- Connect UI to API endpoints
- Build responsive, accessible interfaces
- Handle routing and navigation

**Tools Available**:
- File write/read in sandbox
- npm install (in sandbox)
- Browser preview screenshot (visual feedback)
- Component library reference (shadcn/ui docs)

**LLM**: Code Gen tier (CodeLlama via Ollama Cloud)

---

### 5.3 Backend Agent
**Role**: Builds server-side logic, REST/GraphQL APIs, business logic, middleware.

**Responsibilities**:
- Design API route structure (RESTful conventions)
- Implement Express/FastAPI routes and controllers
- Write business logic and service layer
- Implement authentication middleware (JWT/session)
- Handle error handling, validation (Zod/Joi)
- Integrate third-party services (Stripe, email, etc.)
- Write environment configuration

**Tools Available**:
- File write/read in sandbox
- Shell execution (npm/pip install, run server)
- HTTP client (test own endpoints)
- Database schema reference (from DB Agent)

**LLM**: Code Gen tier (CodeLlama via Ollama Cloud)

---

### 5.4 Database Agent
**Role**: Designs and manages data layer — schemas, migrations, queries, indexes, seeds.

**Responsibilities**:
- Design normalized database schema from requirements
- Write Prisma schema (or Drizzle ORM)
- Generate and run migrations in sandbox
- Write efficient queries and stored procedures
- Design indexes for performance
- Write seed data scripts
- Handle relationships, constraints, cascades

**Tools Available**:
- File write in sandbox
- Shell: `npx prisma migrate dev`, `psql` commands
- Schema validation tools
- ER diagram generator

**LLM**: Code Gen tier (CodeLlama via Ollama Cloud)

---

### 5.5 DevOps / Infrastructure Agent
**Role**: Sets up deployment configuration, Docker, CI/CD, environment configs.

**Responsibilities**:
- Write Dockerfile for each service
- Write docker-compose.yml for local dev
- Write GitHub Actions CI/CD pipelines
- Configure environment variable templates
- Write Kubernetes manifests (if needed)
- Setup health checks and readiness probes
- Configure logging and monitoring setups

**Tools Available**:
- File write in sandbox
- Docker build/run in sandbox
- Shell execution (validate configs)

**LLM**: Template tier (Mistral Small via Ollama Cloud)

---

### 5.6 QA / Testing Agent
**Role**: Writes and runs tests — unit, integration, end-to-end.

**Responsibilities**:
- Write Jest/Vitest unit tests for all services
- Write Supertest API integration tests
- Write Playwright end-to-end tests
- Run tests in sandbox and report results
- Report coverage metrics
- Flag failing tests to Supervisor Agent
- Write test fixtures and mock data

**Tools Available**:
- File write in sandbox
- Shell: `npm test`, `npx playwright test`
- Test result parser
- Coverage reporter

**LLM**: Code Gen tier (CodeLlama via Ollama Cloud)

---

### 5.7 Code Review Agent
**Role**: Reviews all code produced by other agents — catches bugs, anti-patterns, and quality issues.

**Responsibilities**:
- Review every file produced by agents
- Flag security vulnerabilities
- Identify logic bugs and edge cases
- Check for code style consistency
- Verify API contracts match between frontend and backend
- Produce a structured review report
- Send review findings back to relevant agents for fixes

**Tools Available**:
- File read across entire project
- Static analysis tools (ESLint, pylint)
- Diff comparison
- AST parsing

**LLM**: Code Gen tier (CodeLlama via Ollama Cloud) (requires deep comprehension)

---

### 5.8 Security Agent
**Role**: Audits the codebase for security vulnerabilities.

**Responsibilities**:
- Check for SQL injection risks
- Validate input sanitization
- Check for XSS vulnerabilities
- Verify authentication/authorization logic
- Check for exposed secrets or API keys
- Validate CORS configurations
- Check dependency vulnerabilities (npm audit)
- Produce a security report

**Tools Available**:
- File read (entire project)
- Shell: `npm audit`, `bandit` (Python)
- OWASP checklist reference
- Semgrep static analysis

**LLM**: Code Gen tier (CodeLlama via Ollama Cloud)

---

### 5.9 Documentation Agent
**Role**: Produces all project documentation.

**Responsibilities**:
- Write README.md (setup, usage, architecture)
- Generate API documentation (OpenAPI/Swagger spec)
- Write inline code comments
- Generate JSDoc / TypeDoc
- Write CONTRIBUTING.md
- Produce architecture diagrams (Mermaid)
- Write deployment guide

**Tools Available**:
- File read (entire project)
- File write
- Swagger spec generator
- Mermaid diagram renderer

**LLM**: Template tier (Mistral Small via Ollama Cloud)

---

## 6. COMPLETE FEATURE LIST

### Core Features (MVP — Phase 1)
- [ ] User authentication (sign up, login, OAuth)
- [ ] Project creation via natural language prompt
- [ ] Supervisor Agent — project planning from prompt
- [ ] Frontend Agent — Next.js project generation
- [ ] Backend Agent — Express API generation
- [ ] Database Agent — Prisma schema + migration
- [ ] Real-time agent activity feed (WebSocket)
- [ ] Cloud sandbox execution (E2B)
- [ ] Monaco code editor (view/edit generated files)
- [ ] File explorer tree
- [ ] Live preview iframe
- [ ] Download project as ZIP
- [ ] Project dashboard (list all projects)
- [ ] Basic chat with agents (ask questions, request changes)

### Advanced Features (Phase 2)
- [ ] DevOps Agent (Docker + CI/CD generation)
- [ ] QA Agent (automated tests)
- [ ] Code Review Agent
- [ ] Security Agent
- [ ] Documentation Agent
- [ ] Parallel agent execution visualization
- [ ] Agent-to-agent conversation log (visible to user)
- [ ] Git integration (push to GitHub)
- [ ] Multi-turn conversation (refine existing project)
- [ ] Template library (start from starter templates)
- [ ] Tech stack selector (choose your stack)
- [ ] One-click deploy (Vercel / Railway / Render)

### Power Features (Phase 3)
- [ ] Collaborative projects (multiple users)
- [ ] Agent memory (RAG over entire project)
- [ ] Custom agent roles (user-defined agents)
- [ ] Marketplace of project templates
- [ ] API access (build on top of SwarmDev)
- [ ] Team workspaces
- [ ] Usage analytics dashboard
- [ ] Bring-your-own API key (Ollama Cloud, OpenAI)
- [ ] Mobile app (React Native)
- [ ] VS Code extension

---

## 7. DATABASE SCHEMA

### PostgreSQL Schema (Prisma)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────── USERS ───────────────
model User {
  id            String    @id @default(cuid())
  clerkId       String    @unique
  email         String    @unique
  name          String?
  avatarUrl     String?
  plan          Plan      @default(FREE)
  credits       Int       @default(100)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  projects      Project[]
  subscriptions Subscription[]
  usageLogs     UsageLog[]

  @@map("users")
}

// ─────────────── PROJECTS ───────────────
model Project {
  id            String        @id @default(cuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  name          String
  description   String        @db.Text
  status        ProjectStatus @default(PENDING)
  techStack     Json          // { frontend: "next", backend: "express", db: "postgres" }
  sandboxId     String?       // E2B sandbox ID
  previewUrl    String?       // Cloudflare tunnel URL
  githubRepo    String?
  deployUrl     String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  agents        AgentRun[]
  files         ProjectFile[]
  messages      ChatMessage[]
  buildLogs     BuildLog[]

  @@map("projects")
}

// ─────────────── AGENT RUNS ───────────────
model AgentRun {
  id          String      @id @default(cuid())
  projectId   String
  project     Project     @relation(fields: [projectId], references: [id])
  agentType   AgentType
  status      AgentStatus @default(IDLE)
  input       Json?       // task assigned by supervisor
  output      Json?       // result produced
  startedAt   DateTime?
  completedAt DateTime?
  errorMsg    String?
  tokenUsed   Int         @default(0)
  createdAt   DateTime    @default(now())

  logs        AgentLog[]

  @@map("agent_runs")
}

// ─────────────── AGENT LOGS ───────────────
model AgentLog {
  id          String    @id @default(cuid())
  agentRunId  String
  agentRun    AgentRun  @relation(fields: [agentRunId], references: [id])
  level       LogLevel  @default(INFO)
  message     String    @db.Text
  metadata    Json?
  timestamp   DateTime  @default(now())

  @@map("agent_logs")
}

// ─────────────── PROJECT FILES ───────────────
model ProjectFile {
  id          String    @id @default(cuid())
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id])
  path        String    // e.g. "src/app/page.tsx"
  content     String    @db.Text
  language    String?   // "typescript", "python", etc.
  createdBy   AgentType?
  version     Int       @default(1)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([projectId, path])
  @@map("project_files")
}

// ─────────────── CHAT MESSAGES ───────────────
model ChatMessage {
  id          String      @id @default(cuid())
  projectId   String
  project     Project     @relation(fields: [projectId], references: [id])
  role        MessageRole // USER | SUPERVISOR | AGENT
  agentType   AgentType?
  content     String      @db.Text
  metadata    Json?
  createdAt   DateTime    @default(now())

  @@map("chat_messages")
}

// ─────────────── BUILD LOGS ───────────────
model BuildLog {
  id          String    @id @default(cuid())
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id])
  stream      String    @db.Text  // raw terminal output
  exitCode    Int?
  createdAt   DateTime  @default(now())

  @@map("build_logs")
}

// ─────────────── SUBSCRIPTIONS ───────────────
model Subscription {
  id                 String    @id @default(cuid())
  userId             String
  user               User      @relation(fields: [userId], references: [id])
  stripeCustomerId   String    @unique
  stripePriceId      String
  stripeSubId        String    @unique
  status             SubStatus
  currentPeriodEnd   DateTime
  createdAt          DateTime  @default(now())

  @@map("subscriptions")
}

// ─────────────── USAGE LOGS ───────────────
model UsageLog {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  projectId   String?
  agentType   AgentType?
  tokensIn    Int       @default(0)
  tokensOut   Int       @default(0)
  cost        Float     @default(0)
  createdAt   DateTime  @default(now())

  @@map("usage_logs")
}

// ─────────────── ENUMS ───────────────
enum Plan {
  FREE
  PRO
  TEAM
  ENTERPRISE
}

enum ProjectStatus {
  PENDING
  PLANNING
  IN_PROGRESS
  REVIEWING
  COMPLETED
  FAILED
  ARCHIVED
}

enum AgentType {
  SUPERVISOR
  FRONTEND
  BACKEND
  DATABASE
  DEVOPS
  QA
  REVIEWER
  SECURITY
  DOCUMENTATION
}

enum AgentStatus {
  IDLE
  RUNNING
  WAITING
  COMPLETED
  FAILED
}

enum LogLevel {
  DEBUG
  INFO
  WARNING
  ERROR
}

enum MessageRole {
  USER
  SUPERVISOR
  AGENT
  SYSTEM
}

enum SubStatus {
  ACTIVE
  CANCELLED
  PAST_DUE
  TRIALING
}
```

---

## 8. API DESIGN

### Base URL
```
Production:  https://api.swarmdev.io/v1
Development: http://localhost:3001/v1
```

### Authentication
All endpoints require `Authorization: Bearer <clerk_jwt>` header unless marked public.

---

### 8.1 Auth Endpoints
```
POST   /auth/webhook          → Clerk webhook (user created/updated)
GET    /auth/me               → Get current user profile
PATCH  /auth/me               → Update user profile
```

### 8.2 Project Endpoints
```
GET    /projects              → List all user projects (paginated)
POST   /projects              → Create new project (starts agent pipeline)
GET    /projects/:id          → Get project details + status
PATCH  /projects/:id          → Update project (name, description)
DELETE /projects/:id          → Delete project + cleanup sandbox
POST   /projects/:id/restart  → Re-run agent pipeline
POST   /projects/:id/export   → Generate ZIP download
GET    /projects/:id/preview  → Get live preview URL
```

### 8.3 Agent Endpoints
```
GET    /projects/:id/agents           → List all agent runs for project
GET    /projects/:id/agents/:agentId  → Get specific agent run details
POST   /projects/:id/agents/message   → Send message to a specific agent
GET    /projects/:id/agents/logs      → Stream agent logs (SSE)
```

### 8.4 File Endpoints
```
GET    /projects/:id/files            → List all project files (tree)
GET    /projects/:id/files/*path      → Get file content
PATCH  /projects/:id/files/*path      → Update file content (human edit)
POST   /projects/:id/files/*path      → Create new file
DELETE /projects/:id/files/*path      → Delete file
```

### 8.5 Chat Endpoints
```
GET    /projects/:id/chat             → Get chat history
POST   /projects/:id/chat             → Send message to Supervisor
DELETE /projects/:id/chat             → Clear chat history
```

### 8.6 Terminal Endpoints
```
POST   /projects/:id/terminal/exec    → Execute shell command in sandbox
GET    /projects/:id/terminal/stream  → Stream terminal output (SSE)
```

### 8.7 Git Endpoints
```
POST   /projects/:id/git/init         → Initialize git repo
POST   /projects/:id/git/push         → Push to GitHub
GET    /projects/:id/git/status       → Git status
POST   /projects/:id/git/commit       → Manual commit
```

### 8.8 Billing Endpoints
```
GET    /billing/plans                 → List available plans (public)
GET    /billing/subscription          → Get current subscription
POST   /billing/checkout              → Create Stripe checkout session
POST   /billing/portal                → Open Stripe billing portal
GET    /billing/usage                 → Get current usage stats
POST   /billing/webhook               → Stripe webhook handler
```

### 8.9 WebSocket Events (Socket.io)

#### Client → Server
```
join_project        { projectId }
leave_project       { projectId }
send_message        { projectId, content }
request_file        { projectId, path }
exec_command        { projectId, command }
```

#### Server → Client
```
agent_status        { agentType, status, message }
agent_log           { agentType, level, message, timestamp }
agent_message       { agentType, content }
file_created        { path, content, createdBy }
file_updated        { path, content, updatedBy }
project_status      { status }
terminal_output     { data }
build_result        { success, output, errors }
preview_ready       { url }
```

---

## 9. WORKFLOWS & FLOWCHARTS

### 9.1 Main User Flow
```
User visits SwarmDev
        │
        ▼
  Sign up / Login (Clerk)
        │
        ▼
  Dashboard — My Projects
        │
        ├── [ New Project ] ──────────────────────┐
        │                                         │
        │                                         ▼
        │                              Describe your project
        │                              (text prompt input)
        │                                         │
        │                                         ▼
        │                              Choose tech stack
        │                              (or let AI decide)
        │                                         │
        │                                         ▼
        │                              Review AI plan
        │                              (Supervisor breaks it down)
        │                                         │
        │                                         ▼
        │                              [Confirm & Build]
        │                                         │
        │                                         ▼
        │                           ┌─────────────────────────┐
        │                           │  AGENT PIPELINE STARTS  │
        │                           └─────────────────────────┘
        │
        └── [ Open Existing Project ]
                      │
                      ▼
              Project IDE View
```

---

### 9.2 Agent Pipeline Flow
```
                    USER PROMPT
                        │
                        ▼
            ┌───────────────────────┐
            │   SUPERVISOR AGENT    │
            │  - Parse requirements │
            │  - Create task DAG    │
            │  - Assign agents      │
            └─────────┬─────────────┘
                      │
          ┌───────────┼───────────────────────────┐
          │           │           │               │
          ▼           ▼           ▼               ▼
   ┌────────────┐ ┌────────┐ ┌────────┐  ┌──────────────┐
   │  DATABASE  │ │BACKEND │ │DEVOPS  │  │DOCUMENTATION │
   │   AGENT    │ │ AGENT  │ │ AGENT  │  │    AGENT     │
   │            │ │        │ │        │  │              │
   │ - Schema   │ │ - APIs │ │-Docker │  │ - README     │
   │ - Migrate  │ │ - Auth │ │ -CI/CD │  │ - API Docs   │
   │ - Seeds    │ │ - BL   │ │ -.env  │  │ - Comments   │
   └─────┬──────┘ └───┬────┘ └───┬────┘  └──────┬───────┘
         │            │          │               │
         └────────────┴──────────┘               │
                      │                          │
                      ▼                          │
            ┌───────────────────┐                │
            │  FRONTEND AGENT   │                │
            │                   │                │
            │ - Pages/Components│                │
            │ - State mgmt      │                │
            │ - API integration │                │
            └─────────┬─────────┘                │
                      │                          │
                      ▼                          │
            ┌───────────────────┐                │
            │    QA AGENT       │                │
            │                   │                │
            │ - Unit Tests      │                │
            │ - Integration     │                │
            │ - Run test suite  │                │
            └─────────┬─────────┘                │
                      │                          │
                      ▼                          │
            ┌───────────────────┐                │
            │  REVIEW AGENT     │◄───────────────┘
            │                   │
            │ - Code review     │
            │ - Bug detection   │
            │ - Merge report    │
            └─────────┬─────────┘
                      │
                      ▼
            ┌───────────────────┐
            │  SECURITY AGENT   │
            │                   │
            │ - Vuln scan       │
            │ - Dep audit       │
            │ - Security report │
            └─────────┬─────────┘
                      │
            ┌─────────▼──────────┐
            │   SUPERVISOR       │
            │  - Merge all work  │
            │  - Fix review flags│
            │  - Final build run │
            │  - Report to user  │
            └─────────┬──────────┘
                      │
                      ▼
            ┌──────────────────────┐
            │   PROJECT COMPLETE   │
            │  - Preview URL live  │
            │  - Files in editor   │
            │  - Download ZIP      │
            │  - Deploy button     │
            └──────────────────────┘
```

---

### 9.3 User Intervention Flow
```
Agent Working
     │
     ▼
User sends chat message
     │
     ├── "Change the color to blue" ──► Supervisor interprets
     │                                         │
     │                                         ▼
     │                              Frontend Agent gets task
     │                                         │
     │                                         ▼
     │                              Updates relevant file
     │                                         │
     │                                         ▼
     │                              Preview refreshes
     │
     ├── "Add Stripe payments" ──────► Supervisor creates new tasks
     │                                         │
     │                                         ▼
     │                              Backend + DB Agents spawn
     │                              (payments branch added)
     │
     └── "Stop and explain what you built" ──► Supervisor pauses
                                              agents, explains
```

---

### 9.4 Agent-to-Agent Communication Flow
```
BACKEND AGENT                       DATABASE AGENT
      │                                   │
      │──── "What is the User schema?" ──►│
      │                                   │
      │◄─── Returns Prisma User model ────│
      │                                   │
      │ (Backend uses schema to build     │
      │  correct API responses)           │
      │                                   │

FRONTEND AGENT                     BACKEND AGENT
      │                                   │
      │──── "What are the API routes?" ──►│
      │                                   │
      │◄─── Returns OpenAPI spec ─────────│
      │                                   │
      │ (Frontend generates correct       │
      │  fetch/axios calls)               │

QA AGENT                          ALL AGENTS
      │                                   │
      │──── "Share your output files" ───►│
      │                                   │
      │◄─── Files sent ───────────────────│
      │                                   │
      │ (QA writes tests based on        │
      │  actual implementations)          │
```

---

### 9.5 Project Creation Sequence Diagram
```
User          Frontend       API            Supervisor     DB Agent      Backend Agent
  │               │            │                │               │               │
  │─ POST /project►│            │                │               │               │
  │               │─ REST ─────►│                │               │               │
  │               │            │─ Create DB row ►│               │               │
  │               │            │                │               │               │
  │               │            │─ Queue job ─────►               │               │
  │               │            │                │               │               │
  │               │◄─ 201 ─────│                │               │               │
  │◄─ Redirect ───│            │                │               │               │
  │   /project/:id             │                │               │               │
  │               │            │                │               │               │
  │               │            │                │─ Plan tasks ──►               │
  │               │            │                │               │               │
  │               │◄─────────── WS: agent_status (PLANNING) ────────────────────│
  │◄─ UI Updates ─│            │                │               │               │
  │               │            │                │               │               │
  │               │            │                │─────────────► DB Agent starts  │
  │               │            │                │───────────────────────────────► Backend starts
  │               │            │                │               │               │
  │               │◄───── WS: file_created (schema.prisma) ─────│               │
  │               │◄───── WS: file_created (routes/user.ts) ──────────────────── │
  │               │            │                │               │               │
  │◄─ Files shown─│            │                │               │               │
  │   in editor   │            │                │               │               │
```

---

## 10. REAL-TIME COMMUNICATION LAYER

### Socket.io Room Architecture
```
Each project gets its own room: project:{projectId}

User connects → joins room project:{projectId}
Orchestrator publishes to → project:{projectId}
User receives live updates
```

### Redis Pub/Sub Bridge
```
Orchestrator (Python) ──publish──► Redis Channel: project:{id}
                                           │
API Server (Node) ──subscribe──────────────┘
                                           │
                                    Socket.io emit
                                           │
                                    Browser client
```

### Event Schema
```typescript
interface AgentEvent {
  type: 'agent_status' | 'agent_log' | 'file_created' | 
        'file_updated' | 'project_status' | 'terminal_output' |
        'agent_message' | 'build_result' | 'preview_ready';
  projectId: string;
  agentType?: AgentType;
  timestamp: string;
  payload: Record<string, unknown>;
}
```

---

## 11. CLOUD EXECUTION ENVIRONMENT

### E2B Sandbox Setup
Each project gets a dedicated E2B sandbox with:
- **OS**: Ubuntu 22.04
- **Runtime**: Node.js 20 + Python 3.11
- **Pre-installed**: git, npm, pip, curl, postgresql-client
- **Storage**: 5GB ephemeral (synced to R2 on changes)
- **Network**: Outbound HTTP allowed, Cloudflare tunnel for preview
- **Lifetime**: Active during session, hibernated after 30 min idle

### Sandbox Lifecycle
```
Project Created
      │
      ▼
E2B Sandbox Created (POST /sandboxes)
      │
      ▼
Base template cloned into sandbox
      │
      ▼
Agents write files → SDK: sandbox.filesystem.write()
      │
      ▼
Agents run commands → SDK: sandbox.process.start()
      │
      ▼
Preview server starts → SDK: sandbox.process.start('npm run dev')
      │
      ▼
Cloudflare tunnel exposed → Preview URL generated
      │
      ▼
Files synced to R2 every 60 seconds (persistent storage)
      │
      ▼
Sandbox hibernated after idle (files preserved in R2)
```

### File Sync Strategy
```
E2B Sandbox (ephemeral)  ◄────────────────►  Cloudflare R2 (persistent)
     │                                               │
     │ sync every 60s                                │
     │ or on file change event                       │
     │                                               │
     └───── Also stored in PostgreSQL ───────────────┘
            (ProjectFile table)
            for editor display
```

---

## 12. FRONTEND UI STRUCTURE

### Pages & Routes
```
/                           → Landing page (marketing)
/login                      → Clerk login
/signup                     → Clerk signup
/dashboard                  → My Projects list
/dashboard/new              → New Project wizard
/project/:id                → Project IDE (main workspace)
/project/:id/chat           → Chat with agents
/project/:id/files          → File explorer
/project/:id/preview        → Full-screen preview
/project/:id/logs           → Agent logs
/project/:id/settings       → Project settings
/settings                   → User settings
/settings/billing           → Billing + subscription
/settings/usage             → Token usage analytics
```

### Project IDE Layout (Main Workspace)
```
┌──────────────────────────────────────────────────────────────────┐
│  HEADER: Logo | Project Name | Status Badge | Deploy | Settings  │
├────────────┬─────────────────────────────┬────────────────────── │
│            │                             │                        │
│  FILE      │     MONACO CODE EDITOR      │   AGENT PANEL         │
│  EXPLORER  │                             │                        │
│  (tree)    │  src/app/page.tsx           │  ┌─────────────────┐  │
│            │  ─────────────────────      │  │ Supervisor 🧠   │  │
│  📁 src    │  import { ... }             │  │ Planning phase  │  │
│   📁 app   │  export default function   │  │ ✅ Schema done  │  │
│    📄 page │  Page() {                   │  │ ⏳ Backend...   │  │
│    📄 layout│   return (                 │  │ ⏳ Frontend...  │  │
│   📁 api   │     <div>...</div>          │  └─────────────────┘  │
│  📁 public │   )                         │                        │
│  📄 .env   │  }                          │  ┌─────────────────┐  │
│  📄 package│                             │  │ 💬 Agent Chat   │  │
│            │                             │  │                 │  │
│            │                             │  │ Supervisor: I   │  │
│            │                             │  │ have planned... │  │
│            │                             │  │                 │  │
│            │                             │  │ You: Add auth   │  │
│            │                             │  │                 │  │
│            │                             │  │ [Type here...] │  │
│            │                             │  └─────────────────┘  │
├────────────┴─────────────────────────────┴────────────────────── │
│  BOTTOM PANEL: Terminal | Build Logs | Preview | Test Results     │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ $ npm run dev                                            │    │
│  │ ✓ Ready on http://localhost:3000                         │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Agent Status Panel (Real-time)
```
┌─────────────────────────────────────┐
│  🤖 Active Agents                   │
├─────────────────────────────────────┤
│  🧠 Supervisor    ● Planning        │
│  🎨 Frontend      ● Working...      │
│  ⚙️  Backend       ✅ Complete       │
│  🗄️  Database      ✅ Complete       │
│  🚀 DevOps        ⏳ Waiting        │
│  🧪 QA            ⏳ Waiting        │
│  🔍 Reviewer      ⏳ Waiting        │
│  🔒 Security      ⏳ Waiting        │
│  📄 Docs          ● Working...      │
└─────────────────────────────────────┘
```

---

## 13. AUTHENTICATION & AUTHORIZATION

### Auth Flow (Clerk)
```
User signs up/logs in on Clerk hosted page
      │
      ▼
Clerk issues JWT
      │
      ▼
Frontend stores JWT in memory (Clerk SDK)
      │
      ▼
Every API request: Authorization: Bearer <jwt>
      │
      ▼
API middleware: clerk.verifyToken(jwt)
      │
      ▼
Extract userId → look up user in DB
      │
      ▼
Attach user to request context
```

### Authorization Levels
```
FREE    → 3 projects, 100k tokens/month, no parallel agents
PRO     → Unlimited projects, 2M tokens/month, 5 parallel agents
TEAM    → Unlimited + collaboration, 10M tokens/month, all agents
ENTERPRISE → Custom limits, dedicated sandboxes, SLA
```

### Middleware Stack
```typescript
// Express middleware order:
app.use(cors())
app.use(rateLimit())        // per-IP rate limiting
app.use(clerkAuth())        // verify JWT
app.use(attachUser())       // load user from DB
app.use(checkPlan())        // enforce plan limits
app.use(router)
```

---

## 14. FILE SYSTEM & STORAGE

### Storage Architecture
```
User creates/edits file
        │
        ├──► PostgreSQL (ProjectFile table) ← primary source of truth for editor
        │
        └──► E2B Sandbox filesystem ← for execution
                    │
                    └──► Cloudflare R2 ← archival + ZIP export
```

### File Tree Conventions
```
project-root/
├── frontend/               (generated by Frontend Agent)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── (routes)/
│   │   ├── components/
│   │   ├── lib/
│   │   └── styles/
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.ts
├── backend/                (generated by Backend Agent)
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── index.ts
│   └── package.json
├── database/               (generated by Database Agent)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── seeds/
├── tests/                  (generated by QA Agent)
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .github/workflows/      (generated by DevOps Agent)
├── docker-compose.yml      (generated by DevOps Agent)
├── Dockerfile              (generated by DevOps Agent)
└── README.md               (generated by Docs Agent)
```

---

## 15. AGENT ORCHESTRATION ENGINE

### LangGraph State Machine
```python
# orchestrator/graph.py

from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Literal

class ProjectState(TypedDict):
    project_id: str
    user_prompt: str
    task_plan: List[dict]
    completed_agents: List[str]
    files_generated: dict
    errors: List[str]
    phase: Literal["planning", "parallel_build", "review", "complete"]

# Graph nodes (one per agent type)
def supervisor_plan(state: ProjectState) -> ProjectState: ...
def frontend_agent(state: ProjectState) -> ProjectState: ...
def backend_agent(state: ProjectState) -> ProjectState: ...
def database_agent(state: ProjectState) -> ProjectState: ...
def devops_agent(state: ProjectState) -> ProjectState: ...
def qa_agent(state: ProjectState) -> ProjectState: ...
def review_agent(state: ProjectState) -> ProjectState: ...
def security_agent(state: ProjectState) -> ProjectState: ...
def docs_agent(state: ProjectState) -> ProjectState: ...
def supervisor_merge(state: ProjectState) -> ProjectState: ...

# Build graph
graph = StateGraph(ProjectState)
graph.add_node("supervisor_plan", supervisor_plan)
graph.add_node("frontend", frontend_agent)
graph.add_node("backend", backend_agent)
graph.add_node("database", database_agent)
graph.add_node("devops", devops_agent)
graph.add_node("qa", qa_agent)
graph.add_node("review", review_agent)
graph.add_node("security", security_agent)
graph.add_node("docs", docs_agent)
graph.add_node("supervisor_merge", supervisor_merge)

# Edges
graph.set_entry_point("supervisor_plan")

# Fan out to parallel agents after planning
graph.add_conditional_edges("supervisor_plan", route_to_agents)

# All agents converge to review
graph.add_edge("frontend", "review")
graph.add_edge("backend", "review")
graph.add_edge("database", "review")
# etc.

graph.add_edge("review", "security")
graph.add_edge("security", "supervisor_merge")
graph.add_edge("supervisor_merge", END)
```

### Task Queue (BullMQ)
```
Redis Queue: "agent-jobs"
      │
      ├── Job: { type: "FRONTEND", projectId: "...", task: {...} }
      ├── Job: { type: "BACKEND", projectId: "...", task: {...} }
      └── Job: { type: "DATABASE", projectId: "...", task: {...} }
            │
            ▼
      Worker pool: 5 concurrent workers (one per agent type)
```

### Agent Context (RAG)
Each agent has access to:
1. **User's original prompt** (always in context)
2. **Supervisor's task plan** (shared)
3. **All existing project files** (via Qdrant vector search)
4. **Agent-specific system prompt** (role definition)
5. **Tool outputs from previous steps** (from DB/Backend agents)

---

## 16. BILLING & USAGE

### Pricing Tiers
| Plan | Price | Projects | Tokens/mo | Agents |
|---|---|---|---|---|
| Free | $0 | 3 | 100K | Supervisor + 2 agents |
| Pro | $29/mo | Unlimited | 2M | All 9 agents |
| Team | $99/mo | Unlimited | 10M | All agents + collab |
| Enterprise | Custom | Custom | Custom | Custom |

### Token Tracking
```
Every API call to Ollama Cloud → log tokens in UsageLog table
                                    │
                                    ▼
                        Deduct from user's monthly quota
                                    │
                        ┌───────────┴───────────┐
                        │                       │
                  Under limit             Over limit
                        │                       │
                  Continue              Show upgrade prompt
                                        OR charge overage
```

---

## 17. SECURITY MODEL

### Sandbox Isolation
- Each project runs in a separate E2B container
- No access to other users' sandboxes
- Network egress limited to npm/pip registries + user-specified URLs
- No access to host filesystem

### API Security
- All endpoints JWT-protected (Clerk)
- Rate limiting: 100 req/min per user (Redis)
- Input validation: Zod schemas on all endpoints
- SQL injection: Prisma ORM (parameterized queries)
- XSS: Content Security Policy headers
- CORS: Whitelist of allowed origins only

### Secrets Management
- API keys stored encrypted in Doppler
- User's API keys (if BYOK) encrypted at rest (AES-256)
- Secrets never written to sandbox files
- Environment variables injected at runtime via E2B API

---

## 18. DEPLOYMENT STRATEGY

### Infrastructure
```
Vercel                     ← Next.js frontend
  │
  │ API calls
  ▼
Google Cloud Run           ← Express API (auto-scaling)
  │
  │ Job queue
  ▼
Cloud Run (Python)         ← Orchestration engine
  │
  │ Sandboxes
  ▼
E2B.dev                    ← Cloud code execution
  │
  │ Tunnel
  ▼
Cloudflare                 ← Preview URLs + CDN + DNS

Supabase / Neon            ← PostgreSQL (managed)
Upstash                    ← Redis (managed serverless)
Qdrant Cloud               ← Vector DB (managed)
Cloudflare R2              ← File storage
```

### CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/deploy.yml

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  deploy-api:
    needs: test
    steps:
      - uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: swarmdev-api
          image: gcr.io/$PROJECT/api:$SHA

  deploy-orchestrator:
    needs: test
    steps:
      - uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: swarmdev-orchestrator
          image: gcr.io/$PROJECT/orchestrator:$SHA

  deploy-frontend:
    needs: test
    steps:
      - uses: amondnet/vercel-action@v25
```

---

## 19. ENVIRONMENT VARIABLES

### Frontend (Next.js) — `.env.local`
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

### API (Express) — `.env`
```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Auth
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Ollama Cloud
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_API_KEY=
OLLAMA_REASONING_MODEL=llama4
OLLAMA_CODEGEN_MODEL=codellama
OLLAMA_TEMPLATE_MODEL=mistral-small

# E2B
E2B_API_KEY=

# Storage
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ENDPOINT=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=

# Orchestrator
ORCHESTRATOR_URL=http://localhost:8000
ORCHESTRATOR_SECRET=

# Misc
NODE_ENV=development
PORT=3001
```

### Orchestrator (Python FastAPI) — `.env`
```bash
ANTHROPIC_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_API_KEY=
OLLAMA_REASONING_MODEL=llama4
OLLAMA_CODEGEN_MODEL=codellama
OLLAMA_TEMPLATE_MODEL=mistral-small
E2B_API_KEY=
REDIS_URL=redis://...
DATABASE_URL=postgresql://...
QDRANT_URL=
QDRANT_API_KEY=
API_SECRET=                  # shared with Express API
PORT=8000
```

---

## 20. FOLDER STRUCTURE

```
swarmdev/
├── apps/
│   │
│   ├── web/                          ← Next.js frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   └── signup/
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   └── project/[id]/
│   │   │   │   │       ├── page.tsx      ← Project IDE
│   │   │   │   │       ├── chat/
│   │   │   │   │       ├── files/
│   │   │   │   │       ├── logs/
│   │   │   │   │       └── preview/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx             ← Landing page
│   │   │   ├── components/
│   │   │   │   ├── editor/
│   │   │   │   │   ├── MonacoEditor.tsx
│   │   │   │   │   ├── FileTree.tsx
│   │   │   │   │   └── Terminal.tsx
│   │   │   │   ├── agents/
│   │   │   │   │   ├── AgentPanel.tsx
│   │   │   │   │   ├── AgentCard.tsx
│   │   │   │   │   └── AgentLog.tsx
│   │   │   │   ├── chat/
│   │   │   │   │   ├── ChatWindow.tsx
│   │   │   │   │   └── ChatMessage.tsx
│   │   │   │   ├── project/
│   │   │   │   │   ├── ProjectCard.tsx
│   │   │   │   │   ├── NewProjectWizard.tsx
│   │   │   │   │   └── PreviewFrame.tsx
│   │   │   │   └── ui/                  ← shadcn/ui components
│   │   │   ├── hooks/
│   │   │   │   ├── useSocket.ts
│   │   │   │   ├── useProject.ts
│   │   │   │   └── useAgents.ts
│   │   │   ├── lib/
│   │   │   │   ├── api.ts               ← API client (axios)
│   │   │   │   ├── socket.ts            ← Socket.io client
│   │   │   │   └── utils.ts
│   │   │   └── store/
│   │   │       ├── projectStore.ts      ← Zustand
│   │   │       └── agentStore.ts
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   ├── api/                            ← Express.js backend
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── projects.ts
│   │   │   │   ├── agents.ts
│   │   │   │   ├── files.ts
│   │   │   │   ├── chat.ts
│   │   │   │   ├── terminal.ts
│   │   │   │   ├── git.ts
│   │   │   │   └── billing.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts              ← Clerk JWT verify
│   │   │   │   ├── rateLimit.ts
│   │   │   │   └── planCheck.ts
│   │   │   ├── services/
│   │   │   │   ├── projectService.ts
│   │   │   │   ├── agentService.ts
│   │   │   │   ├── sandboxService.ts    ← E2B integration
│   │   │   │   ├── storageService.ts    ← R2 integration
│   │   │   │   └── billingService.ts   ← Stripe integration
│   │   │   ├── socket/
│   │   │   │   ├── index.ts             ← Socket.io setup
│   │   │   │   └── handlers.ts
│   │   │   ├── lib/
│   │   │   │   ├── prisma.ts
│   │   │   │   ├── redis.ts
│   │   │   │   └── queue.ts             ← BullMQ
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── orchestrator/                   ← Python FastAPI
│       ├── agents/
│       │   ├── base.py                 ← Base Agent class
│       │   ├── supervisor.py
│       │   ├── frontend.py
│       │   ├── backend.py
│       │   ├── database.py
│       │   ├── devops.py
│       │   ├── qa.py
│       │   ├── reviewer.py
│       │   ├── security.py
│       │   └── documentation.py
│       ├── graph/
│       │   ├── state.py                ← LangGraph state
│       │   ├── nodes.py                ← Graph node functions
│       │   └── graph.py                ← Graph definition
│       ├── tools/
│       │   ├── sandbox_tools.py        ← E2B tool wrappers
│       │   ├── file_tools.py
│       │   └── search_tools.py
│       ├── prompts/
│       │   ├── supervisor.txt
│       │   ├── frontend.txt
│       │   ├── backend.txt
│       │   └── ...
│       ├── main.py                     ← FastAPI app
│       ├── worker.py                   ← BullMQ Python worker
│       ├── requirements.txt
│       └── Dockerfile
│
├── packages/
│   ├── shared-types/                   ← TypeScript types shared by web + api
│   │   └── src/
│   │       ├── project.ts
│   │       ├── agent.ts
│   │       └── events.ts
│   └── db/
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── infra/
│   ├── docker-compose.yml             ← Local dev
│   ├── k8s/
│   └── terraform/
│
├── .github/
│   └── workflows/
│       ├── deploy.yml
│       └── test.yml
│
├── package.json                        ← Turborepo root
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 21. IMPLEMENTATION PHASES

### Phase 1 — Foundation (Weeks 1-4)
```
Week 1:
  ✦ Monorepo setup (Turborepo + pnpm workspaces)
  ✦ Next.js frontend scaffold
  ✦ Express API scaffold
  ✦ PostgreSQL + Prisma setup
  ✦ Redis setup
  ✦ Clerk auth integration
  ✦ Basic project CRUD

Week 2:
  ✦ Monaco Editor integration
  ✦ File tree component
  ✦ Socket.io real-time setup
  ✦ E2B sandbox integration (basic)
  ✦ Agent system prompts (Supervisor, Frontend, Backend, DB)

Week 3:
  ✦ LangGraph orchestration engine
  ✦ Supervisor Agent (planning)
  ✦ Frontend Agent (Next.js generation)
  ✦ Backend Agent (Express generation)
  ✦ Database Agent (Prisma generation)

Week 4:
  ✦ Agent-to-agent communication
  ✦ Real-time agent log streaming
  ✦ File sync (E2B ↔ PostgreSQL ↔ R2)
  ✦ Live preview (xterm.js + Cloudflare tunnel)
  ✦ Project ZIP export
```

### Phase 2 — Advanced Agents (Weeks 5-8)
```
Week 5:
  ✦ DevOps Agent
  ✦ QA / Testing Agent
  ✦ Code Review Agent

Week 6:
  ✦ Security Agent
  ✦ Documentation Agent
  ✦ Agent review/fix loop (reviewer → agent → fix)

Week 7:
  ✦ Stripe billing integration
  ✦ Usage tracking + quota enforcement
  ✦ Plan-based feature gating

Week 8:
  ✦ GitHub integration (push to repo)
  ✦ One-click deploy (Vercel/Railway)
  ✦ Template library
  ✦ Tech stack selector
```

### Phase 3 — Power Features (Weeks 9-12)
```
Week 9-10:
  ✦ Multi-turn conversation (refine existing project)
  ✦ RAG over project context (Qdrant)
  ✦ Collaborative projects (multi-user)

Week 11-12:
  ✦ API access for developers
  ✦ Usage analytics dashboard
  ✦ Custom agent roles
  ✦ BYOK (Bring Your Own API Key)
  ✦ Performance optimization + load testing
```

---

## 22. AGENT INSTRUCTIONS

> These instructions tell your AI agent exactly how to approach and build this project.

### Starting Instructions for Agents
```
You are building SwarmDev — a multi-agent cloud development platform.

MONOREPO STRUCTURE:
- Use Turborepo + pnpm workspaces
- 3 apps: web (Next.js), api (Express), orchestrator (Python FastAPI)
- 2 packages: shared-types, db (Prisma)

ALWAYS FOLLOW THIS ORDER WHEN BUILDING:
1. Set up monorepo structure first
2. Set up shared-types package
3. Set up db package (Prisma schema)
4. Build Express API with auth middleware
5. Build Socket.io layer
6. Build orchestrator (Python)
7. Build individual agents (start with Supervisor, then others)
8. Build Next.js frontend
9. Integrate everything

CODING STANDARDS:
- TypeScript strict mode everywhere in Node/Next.js
- Python with type hints and pydantic models
- All API routes must have Zod validation
- All database queries via Prisma (never raw SQL unless necessary)
- All errors must be caught and handled — never let unhandled promise rejections crash the server
- Use async/await, never .then() chains
- Export types from shared-types package; never duplicate type definitions

AGENT SYSTEM:
- Each agent is a class that extends BaseAgent in orchestrator/agents/base.py
- Each agent has: system_prompt, tools list, run(task) method
- Agents communicate via shared project state (LangGraph)
- Agents publish events to Redis which are forwarded to Socket.io
- Never hardcode agent responses; all output comes from Ollama Cloud API

FILE WRITING CONVENTION:
- Agents write files using E2B sandbox SDK
- After writing, emit 'file_created' Socket.io event with { path, content, agentType }
- Also save to PostgreSQL ProjectFile table
- Use ProjectFile.upsert() — never duplicate files

REAL-TIME EVENTS:
- Every significant agent action must emit a Socket.io event
- Event format: { type, projectId, agentType, timestamp, payload }
- All events must be logged to AgentLog table

ERROR HANDLING:
- If an agent fails, emit 'agent_error' event and update AgentRun.status to FAILED
- Supervisor must handle agent failures gracefully — retry once, then skip and report
- Never let one agent failure crash the entire pipeline

ENVIRONMENT:
- All secrets in .env files (never committed)
- Use Doppler in production for secret injection
- E2B sandboxes created per project, not per agent run
- One sandbox per project, shared by all agents
```

### Key Libraries to Install

**Frontend (web)**:
```bash
pnpm add @clerk/nextjs @monaco-editor/react xterm xterm-addon-fit
pnpm add socket.io-client zustand @tanstack/react-query
pnpm add react-arborist framer-motion recharts react-diff-viewer
pnpm add react-markdown remark-gfm axios
pnpm add @stripe/stripe-js
```

**Backend (api)**:
```bash
pnpm add express @clerk/express socket.io bullmq
pnpm add @prisma/client zod axios stripe resend
pnpm add @aws-sdk/client-s3 @e2b/code-interpreter
pnpm add ioredis winston helmet cors express-rate-limit
pnpm add -D typescript @types/express prisma
```

**Orchestrator (Python)**:
```bash
pip install fastapi uvicorn openai langgraph
pip install e2b-code-interpreter redis bullmq
pip install qdrant-client sentence-transformers
pip install asyncpg sqlalchemy pydantic python-dotenv
pip install bandit semgrep
```

---

## QUICK START (Development)

```bash
# 1. Clone and install
git clone https://github.com/yourname/swarmdev
cd swarmdev
pnpm install

# 2. Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/orchestrator/.env.example apps/orchestrator/.env

# 3. Start infrastructure
docker-compose up -d  # PostgreSQL + Redis + Qdrant

# 4. Set up database
cd packages/db
npx prisma migrate dev
npx prisma db seed

# 5. Start all services
pnpm dev  # Turborepo starts all apps in parallel

# Services will run at:
# Frontend:     http://localhost:3000
# API:          http://localhost:3001
# Orchestrator: http://localhost:8000
```

---

*Document Version: 1.0.0 | Last Updated: May 2026*
*This blueprint is the single source of truth for the SwarmDev platform.*
*Every agent session should start by reading this document.*
