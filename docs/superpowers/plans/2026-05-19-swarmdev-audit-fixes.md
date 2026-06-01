# SwarmDev Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan task-by-task.

**Goal:** Fix all 30 issues found in the codebase audit to make SwarmDev fully functional.

**Architecture:** Fixes organized by severity: Critical (5) → High (7) → Medium (6) → Low (12). Each fix is independent and testable.

**Tech Stack:** TypeScript (API, Frontend), Python (Orchestrator), PostgreSQL (Prisma), Redis, Socket.io

---

## CRITICAL FIXES (Tasks 1-5)

### Task 1: Fix SecurityAgent Hardcoded Paths

**Issue:** SecurityAgent uses hardcoded Mac paths that fail in any other environment.

**Files:**
- Modify: `apps/orchestrator/agents/security.py`

**Steps:**

- [ ] **Step 1: Read current security.py**

```bash
cat apps/orchestrator/agents/security.py
```

- [ ] **Step 2: Replace hardcoded paths with dynamic detection**

```python
# apps/orchestrator/agents/security.py - Line 20, 31, 43

import os
from pathlib import Path

# Get the project root dynamically
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent

# Instead of: cwd="/Users/abiramreddymartala/serious project/apps/web"
# Use:
cwd = str(PROJECT_ROOT / "apps" / "web")

# Instead of: cwd="/Users/abiramreddymartala/serious project/apps/orchestrator"
# Use:
cwd = str(PROJECT_ROOT / "apps" / "orchestrator")

# Instead of: cwd="/Users/abiramreddymartala/serious project"
# Use:
cwd = str(PROJECT_ROOT)
```

- [ ] **Step 3: Test the fix**

```bash
cd apps/orchestrator
python -c "from agents.security import SecurityAgent; print('Import OK')"
```

- [ ] **Step 4: Commit**

```bash
git add apps/orchestrator/agents/security.py
git commit -m "fix: replace hardcoded paths with dynamic project root detection"
```

---

### Task 2: Fix Orchestrator Ignoring project_id

**Issue:** `/projects/{project_id}/agents/start` calls `orchestrator_app.ainvoke({})` with empty dict.

**Files:**
- Modify: `apps/orchestrator/main.py`
- Modify: `apps/api/src/routes/projects.ts`

**Steps:**

- [ ] **Step 1: Read current main.py and projects.ts**

- [ ] **Step 2: Update API to pass project context**

```typescript
// apps/api/src/routes/projects.ts - startAgentPipeline method

async startAgentPipeline(projectId: string, project: any) {
  // Update project status
  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'PLANNING' },
  });

  await emitProjectStatus(projectId, 'PLANNING');

  // Call orchestrator with full context
  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:8000';
  
  const response = await fetch(`${orchestratorUrl}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ORCHESTRATOR_SECRET || ''}`,
    },
    body: JSON.stringify({
      project_id: projectId,
      user_id: project.userId,
      user_prompt: project.description,
      tech_stack: project.techStack,
    }),
  });

  if (!response.ok) {
    throw new Error(`Orchestrator call failed: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`🚀 Agent pipeline started for project ${projectId}:`, result);
}
```

- [ ] **Step 3: Update orchestrator to accept context**

```python
# apps/orchestrator/main.py

class JobInput(BaseModel):
    project_id: str
    user_id: str
    user_prompt: str
    tech_stack: Optional[Dict[str, str]] = None

async def run_orchestration(job_data: Dict[str, Any]):
    """Run the LangGraph orchestration workflow with proper context."""
    try:
        # Initialize state with full project context
        initial_state: ProjectState = {
            "project_id": job_data["project_id"],
            "user_id": job_data["user_id"],
            "user_prompt": job_data["user_prompt"],
            "status": "PLANNING",
            "files": {},
            "task_plan": [],
        }

        # Run the graph with initial state
        result = await langgraph_app.ainvoke(initial_state)

        # Handle result
        if result.get("status") == "FAILED":
            print(f"Orchestration failed: {result.get('error')}")
        else:
            print(f"Orchestration completed for project {job_data['project_id']}")

    except Exception as e:
        print(f"Error in orchestration: {e}")
```

- [ ] **Step 4: Test the integration**

```bash
# Start orchestrator
cd apps/orchestrator && python main.py &

# Test endpoint
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{"project_id": "test-123", "user_id": "user-456", "user_prompt": "Build a todo app"}'
```

- [ ] **Step 5: Commit**

```bash
git add apps/orchestrator/main.py apps/api/src/routes/projects.ts apps/api/src/services/projectService.ts
git commit -m "fix: pass project context to orchestrator instead of empty state"
```

---

### Task 3: Implement API-to-Orchestrator Integration

**Issue:** `startAgentPipeline()` creates DB records but never calls orchestrator.

**Files:**
- Modify: `apps/api/src/services/projectService.ts`

**Steps:**

- [ ] **Step 1: Implement the HTTP call to orchestrator**

```typescript
// apps/api/src/services/projectService.ts

async startAgentPipeline(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { user: true },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Update project status
  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'PLANNING' },
  });

  await emitProjectStatus(projectId, 'PLANNING');

  // Create initial agent run record
  await prisma.agentRun.create({
    data: {
      projectId,
      agentType: 'SUPERVISOR',
      status: 'RUNNING',
      input: { user_prompt: project.description },
    },
  });

  // Call orchestrator HTTP API
  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${orchestratorUrl}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ORCHESTRATOR_SECRET || ''}`,
      },
      body: JSON.stringify({
        project_id: projectId,
        user_id: project.userId,
        user_prompt: project.description || 'Build a web application',
        tech_stack: project.techStack as any,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Orchestrator call failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log(`🚀 Agent pipeline started for project ${projectId}:`, result);

    await emitProjectStatus(projectId, 'IN_PROGRESS');
  } catch (error) {
    console.error('Failed to start orchestrator:', error);
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'FAILED' },
    });
    await emitProjectStatus(projectId, 'FAILED');
    throw error;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/services/projectService.ts
git commit -m "feat: implement HTTP call to orchestrator in startAgentPipeline"
```

---

### Task 4: Create Missing Code Review Agent

**Issue:** No reviewer.py exists. Blueprint specifies QA → Reviewer → Security flow.

**Files:**
- Create: `apps/orchestrator/agents/reviewer.py`
- Modify: `apps/orchestrator/graph/graph.py`
- Modify: `apps/orchestrator/graph/state.py`

**Steps:**

- [ ] **Step 1: Create reviewer agent**

```python
# apps/orchestrator/agents/reviewer.py
"""
Code Review Agent - Reviews all code produced by other agents.
"""

import os
import json
from typing import Dict, Any, List
from anthropic import AsyncAnthropic
from .base import BaseAgent

SYSTEM_PROMPT = """You are the Code Review Agent for SwarmDev.

Your role:
1. Review every file produced by other agents
2. Flag security vulnerabilities
3. Identify logic bugs and edge cases
4. Check for code style consistency
5. Verify API contracts match between frontend and backend
6. Produce a structured review report

Output format:
- List issues found with severity (CRITICAL, HIGH, MEDIUM, LOW)
- Suggest specific fixes for each issue
- Approve files that pass review
"""

class ReviewerAgent(BaseAgent):
    def __init__(self):
        super().__init__("REVIEWER", SYSTEM_PROMPT)
        self.client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        files = state.get("files", {})
        
        if not files:
            state["review_feedback"] = []
            state["review_completed"] = True
            return state

        await self.log(state, "INFO", f"Reviewing {len(files)} files")

        # Build review prompt
        files_content = "\n\n".join([f"FILE: {path}\n{content}" for path, content in files.items()])
        
        review_prompt = f"""
Review the following generated files for:
1. Security vulnerabilities
2. Logic bugs and edge cases
3. Code style issues
4. API contract mismatches
5. Best practices violations

{files_content}

Output your review as JSON:
{{
  "issues": [
    {{"file": "path", "severity": "CRITICAL|HIGH|MEDIUM|LOW", "description": "...", "suggestion": "..."}}
  ],
  "approved_files": ["list of files that pass review"]
}}
"""

        try:
            response = await self.call_llm(review_prompt)
            
            # Parse review results
            review_data = self._parse_review_response(response)
            
            state["review_feedback"] = review_data.get("issues", [])
            state["review_output"] = response
            state["review_completed"] = True

            await self.log(state, "INFO", f"Found {len(review_data.get('issues', []))} issues")

            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "completed",
                "message": f"Review complete: {len(review_data.get('issues', []))} issues found"
            })

        except Exception as e:
            state["status"] = "FAILED"
            state["error"] = str(e)
            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "failed",
                "message": f"Code review failed: {str(e)}"
            })

        return state

    def _parse_review_response(self, response: str) -> Dict[str, Any]:
        """Parse JSON from review response."""
        import re
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except:
            pass
        return {"issues": [], "approved_files": []}
```

- [ ] **Step 2: Add reviewer state to state.py**

```python
# apps/orchestrator/graph/state.py - add to ProjectState

class ProjectState(TypedDict, total=False):
    # ... existing fields ...
    
    # Review agent flags
    review_completed: bool
    review_feedback: List[Dict[str, Any]]
    review_output: str
```

- [ ] **Step 3: Add reviewer node to graph.py**

```python
# apps/orchestrator/graph/graph.py

from agents.reviewer import ReviewerAgent

# Instantiate agent
reviewer = ReviewerAgent()

# Add node
async def reviewer_node(state: ProjectState):
    return await reviewer.run(state)

graph.add_node("reviewer", reviewer_node)

# Update edges: QA → Reviewer → Security
graph.add_edge("qa", "reviewer")
graph.add_edge("reviewer", "security")
```

- [ ] **Step 4: Commit**

```bash
git add apps/orchestrator/agents/reviewer.py apps/orchestrator/graph/state.py apps/orchestrator/graph/graph.py
git commit -m "feat: add Code Review Agent per blueprint specification"
```

---

### Task 5: Implement Agent File Persistence

**Issue:** Agent outputs never saved to database or emitted as Socket.io events.

**Files:**
- Modify: `apps/orchestrator/agents/base.py`
- Modify: `apps/orchestrator/utils/socket_emitter.py`
- Modify: `apps/api/src/socket/index.ts`

**Steps:**

- [ ] **Step 1: Add file persistence to base agent**

```python
# apps/orchestrator/agents/base.py

import httpx
import os

class BaseAgent(ABC):
    # ... existing code ...

    async def persist_files(self, state: Dict[str, Any], files: Dict[str, str], agent_type: str):
        """
        Save generated files to PostgreSQL via API and emit Socket.io events.
        """
        project_id = state.get("project_id")
        if not project_id:
            return

        api_url = os.getenv("ORCHESTRATOR_URL", "http://localhost:8000").replace("/jobs", "")
        api_url = api_url.replace("8000", "3001")  # Use API port
        
        # Actually use the API URL from env
        api_url = os.getenv("API_URL", "http://localhost:3001")

        for path, content in files.items():
            try:
                # Save to database via API
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"{api_url}/api/projects/{project_id}/files/{path}",
                        json={"content": content, "createdBy": agent_type},
                        headers={"Authorization": f"Bearer {os.getenv('API_SECRET', '')}"}
                    )

                # Emit socket event
                await self.emit_event("file_created", {
                    "projectId": project_id,
                    "path": path,
                    "content": content,
                    "createdBy": agent_type
                })

                await self.log(state, "INFO", f"Persisted file: {path}")

            except Exception as e:
                await self.log(state, "ERROR", f"Failed to persist file {path}: {str(e)}")
```

- [ ] **Step 2: Update each agent to call persist_files**

```python
# In each agent's run method, after generating files:

files = self._parse_files(response)
state["files"].update(files)

# Persist files to database and emit events
await self.persist_files(state, files, self.name)
```

- [ ] **Step 3: Add API endpoint to receive files from orchestrator**

```typescript
// apps/api/src/routes/orchestrator.ts (new file)

import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { emitFileCreated } from '../socket';

const router = Router();

// Internal endpoint for orchestrator to save files
router.post('/internal/files/save', async (req: Request, res: Response) => {
  try {
    const { projectId, files } = req.body; // files: [{path, content, createdBy}]

    const savedFiles = [];
    for (const file of files) {
      const saved = await prisma.projectFile.upsert({
        where: {
          projectId_path: {
            projectId,
            path: file.path,
          },
        },
        update: {
          content: file.content,
          version: { increment: 1 },
          createdBy: file.createdBy,
        },
        create: {
          projectId,
          path: file.path,
          content: file.content,
          language: getLanguageFromPath(file.path),
          createdBy: file.createdBy,
        },
      });
      savedFiles.push(saved);

      // Emit socket event
      await emitFileCreated(projectId, file.path, file.content, file.createdBy as any);
    }

    res.json({ success: true, files: savedFiles });
  } catch (error) {
    console.error('Error saving files:', error);
    res.status(500).json({ error: 'Failed to save files' });
  }
});

export default router;
```

- [ ] **Step 4: Commit**

```bash
git add apps/orchestrator/agents/base.py apps/api/src/routes/orchestrator.ts
git commit -m "feat: implement agent file persistence to database with socket events"
```

---

## HIGH PRIORITY FIXES (Tasks 6-12)

### Task 6: Implement Redis/BullMQ Task Queue

**Files:**
- Create: `apps/api/src/lib/redis.ts`
- Create: `apps/api/src/lib/queue.ts`

- [ ] **Step 1: Create Redis client**

```typescript
// apps/api/src/lib/redis.ts
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailures: 100,
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

export default redis;
```

- [ ] **Step 2: Create BullMQ queue**

```typescript
// apps/api/src/lib/queue.ts
import { Queue, Worker } from 'bullmq';
import { redis } from './redis';

const QUEUE_NAME = 'swarmdev-agent-jobs';

export const agentQueue = new Queue(QUEUE_NAME, { connection: redis });

// Worker to process jobs
export const agentWorker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { project_id, user_id, user_prompt, tech_stack } = job.data;
    
    console.log(`📦 Processing job for project ${project_id}`);
    
    // Call orchestrator
    const response = await fetch(process.env.ORCHESTRATOR_URL + '/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id, user_id, user_prompt, tech_stack }),
    });

    return response.json();
  },
  { connection: redis, concurrency: 5 }
);

agentWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

agentWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/redis.ts apps/api/src/lib/queue.ts
git commit -m "feat: add Redis and BullMQ task queue infrastructure"
```

---

### Task 7: Implement Redis Pub/Sub Bridge

**Files:**
- Modify: `apps/orchestrator/utils/socket_emitter.py`
- Modify: `apps/api/src/socket/index.ts`

- [ ] **Step 1: Update Python socket emitter to use Redis pub/sub**

```python
# apps/orchestrator/utils/socket_emitter.py

import redis.asyncio as redis
import json
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
_redis_client = None

async def get_redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    return _redis_client

async def emit(event_type: str, payload: dict):
    """Publish event to Redis pub/sub for API to bridge to Socket.io"""
    try:
        r = await get_redis()
        message = json.dumps({
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.utcnow().isoformat()
        })
        await r.publish("swarmdev:events", message)
    except Exception as e:
        print(f"Error emitting event: {e}")
```

- [ ] **Step 2: Update API to subscribe to Redis and bridge to Socket.io**

```typescript
// apps/api/src/socket/index.ts

import { redis } from '../lib/redis';

// After initializing Socket.io, subscribe to Redis
export const initializeRedisSubscriber = () => {
  redis.subscribe('swarmdev:events', (err, count) => {
    if (err) {
      console.error('Failed to subscribe to Redis channel:', err);
    } else {
      console.log(`📡 Subscribed to ${count} Redis channel(s)`);
    }
  });

  redis.on('message', (channel, message) => {
    if (channel === 'swarmdev:events') {
      const event = JSON.parse(message);
      const { type, payload, timestamp } = event;
      
      // Forward to all Socket.io clients
      getIO().emit(type, { ...payload, timestamp });
    }
  });
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/orchestrator/utils/socket_emitter.py apps/api/src/socket/index.ts
git commit -m "feat: implement Redis pub/sub bridge for orchestrator-to-API events"
```

---

### Task 8: Implement Plan Enforcement Middleware

**Files:**
- Create: `apps/api/src/middleware/planCheck.ts`

- [ ] **Step 1: Create plan check middleware**

```typescript
// apps/api/src/middleware/planCheck.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../prisma/client';

export const planCheckMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.auth!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projects: {
          select: { id: true, status: true },
        },
        usageLogs: {
          where: {
            createdAt: {
              gte: new Date(new Date().setDate(1)), // Current month
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const plan = user.plan;
    const planLimits = {
      FREE: { maxProjects: 3, maxTokens: 100000, maxParallelAgents: 2 },
      PRO: { maxProjects: -1, maxTokens: 2000000, maxParallelAgents: 5 },
      TEAM: { maxProjects: -1, maxTokens: 10000000, maxParallelAgents: 9 },
      ENTERPRISE: { maxProjects: -1, maxTokens: -1, maxParallelAgents: 9 },
    };

    const limits = planLimits[plan as keyof typeof planLimits];

    // Check project count
    if (limits.maxProjects > 0 && user.projects.length >= limits.maxProjects) {
      return res.status(403).json({
        error: 'Project limit reached',
        limit: limits.maxProjects,
        upgrade: '/billing/plans',
      });
    }

    // Check token usage
    const tokensUsed = user.usageLogs.reduce(
      (sum, log) => sum + log.tokensIn + log.tokensOut,
      0
    );
    if (limits.maxTokens > 0 && tokensUsed >= limits.maxTokens) {
      return res.status(403).json({
        error: 'Token limit reached',
        used: tokensUsed,
        limit: limits.maxTokens,
        upgrade: '/billing/plans',
      });
    }

    // Attach limits to request for downstream use
    req.planLimits = limits;

    next();
  } catch (error) {
    console.error('Plan check error:', error);
    res.status(500).json({ error: 'Plan check failed' });
  }
};

// Extend AuthRequest type
declare global {
  namespace Express {
    interface Request {
      planLimits?: {
        maxProjects: number;
        maxTokens: number;
        maxParallelAgents: number;
      };
    }
  }
}
```

- [ ] **Step 2: Add middleware to API**

```typescript
// apps/api/src/index.ts

import { planCheckMiddleware } from './middleware/planCheck';

// Add after auth middleware
app.use(authMiddleware);
app.use(planCheckMiddleware);
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/middleware/planCheck.ts apps/api/src/index.ts
git commit -m "feat: add plan enforcement middleware for usage limits"
```

---

### Task 9: Create Separate Rate Limit Middleware

**Files:**
- Create: `apps/api/src/middleware/rateLimit.ts`

- [ ] **Step 1: Extract rate limiting to separate middleware**

```typescript
// apps/api/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter limit for auth endpoints
  message: { error: 'Too many authentication attempts' },
});
```

- [ ] **Step 2: Update index.ts to use middleware**

```typescript
// apps/api/src/index.ts

import { apiLimiter, authLimiter } from './middleware/rateLimit';

app.use(apiLimiter);
app.use('/api/auth', authLimiter);
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/middleware/rateLimit.ts apps/api/src/index.ts
git commit -m "refactor: extract rate limiting to separate middleware module"
```

---

### Task 10: Implement Socket.io Handlers

**Files:**
- Modify: `apps/api/src/socket/index.ts`

- [ ] **Step 1: Implement missing socket handlers**

```typescript
// apps/api/src/socket/index.ts

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join_project', ({ projectId }) => {
    socket.join(`project:${projectId}`);
    console.log(`Client ${socket.id} joined project:${projectId}`);
  });

  socket.on('leave_project', ({ projectId }) => {
    socket.leave(`project:${projectId}`);
    console.log(`Client ${socket.id} left project:${projectId}`);
  });

  // Implement send_message
  socket.on('send_message', async ({ projectId, content }) => {
    try {
      const message = await prisma.chatMessage.create({
        data: {
          projectId,
          role: 'USER',
          content,
        },
      });

      // Forward to orchestrator
      await fetch(`${process.env.ORCHESTRATOR_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, content }),
      });

      // Broadcast to room
      io.to(`project:${projectId}`).emit('agent_message', {
        role: 'USER',
        content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  // Implement request_file
  socket.on('request_file', async ({ projectId, path }) => {
    try {
      const file = await prisma.projectFile.findUnique({
        where: { projectId_path: { projectId, path } },
      });

      if (file) {
        socket.emit('file_content', {
          path,
          content: file.content,
          language: file.language,
        });
      }
    } catch (error) {
      console.error('Error fetching file:', error);
    }
  });

  // Implement exec_command
  socket.on('exec_command', async ({ projectId, command }) => {
    try {
      // Execute command in sandbox (placeholder - needs E2B integration)
      socket.emit('terminal_output', {
        data: `Executing: ${command}\n`,
      });

      // TODO: Integrate with E2B sandbox
      socket.emit('terminal_output', {
        data: 'Command execution requires E2B sandbox integration\n',
      });
    } catch (error) {
      socket.emit('terminal_output', {
        data: `Error: ${error}\n`,
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/socket/index.ts
git commit -m "feat: implement missing Socket.io event handlers"
```

---

### Task 11: Add Clerk Webhook Endpoint

**Files:**
- Create: `apps/api/src/routes/auth.ts` (add webhook handler)

- [ ] **Step 1: Add webhook handler to auth routes**

```typescript
// apps/api/src/routes/auth.ts

import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import prisma from '../prisma/client';

const router = Router();

// Clerk webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Clerk webhook secret not configured' });
  }

  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing Svix headers' });
  }

  const wh = new Webhook(webhookSecret);
  let evt;

  try {
    evt = wh.verify(JSON.stringify(req.body), {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return res.status(400).json({ error: 'Webhook verification failed' });
  }

  const eventType = evt.type;

  try {
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        await prisma.user.create({
          data: {
            clerkId: id,
            email: email_addresses[0].email_address,
            name: `${first_name || ''} ${last_name || ''}`.trim() || null,
            avatarUrl: image_url || null,
          },
        });
        console.log(`✅ Created user: ${id}`);
        break;
      }

      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        await prisma.user.update({
          where: { clerkId: id },
          data: {
            email: email_addresses[0]?.email_address,
            name: `${first_name || ''} ${last_name || ''}`.trim() || null,
            avatarUrl: image_url || null,
          },
        });
        console.log(`✅ Updated user: ${id}`);
        break;
      }

      case 'user.deleted': {
        const { id } = evt.data;
        await prisma.user.delete({
          where: { clerkId: id },
        });
        console.log(`✅ Deleted user: ${id}`);
        break;
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
```

- [ ] **Step 2: Install svix package**

```bash
cd apps/api && pnpm add svix
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/auth.ts apps/api/package.json
git commit -m "feat: add Clerk webhook handler for user sync"
```

---

### Task 12: Implement Sandbox-to-R2 File Sync

**Files:**
- Create: `apps/api/src/services/syncService.ts`

- [ ] **Step 1: Create sync service**

```typescript
// apps/api/src/services/syncService.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import prisma from '../prisma/client';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY || '',
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || 'swarmdev';

export const syncService = {
  /**
   * Sync all project files to R2
   */
  async syncProjectToR2(projectId: string): Promise<void> {
    const files = await prisma.projectFile.findMany({
      where: { projectId },
    });

    const uploadPromises = files.map(async (file) => {
      const key = `projects/${projectId}/${file.path}`;

      await r2Client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: file.content,
          ContentType: 'text/plain',
        })
      );

      console.log(`📦 Synced to R2: ${key}`);
    });

    await Promise.all(uploadPromises);
    console.log(`✅ Synced ${files.length} files to R2 for project ${projectId}`);
  },

  /**
   * Sync single file to R2
   */
  async syncFileToR2(projectId: string, path: string, content: string): Promise<void> {
    const key = `projects/${projectId}/${path}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: content,
        ContentType: 'text/plain',
      })
    );

    console.log(`📦 Synced to R2: ${key}`);
  },

  /**
   * Download file from R2
   */
  async downloadFromR2(projectId: string, path: string): Promise<string | null> {
    // Implementation for downloading from R2
    return null; // TODO: Implement with GetObjectCommand
  },
};

// Start background sync job (every 60 seconds)
export const startBackgroundSync = () => {
  setInterval(async () => {
    try {
      const projects = await prisma.project.findMany({
        where: {
          status: { in: ['IN_PROGRESS', 'REVIEWING'] },
        },
        select: { id: true },
      });

      for (const project of projects) {
        await syncService.syncProjectToR2(project.id);
      }
    } catch (error) {
      console.error('Background sync error:', error);
    }
  }, 60000); // 60 seconds
};
```

- [ ] **Step 2: Start background sync in API**

```typescript
// apps/api/src/index.ts

import { startBackgroundSync } from './services/syncService';

// Start background file sync
startBackgroundSync();
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/syncService.ts apps/api/src/index.ts
git commit -m "feat: implement background sync of project files to Cloudflare R2"
```

---

## MEDIUM PRIORITY FIXES (Tasks 13-18)

### Task 13: Fix Graph Workflow to Match Blueprint

**Files:**
- Modify: `apps/orchestrator/graph/graph.py`

- [ ] **Step 1: Update graph to include reviewer and parallel documentation**

```python
# apps/orchestrator/graph/graph.py

# Update edges to match blueprint:
# Supervisor → (DB, Backend, DevOps, Documentation) [parallel]
#   → Frontend → QA → Reviewer → Security → Supervisor merge

graph.add_edge(START, "supervisor")

# Parallel branches from supervisor (including documentation)
graph.add_edge("supervisor", "backend")
graph.add_edge("supervisor", "database")
graph.add_edge("supervisor", "devops")
graph.add_edge("supervisor", "documentation")

# Converge parallel branches before frontend
graph.add_edge("backend", "pre_frontend")
graph.add_edge("database", "pre_frontend")
graph.add_edge("devops", "pre_frontend")
graph.add_edge("documentation", "pre_frontend")

# Frontend after convergence
graph.add_edge("pre_frontend", "frontend")

# Sequential post-frontend: QA → Reviewer → Security
graph.add_edge("frontend", "qa")
graph.add_edge("qa", "reviewer")
graph.add_edge("reviewer", "security")

# Add supervisor merge at end
graph.add_edge("security", "supervisor_merge")
graph.add_edge("supervisor_merge", END)
```

- [ ] **Step 2: Add supervisor_merge node**

```python
# apps/orchestrator/agents/supervisor.py - add merge method

async def merge(self, state: Dict[str, Any]) -> Dict[str, Any]:
    """Final merge step - consolidate all agent outputs."""
    await self.log(state, "INFO", "Finalizing project...")
    
    state["status"] = "COMPLETED"
    
    await self.emit_event("project_status", {
        "status": "COMPLETED",
        "message": "Project generation complete"
    })
    
    return state

# In graph.py:
async def supervisor_merge_node(state: ProjectState):
    supervisor = SupervisorAgent()
    return await supervisor.merge(state)

graph.add_node("supervisor_merge", supervisor_merge_node)
```

- [ ] **Step 3: Commit**

```bash
git add apps/orchestrator/graph/graph.py apps/orchestrator/agents/supervisor.py
git commit -m "fix: update graph workflow to match blueprint pipeline"
```

---

### Task 14-18: Remaining Medium Priority Fixes

These require more extensive implementation. Creating separate tasks:

- [ ] **Task 14:** Create missing frontend pages (login, signup, settings, billing)
- [ ] **Task 15:** Create missing frontend components (AgentCard, ProjectCard, etc.)
- [ ] **Task 16:** Implement Qdrant/RAG integration for agent context
- [ ] **Task 17:** Create agentService.ts for agent management
- [ ] **Task 18:** Implement agent-to-agent communication pattern

---

## LOW PRIORITY FIXES (Tasks 19-30)

### Task 19-30: Quality and Polish

- [ ] **Task 19:** Fix API Dockerfile to use production build
- [ ] **Task 20:** Update Stripe API version
- [ ] **Task 21:** Fix SecurityAgent event name
- [ ] **Task 22:** Create prompts/ directory with separate prompt files
- [ ] **Task 23:** Create tools/ directory with sandbox tools
- [ ] **Task 24:** Add tests for API and frontend
- [ ] **Task 25:** Remove stale directories (dashboard, forge-platform, etc.)
- [ ] **Task 26:** Create worker.py for BullMQ
- [ ] **Task 27:** Fix ChatStore TODO for real-time responses
- [ ] **Task 28:** Remove or populate shared-packages directory
- [ ] **Task 29:** Remove or document config.yaml
- [ ] **Task 30:** Verify all middleware modules exist

---

**Plan complete.** Execute with subagent-driven-development, one task at a time with review after each.
