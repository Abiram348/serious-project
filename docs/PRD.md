# SwarmDev — Product Requirements Document

> **Version:** 1.0  
> **Last updated:** 2026-06-13  
> **Owner:** SwarmDev Core Team  
> **Status:** Active / In Development

---

## 1. Vision

SwarmDev is a multi-agent cloud development platform that turns a plain-English project description into a complete, production-ready full-stack web application. Nine specialized AI agents — orchestrated by a LangGraph DAG — collaborate in parallel and sequence to generate frontend code, backend APIs, database schemas, infrastructure configs, tests, documentation, and security audits. The entire process is streamed in real time to an interactive dashboard where users can chat with individual agents, review generated files in a Monaco editor, and preview live builds.

**Elevator pitch:** *"Describe your app. Our AI swarm builds it. You watch, chat, and ship."*

---

## 2. Target Users

| Persona | Role | Pain Point | How SwarmDev Helps |
|---------|------|------------|-------------------|
| **Indie Hacker** | Solo founder | Needs an MVP fast without hiring | Generates full-stack MVP from a prompt in minutes |
| **Product Manager** | Non-coder with ideas | Cannot prototype without engineering | Creates working prototypes to validate concepts |
| **Agency Dev** | Freelance developer | Repetitive boilerplate on every project | Auto-generates scaffolding, tests, and Docker configs |
| **Engineering Lead** | Team lead | Wants to accelerate sprint 0 | Produces architecture, schema, and CI/CD baseline instantly |
| **Learner** | Bootcamp student | Struggles to connect frontend ↔ backend | Shows how real-world full-stack apps are structured |

---

## 3. Core Jobs-to-be-Done

1. **Generate a full-stack project from a natural-language prompt**
2. **Observe agent progress in real time** with file previews, logs, and terminal output
3. **Chat with individual agents** to refine specific parts of the generated code
4. **Edit generated files** in a built-in Monaco editor with syntax highlighting
5. **Preview the running application** inside the platform (planned: E2B sandbox)
6. **Export / deploy** the final codebase to GitHub or a live URL

---

## 4. Feature Requirements

### 4.1 Landing & Onboarding

| ID | Feature | Priority | Acceptance Criteria |
|----|---------|----------|---------------------|
| F-1 | Hero prompt input | P0 | Single text area on `/` accepts project description; character limit 2000; auto-focus on load |
| F-2 | Auth wall | P0 | Unauthenticated users see Clerk `<SignInButton>`; authenticated users see "Start Building" CTA |
| F-3 | Pricing page | P1 | Displays 4 tiers (FREE, PRO $29, TEAM $99, ENTERPRISE custom) with feature comparison |
| F-4 | Stripe checkout | P1 | "Upgrade" buttons redirect to Stripe Checkout / Customer Portal |

### 4.2 Dashboard

| ID | Feature | Priority | Acceptance Criteria |
|----|---------|----------|---------------------|
| F-5 | Project list | P0 | Grid of user projects with status badge, tech stack tags, last updated |
| F-6 | New project modal | P0 | Prompt + tech-stack selector (Next.js, Express, Prisma, etc.) |
| F-7 | Plan gate | P0 | FREE users blocked at 3 projects; modal shows upgrade CTA |
| F-8 | Project delete / archive | P1 | Soft delete with confirmation; archived projects hidden by default |

### 4.3 Project Editor (Real-Time)

| ID | Feature | Priority | Acceptance Criteria |
|----|---------|----------|---------------------|
| F-9 | File tree | P0 | Explorer sidebar showing all `ProjectFile` records; folders collapsible; click opens file |
| F-10 | Monaco editor | P0 | Syntax highlighting by `language` field; read-only during generation, editable after COMPLETED |
| F-11 | Terminal panel | P0 | Displays `terminal_output` Socket.io events; color-coded stdout/stderr |
| F-12 | Chat panel | P0 | `@mention` syntax routes messages to specific agents; loads last 50 `ChatMessage` records |
| F-13 | Agent status bar | P0 | Live badges for each agent (idle / running / completed / failed) |
| F-14 | Preview iframe | P1 | Loads `previewUrl` when `preview_ready` event fires; shows placeholder when stopped |

### 4.4 Agent Orchestration (Backend)

| ID | Feature | Priority | Acceptance Criteria |
|----|---------|----------|---------------------|
| F-15 | 9-agent DAG | P0 | `supervisor → [backend, database, devops] → pre_frontend → frontend → qa → reviewer → security → documentation → index` |
| F-16 | Parallel execution | P0 | Backend, Database, DevOps run simultaneously after Supervisor |
| F-17 | Sequential QA pipeline | P0 | QA → Reviewer → Security → Documentation run in strict order after Frontend |
| F-18 | File persistence | P0 | Every `file_created` / `file_updated` event saves to PostgreSQL `ProjectFile` table |
| F-19 | Socket.io streaming | P0 | Orchestrator → Redis → API → Browser; latency < 500 ms per event |
| F-20 | Model preferences | P1 | Per-project model mapping (e.g., Frontend → `codellama`, Supervisor → `llama4`) |

### 4.5 Billing & Plans

| ID | Feature | Priority | Acceptance Criteria |
|----|---------|----------|---------------------|
| F-21 | Subscription tiers | P0 | FREE (3 projects, 100K tokens), PRO (unlimited, 2M tokens), TEAM (unlimited, 10M + custom roles), ENTERPRISE (custom) |
| F-22 | Token usage tracking | P0 | `UsageLog` records `tokensIn` + `tokensOut` per agent run; monthly reset |
| F-23 | Plan enforcement | P0 | Middleware blocks requests when limits exceeded; returns `402 Payment Required` |
| F-24 | Stripe webhooks | P1 | Handles `invoice.paid`, `subscription.updated`, `customer.subscription.deleted` |

### 4.6 DevOps & Deployment (Planned)

| ID | Feature | Priority | Acceptance Criteria |
|----|---------|----------|---------------------|
| F-25 | E2B sandbox | P2 | Terminal commands execute in isolated sandbox; output streamed via Socket.io |
| F-26 | GitHub export | P2 | One-click push to new GitHub repo with generated files |
| F-27 | Live deploy | P2 | Deploy to Vercel / AWS / Render from generated Dockerfile |

---

## 5. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Project creation API response < 2 s; first agent event visible < 5 s after submit |
| **Reliability** | Agent DAG must complete or fail within 30 min; partial output always saved |
| **Scalability** | API layer horizontally scalable; Redis pub/sub handles 1000 concurrent projects |
| **Security** | All user code execution in E2B sandbox; no raw `eval` of generated code on server |
| **Accessibility** | WCAG 2.1 AA compliance for landing page and dashboard |
| **Browser Support** | Chrome, Safari, Firefox, Edge (last 2 versions) |

---

## 6. Success Metrics

| Metric | Baseline | Target (3 mo) |
|--------|----------|---------------|
| Project creation → first file generated | 30 s | < 10 s |
| Full DAG completion rate | 60% | 90% |
| User retention (7-day) | 20% | 45% |
| FREE → PRO conversion | 2% | 8% |
| Avg. tokens per successful project | 150K | < 100K |

---

## 7. Out of Scope (for v1.0)

- Mobile native app generation (iOS / Android)
- Multi-language backend support beyond Node.js / Python
- Fine-tuned custom models per user
- Collaborative editing (multiple users in same project simultaneously)
- AI-generated UI design from Figma-like canvas

---

## 8. Open Questions

1. Should FREE tier users be able to chat with agents, or is that PRO-only?
2. Do we charge by token usage or flat monthly? Hybrid?
3. Should generated code be MIT-licensed to the user, or do we retain rights?
4. Is E2B sandbox a hard requirement for v1.0 launch, or can we ship without it?

---

*End of PRD.md*
