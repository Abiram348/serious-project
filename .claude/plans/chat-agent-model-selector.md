# Plan: Fix Chat + @Agent Routing + Model Selector + Per-Agent Model Assignment

## Problem Summary

The chat system is completely non-functional:
1. REST `POST /chat` has a TODO — no agent is ever invoked
2. Socket.io `send_message` POSTs to orchestrator `/messages` which **does not exist** (404)
3. Redis bridge is never initialized (`redis = null`) — orchestrator events never reach frontend
4. No model selector UI exists
5. All agents use hardcoded env-var model assignments per tier
6. No `@frontend` / `@backend` routing in chat

## Goals

1. **Chat actually works** — user messages get real agent responses
2. **@Agent routing** — typing `@frontend fix the button color` routes directly to FrontendAgent
3. **Model selector in chat** — dropdown to choose which model answers the current message
4. **Per-agent model assignment** — users can assign `backend=gpt-oss`, `frontend=kimi`, etc.
   - Start with **recommended defaults** that users can later override
5. **Redis bridge fixed** — orchestrator real-time events reach the frontend

---

## Phase 1: Database Schema

### Changes to `packages/db/prisma/schema.prisma`

**A. Update `ChatMessage` model:**
- Add `targetAgent String?` — which agent the message was routed to
- Add `model String?` — which LLM model generated the response
- Add `metadata Json?` already exists, will store `model`, `agentType`, etc.

**B. New `ModelPreference` model:**
```prisma
model ModelPreference {
  id          String   @id @default(cuid())
  projectId   String   @unique
  preferences Json     // { "SUPERVISOR": "llama4", "FRONTEND": "kimi", ... }
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@map("model_preferences")
}
```

**Migration:** `prisma migrate dev` + push to Supabase.

---

## Phase 2: Orchestrator — Chat Router + Model Override

### A. `apps/orchestrator/main.py` — Add `/chat` endpoint

New `POST /chat` endpoint that:
1. Receives `{ project_id, content, model?, target_agent? }`
2. Loads conversation history from API DB (via HTTP call)
3. Builds context with last 10 messages
4. If `target_agent` is provided, routes directly to that agent
5. If no `target_agent`, uses SupervisorAgent to determine routing
6. Calls the agent's `call_llm` with conversation context + model override
7. Saves the response back to API DB as a ChatMessage
8. Returns the agent response

### B. `apps/orchestrator/agents/chat_router.py` — NEW

```python
class ChatRouter:
    """Parses user messages for @mentions and routes to the right agent."""

    AGENT_MAP = {
        "supervisor": "SUPERVISOR",
        "frontend": "FRONTEND",
        "backend": "BACKEND",
        "database": "DATABASE",
        "devops": "DEVOPS",
        "qa": "QA",
        "reviewer": "REVIEWER",
        "security": "SECURITY",
        "documentation": "DOCUMENTATION",
    }

    def parse_mention(self, content: str) -> Tuple[str | None, str]:
        """Extract @agent mention and return (agent_name, clean_content)."""
        # Regex: @agent_name or @agent-name
        ...
```

### C. `apps/orchestrator/agents/base.py` — Model override + conversation context

1. `call_llm` already accepts `model=` override — wire it up
2. Add `call_llm_with_history(messages, model=None)` for multi-turn chat
3. Load `ModelPreference` from API before agent runs

### D. `apps/orchestrator/agents/supervisor.py` — Chat replanning

Add `handle_chat_message()` method that:
- Takes a user chat message + project state
- Decides if this is a new task, a refinement, or a question
- Returns routing decision + updated task plan

---

## Phase 3: API — Chat Routes + Model Preferences + Redis Fix

### A. `apps/api/src/routes/chat.ts` — Actually trigger agents

```typescript
// POST /:projectId/chat
// 1. Save user message
// 2. Call orchestrator POST /chat with user message + model prefs
// 3. Wait for response (not fire-and-forget)
// 4. Save agent response to DB
// 5. Emit both messages via Socket.io
// 6. Return both messages
```

### B. `apps/api/src/routes/models.ts` — NEW

```typescript
// GET  /:projectId/models  → return current model preferences
// POST /:projectId/models  → update model preferences
// Default recommended assignment:
// {
//   "SUPERVISOR":  "llama4",
//   "FRONTEND":    "kimi",
//   "BACKEND":     "codellama",
//   "DATABASE":    "codellama",
//   "QA":          "codellama",
//   "REVIEWER":    "llama4",
//   "SECURITY":    "llama4",
//   "DEVOPS":      "mistral-small",
//   "DOCUMENTATION": "mistral-small"
// }
```

### C. `apps/api/src/socket/index.ts` — Fix Redis

```typescript
// Initialize redis client from REDIS_URL env var
import { createClient } from 'redis';
const redis = createClient({ url: process.env.REDIS_URL });
redis.connect().catch(() => { redis = null; });
```

### D. `apps/api/src/index.ts` — Mount model routes

```typescript
import modelRoutes from './routes/models';
app.use('/api/projects', modelRoutes);
```

---

## Phase 4: Web — Refined Chat UI

### A. `apps/web/src/components/chat/ChatWindow.tsx` — Major redesign

**New layout:**
```
┌─────────────────────────────────────────┐
│  💬 Chat with your Agents               │
├─────────────────────────────────────────┤
│                                         │
│  [messages scroll area]                 │
│                                         │
├─────────────────────────────────────────┤
│  🧠 Model: [llama4 ▼]  👤 Agent: [All ▼]│
│  ┌─────────────────────────┬────────┐  │
│  │ Ask anything...         │  Send  │  │
│  └─────────────────────────┴────────┘  │
│  💡 Tip: @frontend to talk to Frontend  │
└─────────────────────────────────────────┘
```

**Features:**
- Model selector dropdown (populated from available models)
- Agent selector dropdown (All, Supervisor, Frontend, Backend, ...)
- @mention auto-complete in input (type `@` → dropdown of agents)
- Typing indicator when waiting for agent
- Message grouping by agent
- "Clear chat" button
- Suggested prompts in empty state

### B. `apps/web/src/components/chat/ChatMessage.tsx` — Add model badge

```tsx
// Show model name as a small badge on agent messages
// e.g., "Frontend (kimi)" or "Supervisor (llama4)"
```

### C. `apps/web/src/components/chat/ModelSelector.tsx` — NEW

Small dropdown component for selecting model. Props:
- `value: string` — current model
- `onChange: (model: string) => void`
- `availableModels: string[]` — list of available models from API

### D. `apps/web/src/components/chat/AgentMention.tsx` — NEW

Auto-complete popup when user types `@` in the chat input.
Shows agent avatars + names. On selection, inserts `@AGENT_NAME `.

### E. `apps/web/src/components/chat/ModelPreferencesPanel.tsx` — NEW

Settings panel (modal or sidebar) showing a table:

| Agent | Recommended | Your Choice |
|-------|-------------|-------------|
| Supervisor | llama4 | [llama4 ▼] |
| Frontend | kimi | [kimi ▼] |
| Backend | codellama | [codellama ▼] |
| ... | ... | ... |

"Reset to Recommended" button. Save updates model preferences in DB.

### F. `apps/web/src/store/chatStore.ts` — Model + agent state

Add to store:
- `selectedModel: string` — currently selected model in chat
- `selectedAgent: string | null` — target agent override
- `availableModels: string[]`
- `modelPreferences: Record<string, string>` — per-agent model map
- `sendMessage(projectId, content, model?, agent?)` — passes model/agent to API

### G. `apps/web/src/store/modelStore.ts` — NEW

Dedicated Zustand store for model preferences:
- `fetchPreferences(projectId)`
- `updatePreferences(projectId, prefs)`
- `resetToDefaults(projectId)`

---

## Phase 5: Model Assignment — Recommended Defaults

Default per-agent model map (stored in API, returned by `GET /models`):

```json
{
  "SUPERVISOR":    "llama4",
  "REVIEWER":      "llama4",
  "SECURITY":      "llama4",
  "FRONTEND":      "kimi",
  "BACKEND":       "codellama",
  "DATABASE":      "codellama",
  "QA":            "codellama",
  "DEVOPS":        "mistral-small",
  "DOCUMENTATION": "mistral-small"
}
```

Reasoning: llama4 for planning/review/security (needs reasoning), kimi for frontend (good at UI/UX code), codellama for backend/database/QA (code generation), mistral-small for devops/docs (template tasks).

---

## Phase 6: Testing & Validation

1. **Schema migration** — `prisma migrate dev` succeeds
2. **Orchestrator** — `/chat` endpoint responds with agent answers
3. **API** — `POST /chat` triggers orchestrator, saves agent response, emits Socket.io
4. **Redis** — orchestrator events reach frontend in real-time
5. **Web** — Chat UI shows model selector, @mentions work, model preferences save
6. **End-to-end** — Type `@frontend make the buttons blue` → FrontendAgent responds via kimi model → response appears in chat with "Frontend (kimi)" badge

---

## File Impact Summary

| Phase | Files | Action |
|-------|-------|--------|
| 1 | `packages/db/prisma/schema.prisma` | Modify + migrate |
| 2a | `apps/orchestrator/main.py` | Add `/chat` endpoint |
| 2b | `apps/orchestrator/agents/chat_router.py` | **Create** |
| 2c | `apps/orchestrator/agents/base.py` | Modify (model override, history) |
| 2d | `apps/orchestrator/agents/supervisor.py` | Add chat handling |
| 3a | `apps/api/src/routes/chat.ts` | Rewrite (call orchestrator) |
| 3b | `apps/api/src/routes/models.ts` | **Create** |
| 3c | `apps/api/src/socket/index.ts` | Fix Redis init |
| 3d | `apps/api/src/index.ts` | Mount routes |
| 4a | `apps/web/src/components/chat/ChatWindow.tsx` | Major redesign |
| 4b | `apps/web/src/components/chat/ChatMessage.tsx` | Add model badge |
| 4c-f | `ModelSelector.tsx`, `AgentMention.tsx`, `ModelPreferencesPanel.tsx` | **Create** |
| 4g | `apps/web/src/store/chatStore.ts` | Add model/agent state |
| 4h | `apps/web/src/store/modelStore.ts` | **Create** |

Total: **~18 files**, mix of creates and significant modifications.
