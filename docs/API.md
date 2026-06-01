# SwarmDev API Documentation

RESTful API for project management, file operations, and real-time collaboration.

## Base URL

```
Development: http://localhost:3001/api
Production: https://api.swarmdev.io/api
```

## Authentication

All endpoints require authentication via Clerk JWT:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Projects

#### `GET /projects`

List all projects for the authenticated user.

**Response:**
```json
[
  {
    "id": "proj_123",
    "userId": "user_456",
    "name": "My App",
    "description": "A sample project",
    "status": "IN_PROGRESS",
    "techStack": { "frontend": "nextjs", "backend": "nodejs" },
    "createdAt": "2026-05-19T10:00:00Z",
    "updatedAt": "2026-05-19T12:00:00Z"
  }
]
```

#### `POST /projects`

Create a new project.

**Request:**
```json
{
  "name": "My App",
  "description": "Build a web application",
  "techStack": {
    "frontend": "nextjs",
    "backend": "nodejs"
  }
}
```

**Response:**
```json
{
  "id": "proj_123",
  "name": "My App",
  "status": "PLANNING"
}
```

#### `GET /projects/:id`

Get project details.

**Response:**
```json
{
  "id": "proj_123",
  "userId": "user_456",
  "name": "My App",
  "description": "A sample project",
  "status": "COMPLETED",
  "techStack": { "frontend": "nextjs", "backend": "nodejs" },
  "files": [...],
  "agentRuns": [...]
}
```

#### `DELETE /projects/:id`

Delete a project and all associated files.

**Response:**
```json
{ "success": true }
```

---

### Files

#### `GET /projects/:id/files`

List all files for a project.

**Response:**
```json
[
  {
    "id": "file_123",
    "projectId": "proj_456",
    "path": "src/app/page.tsx",
    "content": "export default function Home() {...}",
    "language": "typescript",
    "version": 1,
    "createdBy": "FRONTEND",
    "createdAt": "2026-05-19T10:00:00Z"
  }
]
```

#### `GET /projects/:id/files/:path`

Get a specific file by path.

**Response:**
```json
{
  "path": "src/app/page.tsx",
  "content": "export default function Home() {...}",
  "language": "typescript"
}
```

#### `POST /projects/:id/files/:path`

Create or update a file.

**Request:**
```json
{
  "content": "export default function Home() {...}",
  "createdBy": "FRONTEND"
}
```

---

### Chat

#### `GET /projects/:id/chat`

Get chat history for a project.

**Response:**
```json
[
  {
    "id": "msg_123",
    "projectId": "proj_456",
    "role": "USER",
    "content": "Add a dark mode toggle",
    "createdAt": "2026-05-19T10:00:00Z"
  },
  {
    "id": "msg_124",
    "projectId": "proj_456",
    "role": "AGENT",
    "agentType": "FRONTEND",
    "content": "I've added a dark mode toggle to the settings page...",
    "createdAt": "2026-05-19T10:01:00Z"
  }
]
```

#### `POST /projects/:id/chat`

Send a message to the agents.

**Request:**
```json
{
  "content": "Add a dark mode toggle"
}
```

**Response:**
```json
{
  "id": "msg_123",
  "role": "USER",
  "content": "Add a dark mode toggle"
}
```

---

### Agent Runs

#### `GET /projects/:id/agents`

List agent runs for a project.

**Response:**
```json
[
  {
    "id": "run_123",
    "projectId": "proj_456",
    "agentType": "FRONTEND",
    "status": "COMPLETED",
    "input": { "task": "Create homepage" },
    "output": "Generated 5 files",
    "tokensUsed": 15000,
    "createdAt": "2026-05-19T10:00:00Z",
    "completedAt": "2026-05-19T10:05:00Z"
  }
]
```

---

### Billing

#### `GET /billing/subscription`

Get current subscription details.

**Response:**
```json
{
  "plan": "PRO",
  "status": "active",
  "currentPeriodStart": "2026-05-01T00:00:00Z",
  "currentPeriodEnd": "2026-06-01T00:00:00Z",
  "usage": {
    "projects": { "used": 5, "limit": -1 },
    "tokens": { "used": 450000, "limit": 2000000 }
  }
}
```

#### `POST /billing/checkout`

Create a Stripe checkout session.

**Request:**
```json
{
  "planId": "pro-monthly"
}
```

**Response:**
```json
{
  "sessionId": "cs_123",
  "url": "https://checkout.stripe.com/..."
}
```

---

## Socket.io Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_project` | `{ projectId: string }` | Join project room |
| `leave_project` | `{ projectId: string }` | Leave project room |
| `send_message` | `{ projectId, content }` | Send chat message |
| `request_file` | `{ projectId, path }` | Request file content |
| `exec_command` | `{ projectId, command }` | Execute terminal command |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `project_status` | `{ status, message }` | Project status update |
| `agent_status` | `{ agent, status, message }` | Agent status update |
| `file_created` | `{ path, content, createdBy }` | New file created |
| `agent_message` | `{ role, content, timestamp }` | Chat message |
| `terminal_output` | `{ data }` | Terminal output |

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request body",
  "details": ["name is required"]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Project limit reached",
  "limit": 3,
  "upgrade": "/billing/plans"
}
```

### 404 Not Found
```json
{
  "error": "Project not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to create project"
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 100 req | 15 min |
| Auth endpoints | 20 req | 15 min |
| Chat messages | 60 req | 1 min |
| File operations | 100 req | 1 min |
