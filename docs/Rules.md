# SwarmDev — Development Rules

> **Version:** 1.0  
> **Last updated:** 2026-06-13  
> **Owner:** SwarmDev Core Team  
> **Status:** Active

---

## 1. Purpose

This document defines the coding standards, git workflow, review process, and operational rules for contributing to SwarmDev. It applies to all team members and AI assistants working in this repository.

---

## 2. Git Workflow

### 2.1 Branch Strategy

We use **trunk-based development** with short-lived feature branches.

```
main (protected)
  │
  ├── feature/agent-retry-button
  ├── fix/prisma-updatedat
  ├── docs/api-contracts
  └── hotfix/rate-limit-bypass
```

**Rules:**
- `main` is always deployable to staging.
- All changes go through a Pull Request (PR).
- Branch naming: `type/description` where type is `feature`, `fix`, `docs`, `chore`, `hotfix`.
- Keep branches < 3 days old. If a branch lives longer, rebase daily.

### 2.2 Commit Messages

Follow **Conventional Commits**:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation only
- `style` — Formatting, missing semicolons, etc.
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `perf` — Performance improvement
- `test` — Adding or correcting tests
- `chore` — Build process, dependencies, CI/CD

**Scopes:** `web`, `api`, `orchestrator`, `db`, `shared-types`, `infra`, `docs`

**Examples:**
```
feat(api): add sandbox lifecycle endpoints
fix(web): prevent file tree flicker on rapid events
docs(readme): update local development instructions
chore(ci): add Trivy container scan
```

### 2.3 PR Requirements

Before requesting review:
- [ ] CI passes (lint, test, security scan, build)
- [ ] Branch is rebased on latest `main`
- [ ] Description includes: What, Why, How tested
- [ ] Screenshots attached for UI changes
- [ ] Database migrations noted if applicable

**Review rules:**
- At least 1 approval required.
- Address all comments before merge.
- Use "Squash and merge" for feature branches; "Rebase and merge" for long-lived branches if history matters.

---

## 3. Code Standards

### 3.1 TypeScript (Web + API)

| Rule | Enforcement | Exception |
|------|-------------|-----------|
| Strict mode | `tsconfig.json` strict: true | None |
| No `any` | ESLint `@typescript-eslint/no-explicit-any` | Unsafe API boundaries with explicit comment |
| Explicit returns | ESLint | None |
| Prefer `interface` over `type` for objects | Team convention | Union types, tuples use `type` |
| Named exports | Team convention | Page components may use default export for Next.js |
| No console.log in production | ESLint | `console.error` allowed for unexpected errors |

**File naming:**
- Components: `PascalCase.tsx` (e.g., `AgentStatusBar.tsx`)
- Hooks: `camelCase.ts` prefixed with `use` (e.g., `useSocket.ts`)
- Utilities: `camelCase.ts` (e.g., `apiClient.ts`)
- Styles: `kebab-case.module.css` or Tailwind inline
- Tests: `*.test.ts` or `*.spec.ts` co-located or in `__tests__`

### 3.2 Python (Orchestrator)

| Rule | Enforcement | Exception |
|------|-------------|-----------|
| Type hints | `mypy` in CI | None |
| Docstrings | All public functions/classes | Internal helpers optional |
| PEP 8 | `flake8` / `ruff` | Line length 100 (not 80) |
| f-strings | Preferred over `.format()` | None |
| Absolute imports | `from agents.base import BaseAgent` | None |

**File naming:**
- Modules: `snake_case.py`
- Classes: `PascalCase`
- Functions/variables: `snake_case`
- Constants: `UPPER_SNAKE_CASE`

### 3.3 SQL / Prisma

- Schema changes require a migration file.
- Migration names: descriptive, e.g., `add_project_status_index`, not `migration_2024_01_01`.
- Never edit existing migration files after they are merged to `main`.
- Use `@map` and `@@map` for snake_case table/column names.
- Index foreign keys and frequently queried fields.

### 3.4 CSS / Tailwind

- Use Tailwind utility classes for 90% of styling.
- Custom CSS only for:
  - Monaco editor themes
  - Complex animations
  - Scrollbar styling
- Never use arbitrary values (e.g., `w-[123px]`) without design token justification.
- Dark mode: use `dark:` prefix; default to dark for editor, light for landing.

---

## 4. Monorepo Conventions

### 4.1 Package Boundaries

| Package | Can import from | Cannot import from |
|---------|----------------|-------------------|
| `apps/web` | `packages/shared-types`, `packages/ui`, `node_modules` | `apps/api`, `apps/orchestrator` |
| `apps/api` | `packages/shared-types`, `packages/db`, `node_modules` | `apps/web`, `apps/orchestrator` |
| `apps/orchestrator` | `node_modules`, internal modules | `apps/web`, `apps/api`, `packages/*` |
| `packages/shared-types` | `node_modules` | `apps/*`, `packages/db` |
| `packages/db` | `node_modules` | `apps/*`, `packages/shared-types` |
| `packages/ui` | `packages/shared-types`, `node_modules` | `apps/*` |

### 4.2 Dependency Management

- Root `package.json` holds dev dependencies (lint, test, build tools).
- App/package `package.json` holds runtime dependencies.
- Use `pnpm add -w <pkg>` for root; `pnpm add <pkg>` inside app/package directory.
- Pin exact versions for critical dependencies (Prisma, Clerk, Stripe).
- Update dependencies monthly via grouped PR (e.g., `chore(deps): update minor versions`).

### 4.3 Environment Variables

- All env vars must be documented in `.env.example`.
- Never commit `.env` or `.env.local` files.
- In Docker, pass via `--env-file` or K8s secrets; never bake into image.
- Validate required env vars at startup; fail fast with clear message.

---

## 5. API Conventions

### 5.1 REST API

- Base path: `/api` (Next.js) or `/v1` (Express standalone)
- HTTP methods: GET (read), POST (create), PATCH (update), DELETE (remove)
- Status codes:
  - `200` — Success (GET, PATCH)
  - `201` — Created (POST)
  - `204` — No content (DELETE)
  - `400` — Bad request (validation error)
  - `401` — Unauthorized (missing/invalid JWT)
  - `402` — Payment required (plan limit)
  - `403` — Forbidden (wrong user scope)
  - `404` — Not found
  - `409` — Conflict (duplicate, e.g., file path)
  - `429` — Rate limit
  - `500` — Internal server error (log + alert)

### 5.2 Error Response Format

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": { "field": "specific info" }
}
```

Examples:
```json
{ "error": "Project limit reached", "code": "PLAN_PROJECT_LIMIT", "details": { "limit": 3, "current": 3 } }
{ "error": "Invalid tech stack", "code": "VALIDATION_ERROR", "details": { "field": "techStack.frontend" } }
```

### 5.3 Socket.io Events

- Event names: `snake_case`
- Payloads: camelCase JSON objects
- Always include `projectId` and `timestamp` (ISO 8601) in payload
- Emit errors as `error` event with `{ projectId, message, code }`

---

## 6. Testing Rules

### 6.1 Required Coverage

| Layer | Minimum Coverage | What to test |
|-------|-----------------|------------|
| Web components | 60% | Render, user interactions, state changes |
| Web E2E | Critical paths | Auth, create project, chat, file open |
| API routes | 70% | Auth, validation, success + error paths |
| API services | 70% | Business logic, external calls mocked |
| Orchestrator agents | 60% | Parsing, state transitions, LLM mocking |
| Infrastructure | N/A | Terraform validate, checkov scan |

### 6.2 Test Patterns

- Mock external services (Clerk, Stripe, Ollama, Redis) in unit tests.
- Use Testcontainers for API integration tests (real Postgres + Redis).
- Never test against production APIs or databases.
- E2E tests run against local Docker Compose stack.

### 6.3 Writing Tests

**Naming:**
```
describe("ProjectService", () => {
  describe("createProject", () => {
    it("should create a project when under plan limit", () => {});
    it("should throw PLAN_PROJECT_LIMIT when at limit", () => {});
  });
});
```

**Structure:** Arrange → Act → Assert (AAA). One assertion per test unless logically grouped.

---

## 7. Security Rules

### 7.1 Code

- Never hardcode secrets (API keys, passwords, tokens).
- Never log sensitive data (JWTs, `Authorization` headers, Stripe keys).
- Sanitize all user input before rendering (XSS prevention).
- Use parameterized queries (Prisma handles this; no raw SQL without validation).
- Validate file paths to prevent directory traversal (`../etc/passwd`).

### 7.2 Infrastructure

- All public endpoints use TLS 1.3.
- K8s secrets encrypted at rest (KMS).
- AWS credentials via OIDC or IAM roles; no long-lived access keys in Git.
- Container images scanned by Trivy in CI; no critical CVEs in production.

### 7.3 Dependencies

- Review `npm audit` / `pnpm audit` weekly.
- Pin versions for auth, billing, and database libraries.
- Update patch versions automatically; minor/major require review.

---

## 8. Operational Rules

### 8.1 Local Development

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Install dependencies
pnpm install

# 3. Generate Prisma client
cd packages/db && pnpm prisma generate

# 4. Run migrations
cd packages/db && pnpm prisma migrate dev

# 5. Start all apps
pnpm dev
```

**Never** `rm -rf apps/web/.next` while the dev server is running. Use `pnpm clean:safe` instead.

### 8.2 Database Migrations in Production

1. Write migration locally: `pnpm prisma migrate dev --name descriptive_name`
2. Test migration against fresh Docker Postgres.
3. PR includes migration file + schema change.
4. Deploy applies migration as K8s Job before app rollout.
5. If migration fails, deployment stops; rollback via `prisma migrate resolve`.

### 8.3 Incident Response

| Severity | Response Time | Action |
|----------|--------------|--------|
| **P0** — Data loss, security breach, total outage | 15 min | Page on-call; stop deployments; investigate |
| **P1** — Major feature broken, billing failure | 1 hour | Create hotfix branch; bypass non-critical CI if needed |
| **P2** — Degraded performance, non-critical bug | 24 hours | Add to next sprint |
| **P3** — Cosmetic, docs | Next sprint | Standard PR workflow |

---

## 9. AI Assistant Rules (Claude Code)

When working in this repository:

1. **Always check gstack first** — skills like `/qa`, `/ship`, `/review` are required workflows.
2. **Never skip tests** — if you change code, update or add tests.
3. **Never break `main`** — CI must pass before suggesting merge.
4. **Document changes** — update `Tracker.md`, `present.md`, or relevant docs.
5. **Follow existing patterns** — match file naming, indentation, and architecture of surrounding code.
6. **Ask before deleting** — if a file or function looks unused, verify with `git grep` before removing.
7. **Security first** — flag any secret exposure, injection risk, or auth bypass you notice.

---

## 10. Prohibited

- ❌ Force-push to `main`
- ❌ Merge without review (even for "trivial" fixes)
- ❌ Commit `.env` files
- ❌ Use `any` in TypeScript without justification comment
- ❌ Write raw SQL without Prisma where possible
- ❌ Add dependencies without checking bundle size impact
- ❌ Deploy on Friday afternoon (unless P0)
- ❌ Ignore CI failures

---

*End of Rules.md*
