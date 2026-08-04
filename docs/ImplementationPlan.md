# SwarmDev — Implementation Plan

> **Version:** 1.0  
> **Last updated:** 2026-06-13  
> **Owner:** SwarmDev Core Team  
> **Status:** Active

---

## 1. Purpose

This document breaks SwarmDev into phased milestones with clear deliverables, dependencies, and acceptance criteria. It is the roadmap for taking the platform from its current state to production-ready v1.0.

---

## 2. Current State Summary

The repository has a working foundation:
- ✅ Next.js frontend with landing page, dashboard, and project editor
- ✅ Express API with Clerk auth, plan enforcement, and Socket.io
- ✅ Python orchestrator with 9-agent LangGraph DAG
- ✅ Prisma schema + PostgreSQL persistence
- ✅ Redis pub/sub event bridge
- ✅ Docker Compose local dev stack
- ✅ Terraform + K8s staging infrastructure
- ✅ GitHub Actions CI/CD pipeline

**Gaps before v1.0:**
- E2B sandbox integration is stubbed (terminal shows warning)
- No OpenAI/Anthropic fallback for LLM
- Production K8s overlay incomplete
- No Playwright E2E tests
- RAG chat retrieval basic (last 10 messages only)

---

## 3. Phases

### Phase 0 — Foundation Hardening (Week 1–2)

**Goal:** Stabilize the existing codebase; fix known issues; establish test baseline.

| Task | Owner | Deliverable | Acceptance Criteria |
|------|-------|-------------|-------------------|
| Fix `updatedAt` fields | Backend | Migration + schema update | All models use `@updatedAt` where appropriate |
| Add unique constraint `(projectId, path)` on ProjectFile | Backend | Migration | Duplicate file paths rejected at DB level |
| Fix dev server health check | DevOps | `scripts/health-check.sh` update | Detects "200 OK but text/html" CSS bug reliably |
| Add API integration tests | Backend | Jest + Testcontainers | Auth, plan enforcement, project CRUD covered |
| Add orchestrator unit tests | Orchestrator | pytest | Agent parsing, state transitions, emit_event |
| Security audit fixes | Security | PR + scan pass | Zero critical CVEs in Trivy + npm audit |

**Milestone gate:** CI pipeline passes fully (lint, test, security, build).

---

### Phase 1 — Real-Time & Editor (Week 3–4)

**Goal:** Make the project editor fully functional for observing and interacting with agent output.

| Task | Owner | Deliverable | Acceptance Criteria |
|------|-------|-------------|-------------------|
| FileTree live updates | Frontend | React state sync | New files appear within 1s of `file_created` event |
| Monaco editor theming | Frontend | Custom "SwarmDev Dark" theme | Matches Design.md tokens; syntax highlighting correct for TS/Prisma/Docker |
| Terminal streaming | Frontend | Styled terminal panel | ANSI color codes render correctly; auto-scroll |
| Chat @mention routing | Full-stack | End-to-end flow | `@frontend` message routes to Frontend agent; response appears in chat |
| Agent status bar | Frontend | Header component | All 9 agents show correct state; pulse animation for RUNNING |
| File version history | Backend | `version` increment | PATCH /files updates version; optimistic UI in editor |

**Milestone gate:** A user can create a project, watch agents run, chat with `@frontend`, and see files populate in real time.

---

### Phase 2 — Orchestrator Reliability (Week 5–6)

**Goal:** Increase DAG completion rate from ~60% to 90%.

| Task | Owner | Deliverable | Acceptance Criteria |
|------|-------|-------------|-------------------|
| LLM timeout & retry | Orchestrator | `call_llm` wrapper | 3 retries with exponential backoff; max 60s per call |
| Partial output save | Orchestrator | State checkpointing | If DAG fails, all files generated so far are persisted |
| Agent error recovery | Orchestrator | Retry failed agent | User can click "Retry {agent}" from dashboard; re-runs single agent |
| Model fallback chain | Orchestrator | Config | If Ollama model unavailable, fallback to next model in list |
| Prompt optimization | Orchestrator | System prompt v2 | Shorter prompts, clearer file delimiters, reduced token usage |
| DAG visualization API | Backend | `/projects/:id/status` | Returns current DAG state + per-agent progress % |

**Milestone gate:** 10 consecutive test projects complete successfully with all 9 agents.

---

### Phase 3 — Billing & Plans (Week 7)

**Goal:** Make subscription tiers enforceable and revenue-ready.

| Task | Owner | Deliverable | Acceptance Criteria |
|------|-------|-------------|-------------------|
| Stripe Checkout integration | Backend | `/billing/checkout` | Redirects to Stripe; handles success/cancel URLs |
| Stripe Customer Portal | Backend | `/billing/portal` | Users manage payment methods + cancel subscriptions |
| Webhook handlers | Backend | `/billing/webhook` | Handles `invoice.paid`, `subscription.updated`, `customer.subscription.deleted` |
| Plan enforcement middleware | Backend | `planCheckMiddleware` v2 | Returns 402 with clear message; shows upgrade CTA in frontend |
| Usage dashboard | Frontend | `/settings/billing` | Shows token usage bar chart, project count, next billing date |
| FREE tier UX | Frontend | Soft gates | At 3 projects, show "Upgrade" instead of hard error; at 100K tokens, throttle |

**Milestone gate:** A FREE user hits a limit and successfully upgrades to PRO via Stripe.

---

### Phase 4 — Preview & Export (Week 8–9)

**Goal:** Users can see and share their generated application.

| Task | Owner | Deliverable | Acceptance Criteria |
|------|-------|-------------|-------------------|
| E2B sandbox integration | Full-stack | `sandboxService.ts` + Python worker | Generated code runs in isolated sandbox; terminal commands execute |
| Live preview iframe | Frontend | Preview tab in Terminal | Loads sandbox URL; handles sandbox lifecycle (start/stop/restart) |
| GitHub export | Backend | `/projects/:id/export/github` | Creates repo, pushes files, returns repo URL |
| Deploy to Render | Backend | `/projects/:id/deploy` | Creates Blueprint from Dockerfile; returns deploy URL |
| Build pipeline | Orchestrator | Post-DAG build step | Runs `npm install` + `npm run build` in sandbox; reports errors |

**Milestone gate:** A generated project builds successfully in E2B and shows a working preview.

---

### Phase 5 — Production Readiness (Week 10)

**Goal:** Infrastructure and observability ready for public launch.

| Task | Owner | Deliverable | Acceptance Criteria |
|------|-------|-------------|-------------------|
| Production K8s overlay | DevOps | `infra/k8s/overlays/production/` | Multi-AZ RDS, ElastiCache, 3+ replicas, PDB |
| Auto-scaling tuning | DevOps | HPA + Cluster Autoscaler | API scales 2–10 pods based on CPU; orchestrator scales 1–5 |
| Monitoring stack | DevOps | CloudWatch dashboards + alarms | Latency, error rate, token usage visible in single dashboard |
| Sentry integration | Full-stack | Error tracking | Frontend + API + Orchestrator exceptions captured with context |
| Rate limiting prod tuning | Backend | Adjust limits | API 100 req/15min holds under load test; no false positives |
| Database backup strategy | DevOps | RDS automated + manual | 7-day automated; daily snapshot to S3; documented restore procedure |
| Load testing | QA | k6 scripts | 100 concurrent users creating projects; 95th percentile < 5s |
| Documentation | Docs | User guide + API docs | Public docs site or README sufficient for self-service onboarding |

**Milestone gate:** Staging environment passes load test; production overlay applied successfully; team can deploy in < 15 minutes.

---

## 4. Dependency Graph

```
Phase 0 (Foundation)
    │
    ├──► Phase 1 (Real-Time & Editor)
    │       │
    │       ├──► Phase 2 (Orchestrator Reliability)
    │       │       │
    │       │       ├──► Phase 3 (Billing)
    │       │       │       │
    │       │       │       ├──► Phase 4 (Preview & Export)
    │       │       │       │       │
    │       │       │       │       └──► Phase 5 (Production)
    │       │       │       │
    │       │       └─────────┘ (Billing can parallel with Reliability if API layer ready)
    │       │
    │       └──► Phase 4 can start early if E2B sandbox is ready before Billing
    │
    └──► Phase 5 depends on ALL prior phases
```

**Parallel workstreams:**
- **Frontend** can work on UI components (Design.md) independently once API contracts are stable.
- **DevOps** can prepare production infrastructure in parallel with Phase 2–3.
- **Docs** should be written alongside each phase, not at the end.

---

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Ollama LLM unreliable (hallucinates, fails) | High | High | Implement model fallback; add retry logic; consider OpenAI fallback integration |
| E2B sandbox latency too high | Medium | High | Benchmark early (Phase 4); cache dependencies; use persistent sandboxes |
| Stripe webhook failures | Low | High | Idempotent webhook handlers; retry with exponential backoff; monitoring alerts |
| PostgreSQL performance under load | Medium | Medium | Connection pooling (PgBouncer); read replicas for dashboard queries; index review |
| K8s complexity delays launch | Medium | Medium | Have Docker Compose fallback for small deployments; use managed services (RDS, ElastiCache) |
| Clerk billing sync issues | Low | Medium | Webhook reconciliation job; manual admin dashboard for support |

---

## 6. Definition of Done (v1.0)

- [ ] A new user can sign up, describe a project, and receive a complete full-stack app in < 30 minutes
- [ ] The user can chat with agents to refine the generated code
- [ ] The user can preview the running app in a sandbox
- [ ] The user can export the code to GitHub
- [ ] Subscription tiers are enforced and billing works end-to-end
- [ ] CI/CD deploys to staging automatically; production requires one manual approval
- [ ] Monitoring dashboards show system health; alerts fire on anomalies
- [ ] Security scan passes with zero critical findings
- [ ] Load test confirms 100 concurrent users without degradation
- [ ] Documentation allows self-service onboarding without engineering support

---

*End of ImplementationPlan.md*
