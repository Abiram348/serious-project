# SwarmDev — Progress Tracker

> **Version:** 1.0  
> **Last updated:** 2026-06-13  
> **Owner:** SwarmDev Core Team  
> **Status:** Active

---

## 1. Purpose

This is a living checklist of features, infrastructure, and milestones. Update it as work completes. Each item has a status: `🔲 Not Started`, `🟡 In Progress`, `✅ Complete`, or `⏸️ Blocked`.

---

## 2. Foundation (Phase 0)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 0.1 | Fix `updatedAt` to use `@updatedAt` in Prisma schema | 🔲 | Backend | Affects User, Project, ProjectFile |
| 0.2 | Add `@@unique([projectId, path])` to ProjectFile | 🔲 | Backend | Prevent duplicate file paths |
| 0.3 | Fix `scripts/health-check.sh` CSS 404 detection | ✅ | DevOps | Already working per CLAUDE.md |
| 0.4 | Add API integration tests (Jest + Supertest) | 🟡 | Backend | Auth + projects routes started |
| 0.5 | Add orchestrator unit tests (pytest) | 🔲 | Orchestrator | Agent parsing + state transitions |
| 0.6 | Security audit: Trivy + npm audit + bandit | 🟡 | Security | CI runs scans; fix outstanding CVEs |
| 0.7 | Document all env vars in `.env.example` files | ✅ | DevOps | All 3 apps have examples |
| 0.8 | Standardize error response format across API | 🔲 | Backend | `{ error: string, code: string, details? }` |

---

## 3. Real-Time & Editor (Phase 1)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 1.1 | FileTree live updates from Socket.io | ✅ | Frontend | Works via `useSocket` + `projectStore` |
| 1.2 | Monaco editor custom dark theme | 🟡 | Frontend | Partial; needs full token mapping |
| 1.3 | Terminal panel with ANSI colors | ✅ | Frontend | `Terminal.tsx` component exists |
| 1.4 | Chat @mention autocomplete | 🔲 | Frontend | Need dropdown with agent colors |
| 1.5 | Chat message routing to orchestrator | ✅ | Full-stack | `ChatRouter` in orchestrator handles `@mention` |
| 1.6 | Agent status bar in header | 🟡 | Frontend | Dots visible; needs pulse animation |
| 1.7 | File version increment on user edit | 🔲 | Backend | PATCH `/files/:path` doesn't increment yet |
| 1.8 | Optimistic UI for chat send | 🔲 | Frontend | Currently waits for server echo |
| 1.9 | Resizable panels (react-resizable-panels) | 🔲 | Frontend | Layout is static currently |
| 1.10 | Empty state for dashboard | ✅ | Frontend | Has CTA + demo video placeholder |

---

## 4. Orchestrator Reliability (Phase 2)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 2.1 | LLM timeout & retry (3x, exponential backoff) | 🔲 | Orchestrator | `call_llm` needs wrapper |
| 2.2 | Partial output save on DAG failure | ✅ | Orchestrator | Events emit as agents run; files saved immediately |
| 2.3 | Single-agent retry from dashboard | 🔲 | Full-stack | Need API endpoint + UI button |
| 2.4 | Model fallback chain | 🔲 | Orchestrator | If codellama down, try mistral-small |
| 2.5 | Prompt optimization (v2 system prompts) | 🟡 | Orchestrator | Shorter prompts in progress |
| 2.6 | DAG status API endpoint | 🔲 | Backend | `/projects/:id/status` returns agent states |
| 2.7 | Agent execution timeouts (30 min max) | ✅ | Orchestrator | DAG has built-in timeout |
| 2.8 | Token usage tracking per agent run | 🟡 | Orchestrator | `tokenUsed` field exists; not always populated |

---

## 5. Billing & Plans (Phase 3)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 3.1 | Stripe Checkout session creation | 🔲 | Backend | `/billing/checkout` stub exists |
| 3.2 | Stripe Customer Portal | 🔲 | Backend | `/billing/portal` stub exists |
| 3.3 | Webhook handlers (invoice.paid, sub.updated) | 🔲 | Backend | Route exists; logic incomplete |
| 3.4 | Plan enforcement middleware v2 | ✅ | Backend | `planCheckMiddleware` active |
| 3.5 | Usage dashboard UI | 🔲 | Frontend | Settings page has placeholder |
| 3.6 | FREE tier soft gates (upgrade CTA) | 🟡 | Frontend | Modal shown at limit; needs polish |
| 3.7 | Subscription table sync with Stripe | 🔲 | Backend | Webhook should upsert Subscription |
| 3.8 | Cancel subscription flow | 🔲 | Backend | Revert to FREE at period end |

---

## 6. Preview & Export (Phase 4)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 4.1 | E2B sandbox integration | 🔲 | Full-stack | Terminal shows "requires E2B" warning |
| 4.2 | Sandbox lifecycle API (start/stop/restart) | 🔲 | Backend | Needs `/projects/:id/sandbox/*` routes |
| 4.3 | Live preview iframe | 🔲 | Frontend | Preview tab exists; loads nothing |
| 4.4 | Post-DAG build step (npm run build) | 🔲 | Orchestrator | Run in sandbox after documentation agent |
| 4.5 | GitHub export (create repo + push) | 🔲 | Backend | Needs GitHub App integration |
| 4.6 | Deploy to Render/Vercel | 🔲 | Backend | Blueprint generation |
| 4.7 | Build logs persistence | ✅ | Backend | `BuildLog` model + routes exist |

---

## 7. Production Readiness (Phase 5)

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 5.1 | Production K8s overlay | 🔲 | DevOps | Directory exists; not configured |
| 5.2 | HPA + Cluster Autoscaler tuning | 🔲 | DevOps | Base manifests exist |
| 5.3 | CloudWatch dashboards | 🔲 | DevOps | Log groups exist; no custom dashboards |
| 5.4 | CloudWatch alarms (CPU, RDS storage) | ✅ | DevOps | Terraform creates 2 alarms |
| 5.5 | Sentry integration | 🔲 | Full-stack | Not started |
| 5.6 | Rate limiting production tuning | 🟡 | Backend | Limits set; not load-tested |
| 5.7 | RDS backup + restore docs | 🔲 | DevOps | Automated backups enabled |
| 5.8 | Load testing (k6) | 🔲 | QA | Scripts not written |
| 5.9 | Playwright E2E tests | 🔲 | Frontend | Not started |
| 5.10 | Public documentation site | 🔲 | Docs | README + present.md only |
| 5.11 | GDPR / privacy policy | 🔲 | Legal | Not started |
| 5.12 | Terms of service | 🔲 | Legal | Not started |

---

## 8. Nice-to-Have / Post-v1.0

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 9.1 | OpenAI/Anthropic API fallback | 🔲 | Orchestrator | Reduce Ollama dependency |
| 9.2 | Qdrant RAG for chat context | 🟡 | Orchestrator | Files indexed; retrieval basic |
| 9.3 | Multi-language backend (Go, Python) | 🔲 | Orchestrator | Expand tech stack options |
| 9.4 | Collaborative editing | 🔲 | Frontend | Multiple users in same project |
| 9.5 | Mobile app (React Native) | 🔲 | Frontend | Dashboard view only |
| 9.6 | Custom agent creation | 🔲 | Orchestrator | User-defined agents |
| 9.7 | Fine-tuned per-user models | 🔲 | Orchestrator | Requires training pipeline |
| 9.8 | Public API (API keys) | 🔲 | Backend | For integrations |

---

## 9. Recent Completions

- **2026-06-09** — Fixed ECR multi-tag push in CI (`e283cde`, `a8a9810`, `cbce496`)
- **2026-06-09** — Fixed API Dockerfile Prisma global install (`311f65b`)
- **2026-06-09** — Removed non-existent CronJob migration from deploy (`49caeef`)
- **2026-06-12** — Updated present.md and ARCHITECTURE.md to reflect current state

---

## 10. How to Update This Tracker

1. After completing a task, change its status to `✅` and add the completion date to Notes.
2. If a task becomes `⏸️ Blocked`, note the blocker and linking issue/PR.
3. Add new tasks to the appropriate phase; if unsure, use "Nice-to-Have".
4. Review this file in weekly standup.

---

*End of Tracker.md*
