# SwarmDev — Application Flow

> **Version:** 1.0  
> **Last updated:** 2026-06-13  
> **Owner:** SwarmDev Core Team  
> **Status:** Active

---

## 1. Purpose

This document maps every user journey, screen transition, and state change in SwarmDev. It is the reference for frontend routing, state machine design, and user-experience validation.

---

## 2. User Journeys

### 2.1 Journey A: First-Time User → Generated Project

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Landing   │────►│    Auth     │────►│  Dashboard  │────►│   Editor    │
│   Page (/)  │     │  (/auth/*)  │     │ (/dashboard)│     │(/project/id)│
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     │                                        │                   │
     │ 1. Reads hero copy                     │ 3. Sees empty     │ 5. Watches
     │ 2. Types prompt in hero input            │    state or list  │    agent DAG
     │    → clicks "Start Building"             │ 4. Clicks         │    in real time
     │    → redirected to /auth/login           │    "New Project"  │ 6. Chat with
     │      with ?redirect_url=/dashboard/new   │    → modal opens  │    @frontend
     │                                        │                   │ 7. Edits files
     │                                        │                   │ 8. Previews app
```

**Touchpoints:**
- Landing page SEO + social proof (GitHub stars, testimonials)
- Auth wall is soft: unauthenticated users see sign-in modal, not a 404
- Dashboard empty state has a demo video + quick-start template cards
- New-project modal: prompt textarea + tech-stack chips

### 2.2 Journey B: Returning User → Continues Existing Project

```
Landing (/) ──► Auth (if session expired) ──► Dashboard ──► Editor
                                                  │
                                                  ▼
                                            Project card click
                                                  │
                                                  ▼
                                            Editor loads:
                                            - FileTree from DB
                                            - Chat history (last 50)
                                            - Terminal (empty)
                                            - Agent status (resume from last state)
```

### 2.3 Journey C: Upgrade Flow

```
Dashboard ──► "Upgrade" badge on project card (FREE limit hit)
                  │
                  ▼
            Modal: "You've used 3/3 projects. Upgrade to PRO?"
                  │
                  ▼
            Stripe Checkout ──► Success page ──► Webhook updates plan
                  │
                  ▼
            Dashboard refreshes ──► limit badge disappears
```

### 2.4 Journey D: Chat with Agent

```
Editor (chat panel)
  │
  ▼
User types: "@frontend Make the navbar sticky"
  │
  ▼
Frontend sends: Socket.io "send_message" event
  │
  ▼
API saves ChatMessage (role=USER, targetAgent=FRONTEND)
  │
  ▼
API POST /chat ──► Orchestrator ChatRouter
  │
  ▼
ChatRouter:
  1. Parses @mention ──► targetAgent = FRONTEND
  2. Loads model preference (e.g., codellama)
  3. Loads last 10 ChatMessages for context
  4. Calls Ollama with agent system prompt + user message
  5. Receives response (may include file edits)
  │
  ▼
API broadcasts: Socket.io "chat_message" (role=AGENT, agentType=FRONTEND)
  │
  ▼
Browser: Appends message to chat panel; if file edits included, updates FileTree
```

---

## 3. Screen Flow Diagram

```
                         ┌─────────────────┐
                         │   Landing (/)   │
                         │  (public route)   │
                         └────────┬────────┘
                                  │ "Start Building" (unauth)
                                  ▼
                         ┌─────────────────┐
                         │  Auth (/auth/*) │
                         │  (public route) │
                         └────────┬────────┘
                                  │ success
                                  ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                      Dashboard (/dashboard)                  │
    │                    (protected route)                        │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
    │  │ Project Grid│  │ Empty State │  │ New Project Modal     ││
    │  │ (cards)     │  │ (video+CTA) │  │ prompt + tech stack   ││
    │  └──────┬──────┘  └─────────────┘  └─────────────────────┘│
    │         │ click card
    │         ▼
    │  ┌─────────────────────────────────────────────────────────┐│
    │  │              Project Editor (/project/[id])              ││
    │  │              (protected route)                          ││
    │  │  ┌────────┐  ┌────────────┐  ┌──────────┐  ┌────────┐ ││
    │  │  │FileTree│  │Monaco Editor│  │ Terminal │  │  Chat  │ ││
    │  │  │(left)  │  │  (center)   │  │(bottom)  │  │(right) │ ││
    │  │  └────────┘  └────────────┘  └──────────┘  └────────┘ ││
    │  │         ▲                    ▲            ▲         ││
    │  │         │                    │            │         ││
    │  │    Socket.io  ◄────────────  Redis  ◄─── Orchestrator││
    │  └─────────────────────────────────────────────────────────┘│
    └─────────────────────────────────────────────────────────────┘
                                  │
                                  │ Settings gear
                                  ▼
                         ┌─────────────────┐
                         │ Settings (/settings)
                         │  (protected route)
                         │  - Profile (Clerk)
                         │  - Plan & Billing (Stripe)
                         │  - API keys (future)
                         └─────────────────┘
```

---

## 4. State Machines

### 4.1 Project Lifecycle

```
           ┌──────────┐
           │  PENDING │◄────────────────────────┐
           └────┬─────┘                         │
                │ POST /projects                │
                ▼                               │
           ┌──────────┐    agent error /      │
    ┌─────►│ PLANNING │    timeout (30 min)     │
    │      └────┬─────┘                         │
    │           │ supervisor completes          │
    │           ▼                               │
    │      ┌──────────┐                         │
    │      │IN_PROGRESS│◄─────────────────────┤
    │      └────┬─────┘    user restarts      │
    │           │ all agents complete           │
    │           ▼                               │
    │      ┌──────────┐                         │
    │      │ REVIEWING│                         │
    │      └────┬─────┘                         │
    │           │ user approves / auto-approve  │
    │           ▼                               │
    │      ┌──────────┐                         │
    └──────┤COMPLETED │                         │
           └────┬─────┘                         │
                │ user archives                 │
                ▼                               │
           ┌──────────┐                         │
           │ ARCHIVED │─────────────────────────┘
           └──────────┘

           ┌──────────┐
           │  FAILED  │◄────────────────────────┐
           └──────────┘    user retries         │
```

**Transitions triggered by:**
- API (`PATCH /projects/:id`) for user actions
- Orchestrator events (`project_status`) for agent-driven transitions

### 4.2 Agent Status (per project)

```
┌──────┐    start      ┌────────┐    complete   ┌──────────┐
│ IDLE │──────────────►│ RUNNING│─────────────►│COMPLETED │
└──────┘               └────┬───┘              └──────────┘
                            │
                            │ error / timeout
                            ▼
                         ┌────────┐
                         │ FAILED │
                         └────────┘
```

**Note:** `PENDING` is a project-level status, not agent-level. Agents start at `IDLE`.

### 4.3 Socket.io Connection

```
Browser loads /project/[id]
         │
         ▼
    ┌─────────┐
    │CONNECTING│
    └────┬────┘
         │ handshake success
         ▼
    ┌─────────┐     emit "join_project" with projectId
    │ CONNECTED│─────────────────────────────────────►
    └────┬────┘
         │
    ┌────┴────┐
    │RECEIVING│◄──── events: agent_status, file_created, chat_message, ...
    └────┬────┘
         │ network error / idle timeout
         ▼
    ┌─────────┐
    │DISCONNECTED│
    └────┬────┘
         │ exponential backoff retry
         ▼
    ┌─────────┐
    │RECONNECTING│
    └─────────┘
```

---

## 5. Route Definitions (Next.js App Router)

| Route | Segment Config | Data Fetching | Guards |
|-------|---------------|---------------|--------|
| `/` | `dynamic = 'force-static'` | None | Public |
| `/auth/login` | `dynamic = 'force-static'` | None | Public; redirects authed users to `/dashboard` |
| `/auth/register` | `dynamic = 'force-static'` | None | Public |
| `/dashboard` | `dynamic = 'force-dynamic'` | `getProjects()` server action | Protected (Clerk middleware) |
| `/dashboard/new` | `dynamic = 'force-dynamic'` | None | Protected; shows New Project Modal on load |
| `/project/[id]` | `dynamic = 'force-dynamic'` | `getProject(id)` + `getFiles(id)` | Protected; 404 if not user's project |
| `/settings` | `dynamic = 'force-dynamic'` | `getUser()` | Protected |
| `/api/webhooks/clerk` | `dynamic = 'force-dynamic'` | N/A | Public; validates Clerk signature |
| `/api/webhooks/stripe` | `dynamic = 'force-dynamic'` | N/A | Public; validates Stripe signature |

---

## 6. Component Hierarchy (Editor Page)

```
ProjectPage (/project/[id]/page.tsx)
  │
  ├── AppHeader
  │     ├── ProjectBreadcrumb
  │     ├── AgentStatusBar (supervisor, backend, database, devops, frontend, qa, reviewer, security, docs)
  │     └── UserMenu (Clerk)
  │
  ├── ResizablePanels (react-resizable-panels)
  │     ├── LeftPanel (width: 250px)
  │     │     └── FileTree
  │     │           ├── Folder (recursive)
  │     │           └── File (click → open in editor)
  │     │
  │     ├── CenterPanel (flex: 1)
  │     │     └── MonacoEditor
  │     │           ├── Tabs (open files)
  │     │           ├── Breadcrumbs (path)
  │     │           └── StatusBar (line/col, language)
  │     │
  │     ├── RightPanel (width: 320px)
  │     │     └── ChatPanel
  │     │           ├── ChatHeader (project name, close toggle)
  │     │           ├── ChatMessageList (virtualized)
  │     │           │     ├── UserMessage
  │     │           │     └── AgentMessage (avatar + model badge)
  │     │           └── ChatInput (textarea + send button + @mention autocomplete)
  │     │
  │     └── BottomPanel (height: 200px, collapsible)
  │           └── Terminal
  │                 ├── TerminalTabs (Terminal, Build, Preview)
  │                 └── XTerm.js instance (or styled div for streamed text)
  │
  └── SocketConnectionManager (invisible, handles join_project + reconnect)
```

---

## 7. API ↔ Frontend Data Sync

### 7.1 Initial Load

1. **Server component** (`page.tsx`) fetches project + files via `apiClient` (Clerk JWT injected server-side).
2. **Hydration** — React state initialized with server data.
3. **Socket.io connects** and emits `join_project`.
4. **Any events received during SSR gap** are buffered by Socket.io client and applied after hydration.

### 7.2 Real-Time Updates

| Event | Frontend Action |
|-------|----------------|
| `file_created` | Insert into FileTree; auto-open if first file |
| `file_updated` | Update editor content if file is open; show dot indicator in tab |
| `agent_status` | Update AgentStatusBar badge; play sound if completed |
| `agent_log` | Append to Terminal panel (color by level) |
| `chat_message` | Append to ChatPanel; scroll to bottom |
| `project_status` | Update header badge; if COMPLETED, enable file editing |
| `terminal_output` | Stream to Terminal panel |
| `preview_ready` | Switch Terminal tab to Preview; load iframe |

### 7.3 Optimistic UI

| Action | Optimistic Update | Rollback Condition |
|--------|-------------------|-------------------|
| Send chat message | Append user message immediately | Socket error + toast |
| Edit file | Update Monaco model immediately | API 403 (plan limit) |
| Delete project | Remove card from dashboard | API error + re-fetch |

---

## 8. Error Flows

### 8.1 Authentication Errors

```
401 from API
  │
  ▼
Frontend intercepts (in api.ts)
  │
  ▼
If token expired ──► Clerk refresh token silently
  │
  ▼
If refresh fails ──► Redirect to /auth/login?redirect_url=<current>
```

### 8.2 Plan Limit Errors

```
402 from API (planCheckMiddleware)
  │
  ▼
Frontend shows upgrade modal
  │
  ▼
User clicks upgrade ──► Stripe Checkout
```

### 8.3 Agent Failure

```
agent_status = FAILED
  │
  ▼
Frontend:
  1. Red badge on agent
  2. Toast: "{agentType} failed. Retry?"
  3. Log full error to Terminal
  4. Disable dependent agents (e.g., Frontend cannot run if Backend failed)
```

### 8.4 Network Disconnect

```
Socket.io disconnect
  │
  ▼
Frontend:
  1. Show "Reconnecting..." banner (non-blocking)
  2. Exponential backoff (1s, 2s, 4s, 8s, max 30s)
  3. On reconnect: re-emit "join_project"; diff state if needed
```

---

## 9. File Operations Flow

### 9.1 Generated File (Orchestrator → Browser)

```
Orchestrator agent calls emit_event("file_created", {...})
  │
  ▼
Redis PUBLISH swarmdev:events
  │
  ▼
API Socket.io subscriber ──► io.to(`project:${projectId}`).emit("file_created", {...})
  │
  ▼
Browser receives event
  │
  ├─► FileTree: insert node
  ├─► If language matches open editor: update tab dot
  └─► Toast: "{createdBy} created {path}"
```

### 9.2 User Edit (Browser → API → DB)

```
User edits in Monaco + Ctrl+S
  │
  ▼
PATCH /projects/:id/files/:path
  │
  ▼
API:
  1. Verify project belongs to req.user
  2. Update ProjectFile (version += 1)
  3. Queue R2 sync (background)
  4. Return 200
  │
  ▼
Browser: remove tab dot; show "Saved" toast
```

---

*End of AppFlow.md*
