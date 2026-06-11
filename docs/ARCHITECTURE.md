# SwarmDev Architecture

Multi-agent cloud development platform powered by LangGraph orchestration.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Dashboard│  │  Chat    │  │  Editor  │  │ Settings │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Socket.io + HTTP
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Express)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Auth    │  │ Projects │  │  Files   │  │ Billing  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │
│  │  Redis   │  │ BullMQ   │  │  Plan    │                          │
│  │  Client  │  │  Queue   │  │  Check   │                          │
│  └──────────┘  └──────────┘  └──────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Redis Pub/Sub
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Orchestrator (Python + LangGraph)               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Supervisor Agent                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                    │                    │           │
│    ┌──────┴──────┐      ┌─────┴─────┐      ┌──────┴──────┐    │
│    ▼             ▼      ▼           ▼      ▼             ▼    │
│ ┌──────┐  ┌──────────┐ ┌─────┐ ┌──────┐ ┌──────┐ ┌──────────┐│
│ │Backend│  │Database │ │DevOps│ │Docs │ │Frontend│ │  QA    ││
│ └──────┘  └──────────┘ └─────┘ └──────┘ └──────┘ └──────────┘│
│                                              │        │         │
│                                         ┌────┴────────┴────┐  │
│                                         │   Reviewer       │  │
│                                         │   Security       │  │
│                                         └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Clerk   │  │  Stripe  │  │Cloudflare│  │  Ollama   │      │
│  │  (Auth)  │  │(Billing) │  │   R2     │  │  (LLM)   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Frontend (`apps/web/`)

Next.js 14 application with App Router:

- **Pages**: Dashboard, Project Editor, Chat, Files, Preview, Settings
- **Components**: Reusable UI components with shadcn/ui
- **State**: Zustand stores for chat, projects, files
- **Real-time**: Socket.io client for agent events

### 2. API Layer (`apps/api/`)

Express.js server providing:

- **Authentication**: Clerk middleware + webhooks
- **Project Management**: CRUD operations
- **File Storage**: PostgreSQL + Cloudflare R2 sync
- **Real-time**: Socket.io server
- **Rate Limiting**: Per-endpoint limits
- **Plan Enforcement**: Usage limits by subscription tier

### 3. Orchestrator (`apps/orchestrator/`)

Python + LangGraph multi-agent system:

- **LangGraph**: State machine for agent orchestration
- **9 Specialized Agents**: Each with specific responsibilities
- **Shared State**: Project context passed between agents
- **Inter-agent Communication**: Agents query each other for context

### 4. Database (PostgreSQL + Prisma)

Schema includes:

- **User**: Authentication, plan, usage tracking
- **Project**: Project metadata, status, tech stack
- **ProjectFile**: File storage with versioning
- **AgentRun**: Agent execution history
- **ChatMessage**: Project chat history
- **UsageLog**: Token consumption tracking

### 5. Infrastructure

- **Redis**: Pub/Sub bridge + BullMQ task queue
- **Cloudflare R2**: File storage sync
- **E2B**: Cloud sandbox execution (planned)
- **Qdrant**: Vector database for RAG (planned)

## Agent Pipeline

```
User Request
    │
    ▼
┌─────────────┐
│  Supervisor │ ──→ Creates task plan
└─────────────┘
    │
    ├─────────────┬─────────────┬─────────────┐
    ▼             ▼             ▼             ▼
┌────────┐  ┌──────────┐  ┌────────┐  ┌─────────────┐
│Backend │  │ Database │  │ DevOps │  │Documentation│
└────────┘  └──────────┘  └────────┘  └─────────────┘
    │             │             │             │
    └─────────────┴─────────────┴─────────────┘
                          │
                          ▼
                    ┌──────────┐
                    │ Frontend │ ──→ Uses backend context
                    └──────────┘
                          │
                          ▼
                    ┌────────┐
                    │   QA   │ ──→ Tests all code
                    └────────┘
                          │
                          ▼
                    ┌──────────┐
                    │ Reviewer │ ──→ Code quality check
                    └──────────┘
                          │
                          ▼
                    ┌─────────┐
                    │ Security│ ──→ Security scan
                    └─────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │ Supervisor  │ ──→ Final merge
                    └─────────────┘
                          │
                          ▼
                      Complete
```

## Inter-Agent Communication

Agents share context through LangGraph's shared state:

```python
# BaseAgent provides these methods:
self.get_agent_output(state, "BACKEND")      # Get another agent's output
self.get_files_by_agent(state, "BACKEND")    # Get files by agent
self.query_agent(state, "BACKEND", "APIs")   # Query specific info
self.get_review_feedback(state)              # Get QA/review feedback
```

## Data Flow

1. **User creates project** → API validates plan limits → Creates DB record
2. **API calls orchestrator** → HTTP POST with project context
3. **Orchestrator runs agents** → LangGraph state machine executes pipeline
4. **Agents generate files** → Files saved to state
5. **Files persisted** → API saves to PostgreSQL + R2
6. **Events emitted** → Redis pub/sub → Socket.io → Frontend

## Security Model

- **Authentication**: Clerk JWT validation
- **Authorization**: User-scoped project access
- **Rate Limiting**: Per-endpoint limits
- **Plan Enforcement**: Usage limits checked per request
- **Sandbox Execution**: E2B for untrusted code (planned)

## Scaling Considerations

- **Horizontal**: Multiple API instances behind load balancer
- **Agent Queue**: BullMQ for job distribution
- **Redis Cluster**: Pub/Sub scales with subscribers
- **Database**: PostgreSQL connection pooling via Prisma
