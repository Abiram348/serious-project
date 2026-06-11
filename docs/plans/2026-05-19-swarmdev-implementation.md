# SwarmDev Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the SwarmDev multi-agent cloud development platform according to the docs/PROJECT_BLUEPRINT.md specification.

**Architecture:** Monorepo with Turborepo + pnpm workspaces. Three apps: Next.js frontend (Vercel), Express.js API + Socket.io (Cloud Run), Python FastAPI + LangGraph orchestrator (Cloud Run). Nine specialized agents coordinated by a Supervisor agent via LangGraph DAG.

**Tech Stack:** Next.js 14, TypeScript, TailwindCSS, shadcn/ui, Monaco Editor, xterm.js, Socket.io-client, Zustand; Express.js, Socket.io, BullMQ, Prisma; Python FastAPI, LangGraph, Anthropic Claude API, E2B SDK.

---

## Current State Audit (May 19, 2026)

### ✅ Already Implemented

**Monorepo Infrastructure:**
- Turborepo + pnpm workspaces configured
- packages/shared-types, packages/db, packages/shared-packages exist
- apps/web, apps/api, apps/orchestrator structure in place

**Database Layer:**
- Complete Prisma schema with all 9 models (User, Project, AgentRun, AgentLog, ProjectFile, ChatMessage, BuildLog, Subscription, UsageLog)
- All enums defined (Plan, ProjectStatus, AgentType, AgentStatus, LogLevel, MessageRole, SubStatus)

**API Backend (Express):**
- Main server with CORS, helmet, rate limiting
- All route files: auth, projects, agents, files, chat, terminal, git, billing
- Socket.io initialization
- Middleware: auth, rateLimit
- Services: projectService, sandboxService, storageService, billingService

**Orchestrator (Python FastAPI + LangGraph):**
- LangGraph state machine with ProjectState TypedDict
- All 9 agents implemented: supervisor, frontend, backend, database, devops, qa, security, documentation
- Graph DAG compiled and ready
- Base agent class with async run interface

**Frontend (Next.js):**
- Landing page, dashboard page, project page
- UI components: button, ChatWindow, AgentPanel, FileTree, MonacoEditor, Terminal
- Hooks: useSocket, useProject, useAgents
- Stores: projectStore, chatStore

### ❌ Gaps to Complete

1. **Missing Route Implementations** - Many route files exist but need full implementation
2. **Service Layer Gaps** - sandboxService, storageService, billingService need E2B/R2/Stripe integration
3. **Agent Tool Implementations** - Agents have run() stubs but need actual file writing, schema generation, test execution
4. **Frontend Pages** - Missing auth pages, project IDE layout, settings, billing
5. **Real-time Integration** - Socket event emitters need Redis pub/sub bridge
6. **Authentication** - Clerk middleware needs implementation
7. **Environment Setup** - Missing .env files, docker-compose for local dev
8. **Testing** - No test suites for any layer
9. **DevOps** - Missing Dockerfiles, GitHub Actions CI/CD, Kubernetes manifests
10. **TypeScript Types** - shared-types package needs population

---

## Phase 1: Foundation Completion (Tasks 1-15)

### Task 1: Complete shared-types Package

**Files:**
- Create: `packages/shared-types/src/project.ts`
- Create: `packages/shared-types/src/agent.ts`
- Create: `packages/shared-types/src/events.ts`
- Create: `packages/shared-types/src/index.ts`
- Modify: `packages/shared-types/package.json`

- [ ] **Step 1: Create project types**

```typescript
// packages/shared-types/src/project.ts
export enum Plan {
  FREE = "FREE",
  PRO = "PRO",
  TEAM = "TEAM",
  ENTERPRISE = "ENTERPRISE",
}

export enum ProjectStatus {
  PENDING = "PENDING",
  PLANNING = "PLANNING",
  IN_PROGRESS = "IN_PROGRESS",
  REVIEWING = "REVIEWING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  ARCHIVED = "ARCHIVED",
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  techStack: TechStack;
  sandboxId?: string;
  previewUrl?: string;
  githubRepo?: string;
  deployUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TechStack {
  frontend?: string;
  backend?: string;
  db?: string;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  path: string;
  content: string;
  language?: string;
  createdBy?: AgentType;
  version: number;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Create agent types**

```typescript
// packages/shared-types/src/agent.ts
export enum AgentType {
  SUPERVISOR = "SUPERVISOR",
  FRONTEND = "FRONTEND",
  BACKEND = "BACKEND",
  DATABASE = "DATABASE",
  DEVOPS = "DEVOPS",
  QA = "QA",
  REVIEWER = "REVIEWER",
  SECURITY = "SECURITY",
  DOCUMENTATION = "DOCUMENTATION",
}

export enum AgentStatus {
  IDLE = "IDLE",
  RUNNING = "RUNNING",
  WAITING = "WAITING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export interface AgentRun {
  id: string;
  projectId: string;
  agentType: AgentType;
  status: AgentStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  errorMsg?: string;
  tokenUsed: number;
  createdAt: string;
}

export interface AgentLog {
  id: string;
  agentRunId: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
}
```

- [ ] **Step 3: Create event types**

```typescript
// packages/shared-types/src/events.ts
import { AgentType } from "./agent";

export interface AgentEvent {
  type:
    | "agent_status"
    | "agent_log"
    | "file_created"
    | "file_updated"
    | "project_status"
    | "terminal_output"
    | "agent_message"
    | "build_result"
    | "preview_ready";
  projectId: string;
  agentType?: AgentType;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface SocketEvents {
  // Client → Server
  join_project: (data: { projectId: string }) => void;
  leave_project: (data: { projectId: string }) => void;
  send_message: (data: { projectId: string; content: string }) => void;
  request_file: (data: { projectId: string; path: string }) => void;
  exec_command: (data: { projectId: string; command: string }) => void;

  // Server → Client
  agent_status: (data: { agentType: AgentType; status: string; message: string }) => void;
  agent_log: (data: { agentType: AgentType; level: string; message: string; timestamp: string }) => void;
  file_created: (data: { path: string; content: string; createdBy: AgentType }) => void;
  file_updated: (data: { path: string; content: string; updatedBy: AgentType }) => void;
  project_status: (data: { status: string }) => void;
  terminal_output: (data: { data: string }) => void;
  build_result: (data: { success: boolean; output: string; errors: string[] }) => void;
  preview_ready: (data: { url: string }) => void;
}
```

- [ ] **Step 4: Create index export**

```typescript
// packages/shared-types/src/index.ts
export * from "./project";
export * from "./agent";
export * from "./events";
```

- [ ] **Step 5: Update package.json**

```json
{
  "name": "@swarmdev/shared-types",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 6: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 7: Build and verify**

```bash
cd packages/shared-types && pnpm build
```

Expected: dist/ directory with .js and .d.ts files

- [ ] **Step 8: Commit**

```bash
git add packages/shared-types/
git commit -m "feat: add shared-types package with project, agent, and event types"
```

---

### Task 2: Complete Prisma Setup and Run Migrations

**Files:**
- Modify: `packages/db/prisma/schema.prisma` (already complete, just verify)
- Create: `packages/db/prisma/seed.ts`
- Modify: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`

- [ ] **Step 1: Verify schema.prisma matches blueprint**

The schema already exists. Verify it has all models and enums from blueprint.

- [ ] **Step 2: Create seed script**

```typescript
// packages/db/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@swarmdev.io' },
    update: {},
    create: {
      clerkId: 'demo_clerk_id',
      email: 'demo@swarmdev.io',
      name: 'Demo User',
      plan: 'FREE',
      credits: 100,
    },
  });

  console.log('✅ Created demo user:', user.email);

  // Create sample project
  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: 'Sample Project',
      description: 'A sample full-stack application generated by SwarmDev',
      status: 'COMPLETED',
      techStack: {
        frontend: 'nextjs',
        backend: 'express',
        db: 'postgres',
      },
    },
  });

  console.log('✅ Created sample project:', project.name);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 3: Update package.json**

```json
{
  "name": "@swarmdev/db",
  "version": "1.0.0",
  "scripts": {
    "generate": "prisma generate",
    "migrate": "prisma migrate dev",
    "seed": "ts-node prisma/seed.ts",
    "studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.0.0"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["prisma/**/*"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Generate Prisma client and run migrations**

```bash
cd packages/db
pnpm generate
pnpm migrate
pnpm seed
```

Expected: Prisma client generated, migrations applied to PostgreSQL, demo user created

- [ ] **Step 6: Commit**

```bash
git add packages/db/
git commit -m "feat: complete Prisma setup with seed script"
```

---

### Task 3: Implement API Authentication Middleware

**Files:**
- Modify: `apps/api/src/middleware/auth.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Implement Clerk auth middleware**

```typescript
// apps/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import prisma from '../prisma/client';

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    sessionId?: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get auth from Clerk
    const auth = getAuth(req);

    if (!auth?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Look up user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: auth.userId },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found in database' });
    }

    // Attach user info to request
    req.auth = {
      userId: user.id,
      sessionId: auth.sessionId,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
```

- [ ] **Step 2: Install Clerk Express package if not present**

```bash
cd apps/api
pnpm add @clerk/express
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/middleware/auth.ts
git commit -m "feat: implement Clerk authentication middleware"
```

---

### Task 4: Implement Project Service

**Files:**
- Modify: `apps/api/src/services/projectService.ts`

- [ ] **Step 1: Implement project service with all CRUD operations**

```typescript
// apps/api/src/services/projectService.ts
import prisma from '../prisma/client';
import { AgentType, ProjectStatus } from '@prisma/client';
import { emitProjectStatus } from '../socket';

interface CreateProjectInput {
  userId: string;
  name: string;
  description: string;
  techStack?: {
    frontend?: string;
    backend?: string;
    db?: string;
  };
}

interface ProjectListResult {
  projects: any[];
  total: number;
  page: number;
  totalPages: number;
}

export const projectService = {
  async getAllProjects(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ProjectListResult> {
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          agents: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.project.count({ where: { userId } }),
    ]);

    return {
      projects,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getProjectById(projectId: string, userId: string) {
    return prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        agents: { orderBy: { createdAt: 'desc' } },
        files: { orderBy: { path: 'asc' } },
        messages: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
  },

  async createProject(data: CreateProjectInput) {
    const project = await prisma.project.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description,
        techStack: data.techStack || {},
        status: 'PENDING',
      },
    });

    // Emit socket event
    await emitProjectStatus(project.id, 'PENDING');

    return project;
  },

  async updateProject(
    projectId: string,
    userId: string,
    data: Partial<CreateProjectInput>
  ) {
    return prisma.project.update({
      where: { id: projectId, userId },
      data,
    });
  },

  async deleteProject(projectId: string, userId: string) {
    // Delete all related data (cascades handle most)
    await prisma.project.delete({
      where: { id: projectId, userId },
    });
  },

  async startAgentPipeline(projectId: string) {
    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'PLANNING' },
    });

    await emitProjectStatus(projectId, 'PLANNING');

    // TODO: Trigger orchestrator via HTTP or queue job
    // For now, this is a placeholder
    console.log(`🚀 Starting agent pipeline for project ${projectId}`);
  },

  async upsertFile(projectId: string, path: string, content: string, createdBy?: AgentType) {
    return prisma.projectFile.upsert({
      where: {
        projectId_path: {
          projectId,
          path,
        },
      },
      update: {
        content,
        version: { increment: 1 },
        createdBy,
      },
      create: {
        projectId,
        path,
        content,
        language: getLanguageFromPath(path),
        createdBy,
      },
    });
  },

  async getFile(projectId: string, path: string) {
    return prisma.projectFile.findUnique({
      where: {
        projectId_path: {
          projectId,
          path,
        },
      },
    });
  },

  async listFiles(projectId: string) {
    return prisma.projectFile.findMany({
      where: { projectId },
      orderBy: { path: 'asc' },
    });
  },

  async deleteFile(projectId: string, path: string) {
    return prisma.projectFile.delete({
      where: {
        projectId_path: {
          projectId,
          path,
        },
      },
    });
  },
};

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    rb: 'ruby',
    sql: 'sql',
    md: 'markdown',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    html: 'html',
    css: 'css',
    scss: 'scss',
  };
  return langMap[ext || ''] || 'text';
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/services/projectService.ts
git commit -m "feat: implement project service with CRUD and file operations"
```

---

### Task 5: Implement Socket.io Event Emitter

**Files:**
- Modify: `apps/api/src/socket/index.ts`
- Create: `apps/api/src/socket/handlers.ts`

- [ ] **Step 1: Complete socket initialization**

```typescript
// apps/api/src/socket/index.ts
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPSServer } from 'https';
import prisma from '../prisma/client';
import { AgentType } from '@prisma/client';

let io: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HTTPServer | HTTPSServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join project room
    socket.on('join_project', ({ projectId }) => {
      socket.join(`project:${projectId}`);
      console.log(`Client ${socket.id} joined project:${projectId}`);
    });

    // Leave project room
    socket.on('leave_project', ({ projectId }) => {
      socket.leave(`project:${projectId}`);
      console.log(`Client ${socket.id} left project:${projectId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export const emitToProject = (projectId: string, event: string, data: any) => {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, data);
};

export const emitProjectStatus = async (projectId: string, status: string) => {
  emitToProject(projectId, 'project_status', { status });

  // Also update database
  await prisma.project.update({
    where: { id: projectId },
    data: { status: status as any },
  });
};

export const emitAgentStatus = (projectId: string, agentType: AgentType, status: string, message: string) => {
  emitToProject(projectId, 'agent_status', {
    agentType,
    status,
    message,
    timestamp: new Date().toISOString(),
  });
};

export const emitAgentLog = (projectId: string, agentType: AgentType, level: string, message: string) => {
  emitToProject(projectId, 'agent_log', {
    agentType,
    level,
    message,
    timestamp: new Date().toISOString(),
  });
};

export const emitFileCreated = (projectId: string, path: string, content: string, createdBy: AgentType) => {
  emitToProject(projectId, 'file_created', {
    path,
    content,
    createdBy,
    timestamp: new Date().toISOString(),
  });
};

export const emitFileUpdated = (projectId: string, path: string, content: string, updatedBy: AgentType) => {
  emitToProject(projectId, 'file_updated', {
    path,
    content,
    updatedBy,
    timestamp: new Date().toISOString(),
  });
};
```

- [ ] **Step 2: Create socket handlers for agent events**

```typescript
// apps/api/src/socket/handlers.ts
import { getIO } from './index';
import { AgentType, LogLevel } from '@prisma/client';
import prisma from '../prisma/client';

interface AgentEvent {
  type: string;
  projectId: string;
  agentType?: AgentType;
  payload: Record<string, unknown>;
}

export const handleAgentEvent = async (event: AgentEvent) => {
  const io = getIO();
  const { type, projectId, agentType, payload } = event;

  // Emit to project room
  io.to(`project:${projectId}`).emit(type, {
    agentType,
    timestamp: new Date().toISOString(),
    ...payload,
  });

  // Log to database based on event type
  if (type === 'agent_log' && agentType) {
    const agentRun = await prisma.agentRun.findFirst({
      where: { projectId, agentType },
      orderBy: { createdAt: 'desc' },
    });

    if (agentRun) {
      await prisma.agentLog.create({
        data: {
          agentRunId: agentRun.id,
          level: (payload.level as LogLevel) || 'INFO',
          message: payload.message as string,
          metadata: payload.metadata as any,
        },
      });
    }
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/socket/
git commit -m "feat: implement Socket.io event emitters for real-time updates"
```

---

### Task 6: Implement All API Routes

**Files:**
- Modify: `apps/api/src/routes/auth.ts`
- Modify: `apps/api/src/routes/agents.ts`
- Modify: `apps/api/src/routes/files.ts`
- Modify: `apps/api/src/routes/chat.ts`
- Modify: `apps/api/src/routes/terminal.ts`
- Modify: `apps/api/src/routes/billing.ts`
- Modify: `apps/api/src/routes/git.ts`

*(Each route file follows similar pattern - implementing the blueprint API spec)*

- [ ] **Step 1: Auth routes**

```typescript
// apps/api/src/routes/auth.ts
import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';

const router = Router();

// Get current user profile
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: {
        projects: {
          take: 5,
          orderBy: { updatedAt: 'desc' },
        },
        subscriptions: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, avatarUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: req.auth!.userId },
      data: { name, avatarUrl },
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
```

- [ ] **Step 2: Agents routes**

```typescript
// apps/api/src/routes/agents.ts
import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';
import { AgentType } from '@prisma/client';

const router = Router();

// List all agent runs for a project
router.get('/projects/:id/agents', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const userId = req.auth!.userId;

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const agents = await prisma.agentRun.findMany({
      where: { projectId },
      include: {
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Get specific agent run
router.get('/projects/:id/agents/:agentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId, agentId } = req.params;
    const userId = req.auth!.userId;

    const agentRun = await prisma.agentRun.findFirst({
      where: { id: agentId, projectId },
      include: {
        logs: { orderBy: { timestamp: 'desc' } },
      },
    });

    if (!agentRun) {
      return res.status(404).json({ error: 'Agent run not found' });
    }

    res.json(agentRun);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// Send message to agent
router.post('/projects/:id/agents/message', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { agentType, content } = req.body;

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.auth!.userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Save message
    const message = await prisma.chatMessage.create({
      data: {
        projectId,
        role: 'AGENT',
        agentType: agentType as AgentType,
        content,
      },
    });

    res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Stream agent logs (SSE)
router.get('/projects/:id/agents/logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const userId = req.auth!.userId;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const logs = await prisma.agentLog.findMany({
      where: {
        agentRun: {
          projectId,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    // Send existing logs
    logs.forEach((log) => {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    });

    // TODO: Set up real-time streaming via Socket.io bridge
  } catch (error) {
    console.error('Error streaming logs:', error);
    res.status(500).json({ error: 'Failed to stream logs' });
  }
});

export default router;
```

- [ ] **Step 3: Files routes**

```typescript
// apps/api/src/routes/files.ts
import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { projectService } from '../services/projectService';
import { emitFileCreated, emitFileUpdated } from '../socket';

const router = Router();

// List all project files (tree)
router.get('/projects/:id/files', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const userId = req.auth!.userId;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const files = await projectService.listFiles(projectId);
    res.json(files);
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Get file content
router.get('/projects/:id/files/*', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const filePath = req.params[0];
    const userId = req.auth!.userId;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const file = await projectService.getFile(projectId, filePath);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(file);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// Update file content (human edit)
router.patch('/projects/:id/files/*', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const filePath = req.params[0];
    const { content } = req.body;
    const userId = req.auth!.userId;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const file = await projectService.upsertFile(projectId, filePath, content);

    // Emit socket event
    await emitFileUpdated(projectId, filePath, content, 'USER' as any);

    res.json(file);
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// Create new file
router.post('/projects/:id/files/*', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const filePath = req.params[0];
    const { content } = req.body;
    const userId = req.auth!.userId;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const file = await projectService.upsertFile(projectId, filePath, content);

    // Emit socket event
    await emitFileCreated(projectId, filePath, content, 'USER' as any);

    res.status(201).json(file);
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: 'Failed to create file' });
  }
});

// Delete file
router.delete('/projects/:id/files/*', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const filePath = req.params[0];
    const userId = req.auth!.userId;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await projectService.deleteFile(projectId, filePath);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
```

*(Continue with chat.ts, terminal.ts, billing.ts, git.ts following the blueprint API spec)*

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/
git commit -m "feat: implement all API routes per blueprint specification"
```

---

### Task 7: Implement Orchestrator Agent Tools

**Files:**
- Modify: `apps/orchestrator/agents/base.py`
- Modify: `apps/orchestrator/agents/supervisor.py`
- Modify: `apps/orchestrator/agents/frontend.py`
- Modify: `apps/orchestrator/agents/backend.py`
- Modify: `apps/orchestrator/agents/database.py`
- Modify: `apps/orchestrator/agents/devops.py`
- Modify: `apps/orchestrator/agents/qa.py`
- Modify: `apps/orchestrator/agents/security.py`
- Modify: `apps/orchestrator/agents/documentation.py`

*(Each agent needs actual implementation - file writing, code generation, test execution)*

- [ ] **Step 1: Update base agent with common tools**

```python
# apps/orchestrator/agents/base.py
"""
Base class for all agents in the SwarmDev orchestration engine.
"""

import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List
from anthropic import AsyncAnthropic

class BaseAgent(ABC):
    def __init__(self, name: str, system_prompt: str = ""):
        self.name = name
        self.system_prompt = system_prompt
        self.client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    @abstractmethod
    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the agent logic and return the possibly modified state."""
        raise NotImplementedError

    async def call_llm(self, user_prompt: str, system_prompt: str = "") -> str:
        """Call Claude LLM with the given prompts."""
        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt or self.system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )
        return response.content[0].text

    async def emit_event(self, event_type: str, payload: Dict[str, Any]):
        """Emit a socket event via the socket emitter utility."""
        from ..utils.socket_emitter import emit
        await emit(event_type, payload)

    async def log(self, state: Dict[str, Any], level: str, message: str):
        """Log a message and emit socket event."""
        project_id = state.get("project_id", "unknown")
        await self.emit_event("agent_log", {
            "agent": self.name,
            "level": level,
            "message": message,
            "projectId": project_id
        })
```

- [ ] **Step 2: Implement Frontend Agent**

```python
# apps/orchestrator/agents/frontend.py
"""
Frontend Agent - Builds React/Next.js components, pages, styling, state management.
"""

import os
import json
from typing import Dict, Any
from anthropic import AsyncAnthropic
from .base import BaseAgent

SYSTEM_PROMPT = """You are the Frontend Agent for SwarmDev.

Your role:
1. Build Next.js 14 App Router components and pages
2. Implement TailwindCSS styling and shadcn/ui components
3. Handle state management with Zustand
4. Connect UI to API endpoints
5. Build responsive, accessible interfaces

Output format:
- Generate complete, working TypeScript/TSX files
- Use 'FILE: path/to/file.tsx' followed by file content
- Each file should be self-contained and follow React best practices
"""

class FrontendAgent(BaseAgent):
    def __init__(self):
        super().__init__("FRONTEND", SYSTEM_PROMPT)
        self.client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        user_prompt = state.get("user_prompt", "")
        task_plan = state.get("task_plan", [])

        # Get frontend-specific tasks
        frontend_tasks = [t for t in task_plan if t.get("agentType") == "FRONTEND"]

        if not frontend_tasks:
            state["frontend_done"] = True
            return state

        await self.log(state, "INFO", f"Starting frontend generation with {len(frontend_tasks)} tasks")

        # Build prompt for frontend generation
        frontend_prompt = f"""
Build a Next.js 14 frontend for this project:

User Requirements:
{user_prompt}

Your Tasks:
{json.dumps(frontend_tasks, indent=2)}

Generate the complete frontend code. For each file, use this format:

FILE: src/app/page.tsx
[file content here]

FILE: src/components/MyComponent.tsx
[file content here]

Include:
- App Router pages in src/app/
- Reusable components in src/components/
- TailwindCSS styling
- Zustand stores if needed
- API client for backend calls
"""

        try:
            response = await self.call_llm(frontend_prompt)

            # Parse generated files
            files = self._parse_files(response)

            # Update state with generated files
            if "files" not in state:
                state["files"] = {}
            state["files"].update(files)
            state["frontend_output"] = response
            state["frontend_done"] = True

            await self.log(state, "INFO", f"Generated {len(files)} frontend files")

            # Emit socket event
            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "completed",
                "message": f"Generated {len(files)} files"
            })

        except Exception as e:
            state["status"] = "FAILED"
            state["error"] = str(e)
            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "failed",
                "message": f"Frontend generation failed: {str(e)}"
            })

        return state

    def _parse_files(self, content: str) -> Dict[str, str]:
        """Parse generated files from LLM response."""
        files = {}
        lines = content.split('\n')
        current_file = None
        current_content = []

        for line in lines:
            if line.startswith('FILE: '):
                if current_file:
                    files[current_file] = '\n'.join(current_content)
                current_file = line.replace('FILE: ', '').strip()
                current_content = []
            elif current_file:
                current_content.append(line)

        if current_file:
            files[current_file] = '\n'.join(current_content)

        return files
```

*(Continue implementing backend.py, database.py, devops.py, qa.py, security.py, documentation.py following similar patterns)*

- [ ] **Step 3: Implement Database Agent**

```python
# apps/orchestrator/agents/database.py
"""
Database Agent - Designs schemas, writes migrations, queries, indexes, seeds.
"""

import os
import json
from typing import Dict, Any
from anthropic import AsyncAnthropic
from .base import BaseAgent

SYSTEM_PROMPT = """You are the Database Agent for SwarmDev.

Your role:
1. Design normalized database schemas from requirements
2. Write Prisma schema files
3. Generate migration files
4. Write efficient queries and stored procedures
5. Design indexes for performance
6. Write seed data scripts

Output format:
- Generate Prisma schema (schema.prisma)
- Generate migration SQL files
- Each file should follow database best practices
"""

class DatabaseAgent(BaseAgent):
    def __init__(self):
        super().__init__("DATABASE", SYSTEM_PROMPT)
        self.client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        user_prompt = state.get("user_prompt", "")
        task_plan = state.get("task_plan", [])

        db_tasks = [t for t in task_plan if t.get("agentType") == "DATABASE"]

        if not db_tasks:
            state["database_completed"] = True
            return state

        await self.log(state, "INFO", f"Starting database design with {len(db_tasks)} tasks")

        db_prompt = f"""
Design a database schema for this project:

User Requirements:
{user_prompt}

Your Tasks:
{json.dumps(db_tasks, indent=2)}

Generate:
1. Prisma schema (schema.prisma) with all models
2. Migration SQL files
3. Seed data scripts

Use this format:

FILE: prisma/schema.prisma
[Prisma schema content]

FILE: prisma/migrations/20240101_init/migration.sql
[SQL migration content]

FILE: prisma/seed.ts
[Seed script content]
"""

        try:
            response = await self.call_llm(db_prompt)
            files = self._parse_files(response)

            if "files" not in state:
                state["files"] = {}
            state["files"].update(files)
            state["database_output"] = response
            state["database_completed"] = True

            await self.log(state, "INFO", f"Generated database schema with {len(files)} files")

            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "completed",
                "message": f"Generated {len(files)} database files"
            })

        except Exception as e:
            state["status"] = "FAILED"
            state["error"] = str(e)
            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "failed",
                "message": f"Database design failed: {str(e)}"
            })

        return state

    def _parse_files(self, content: str) -> Dict[str, str]:
        """Parse generated files from LLM response."""
        files = {}
        lines = content.split('\n')
        current_file = None
        current_content = []

        for line in lines:
            if line.startswith('FILE: '):
                if current_file:
                    files[current_file] = '\n'.join(current_content)
                current_file = line.replace('FILE: ', '').strip()
                current_content = []
            elif current_file:
                current_content.append(line)

        if current_file:
            files[current_file] = '\n'.join(current_content)

        return files
```

*(Continue with remaining agents: backend.py, devops.py, qa.py, security.py, documentation.py)*

- [ ] **Step 4: Commit**

```bash
git add apps/orchestrator/agents/
git commit -m "feat: implement all 9 agent types with file generation"
```

---

### Task 8: Implement Socket Emitter Utility for Python

**Files:**
- Modify: `apps/orchestrator/utils/socket_emitter.py`

- [ ] **Step 1: Implement socket emitter**

```python
# apps/orchestrator/utils/socket_emitter.py
"""
Socket.io event emitter for Python orchestrator.
Publishes events to Redis which are bridged to Socket.io by the API server.
"""

import os
import json
import redis.asyncio as redis
from typing import Any, Dict

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
_redis_client = None

async def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    return _redis_client

async def emit(event_type: str, payload: Dict[str, Any]):
    """
    Emit an event to the Socket.io server via Redis pub/sub.

    The API server subscribes to Redis and forwards events to Socket.io clients.
    """
    try:
        r = await get_redis()
        message = json.dumps({
            "type": event_type,
            "payload": payload
        })

        # Publish to Redis channel
        await r.publish("swarmdev:events", message)

    except Exception as e:
        print(f"Error emitting event: {e}")
        # Don't raise - event emission is best-effort
```

- [ ] **Step 2: Commit**

```bash
git add apps/orchestrator/utils/socket_emitter.py
git commit -m "feat: add Python socket emitter with Redis pub/sub"
```

---

### Task 9: Implement Orchestrator Main FastAPI App

**Files:**
- Modify: `apps/orchestrator/main.py`

- [ ] **Step 1: Implement FastAPI app with job endpoint**

```python
# apps/orchestrator/main.py
"""
SwarmDev Orchestrator - FastAPI application.
Receives project generation jobs and runs the LangGraph workflow.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uvicorn
import os

from graph.graph import app as langgraph_app
from graph.state import ProjectState

app = FastAPI(
    title="SwarmDev Orchestrator",
    description="Multi-agent AI development platform orchestration engine",
    version="1.0.0"
)

class JobInput(BaseModel):
    project_id: str
    user_id: str
    user_prompt: str
    tech_stack: Optional[Dict[str, str]] = None

class JobResponse(BaseModel):
    success: bool
    message: str
    project_id: str

@app.get("/health")
async def health_check():
    return {"status": "OK", "version": "1.0.0"}

@app.post("/jobs", response_model=JobResponse)
async def create_job(input: JobInput, background_tasks: BackgroundTasks):
    """
    Create a new project generation job.
    Runs the LangGraph workflow in the background.
    """
    try:
        # Add job to background tasks
        background_tasks.add_task(run_orchestration, input.dict())

        return JobResponse(
            success=True,
            message="Job queued successfully",
            project_id=input.project_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def run_orchestration(job_data: Dict[str, Any]):
    """
    Run the LangGraph orchestration workflow.
    """
    try:
        # Initialize state
        initial_state: ProjectState = {
            "project_id": job_data["project_id"],
            "user_id": job_data["user_id"],
            "user_prompt": job_data["user_prompt"],
            "status": "PLANNING",
            "files": {},
        }

        # Run the graph
        result = await langgraph_app.ainvoke(initial_state)

        # Handle result
        if result.get("status") == "FAILED":
            print(f"Orchestration failed: {result.get('error')}")
        else:
            print(f"Orchestration completed for project {job_data['project_id']}")

    except Exception as e:
        print(f"Error in orchestration: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
```

- [ ] **Step 2: Commit**

```bash
git add apps/orchestrator/main.py
git commit -m "feat: implement FastAPI orchestrator with job queue"
```

---

### Task 10: Create Frontend Project IDE Page

**Files:**
- Create: `apps/web/src/app/project/[id]/page.tsx` (complete implementation)
- Create: `apps/web/src/components/editor/EditorLayout.tsx`

- [ ] **Step 1: Implement project IDE page**

```typescript
// apps/web/src/app/project/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { useProject } from "@/hooks/useProject";
import { useAgents } from "@/hooks/useAgents";
import MonacoEditor from "@/components/editor/MonacoEditor";
import FileTree from "@/components/editor/FileTree";
import AgentPanel from "@/components/agents/AgentPanel";
import ChatWindow from "@/components/chat/ChatWindow";
import Terminal from "@/components/editor/Terminal";

export default function ProjectIDEPage() {
  const params = useParams();
  const projectId = params.id as string;

  const { project, files, loading, error } = useProject(projectId);
  const { agents, agentLogs } = useAgents(projectId);
  const { connected, joinProject, leaveProject } = useSocket();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"agents" | "chat">("agents");

  useEffect(() => {
    if (connected) {
      joinProject(projectId);
    }

    return () => {
      leaveProject(projectId);
    };
  }, [connected, projectId, joinProject, leaveProject]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold">Loading project...</div>
          <div className="mt-2 text-gray-500">Initializing workspace</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-red-500">
          <div className="text-2xl font-bold">Error loading project</div>
          <div className="mt-2">{error}</div>
        </div>
      </div>
    );
  }

  const currentFile = files.find((f) => f.path === selectedFile);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">{project?.name}</h1>
          <span className={`rounded-full px-2 py-1 text-xs ${
            project?.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
            project?.status === 'FAILED' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {project?.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500">
            Deploy
          </button>
          <button className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
            Settings
          </button>
        </div>
      </header>

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <aside className="w-64 border-r overflow-y-auto">
          <FileTree
            files={files}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        </aside>

        {/* Code editor */}
        <main className="flex-1 overflow-hidden">
          {currentFile ? (
            <MonacoEditor
              path={currentFile.path}
              content={currentFile.content}
              language={currentFile.language || 'plaintext'}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              Select a file to edit
            </div>
          )}
        </main>

        {/* Agent panel / Chat */}
        <aside className="w-96 border-l flex flex-col">
          <div className="flex border-b">
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activePanel === 'agents'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActivePanel('agents')}
            >
              Agents
            </button>
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activePanel === 'chat'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActivePanel('chat')}
            >
              Chat
            </button>
          </div>

          {activePanel === 'agents' ? (
            <AgentPanel agents={agents} logs={agentLogs} />
          ) : (
            <ChatWindow projectId={projectId} />
          )}
        </aside>
      </div>

      {/* Bottom panel - Terminal */}
      <div className="h-48 border-t">
        <Terminal projectId={projectId} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/project/
git commit -m "feat: implement project IDE page with editor, file tree, and agent panel"
```

---

### Task 11: Create Environment Configuration Files

**Files:**
- Create: `apps/api/.env.example`
- Create: `apps/web/.env.local.example`
- Create: `apps/orchestrator/.env.example`
- Create: `docker-compose.yml` (local development)

- [ ] **Step 1: API environment file**

```bash
# apps/api/.env.example
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/swarmdev?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Auth (Clerk)
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# E2B
E2B_API_KEY=e2b_xxx

# Storage (Cloudflare R2)
CLOUDFLARE_R2_ACCESS_KEY=xxx
CLOUDFLARE_R2_SECRET_KEY=xxx
CLOUDFLARE_R2_BUCKET=swarmdev
CLOUDFLARE_R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (Resend)
RESEND_API_KEY=re_xxx

# Orchestrator
ORCHESTRATOR_URL=http://localhost:8000
ORCHESTRATOR_SECRET=xxx

# Misc
NODE_ENV=development
PORT=3001
```

- [ ] **Step 2: Web environment file**

```bash
# apps/web/.env.local.example
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

- [ ] **Step 3: Orchestrator environment file**

```bash
# apps/orchestrator/.env.example
ANTHROPIC_API_KEY=sk-ant-xxx
E2B_API_KEY=e2b_xxx
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/swarmdev?schema=public
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=xxx
API_SECRET=xxx
PORT=8000
```

- [ ] **Step 4: Docker Compose for local development**

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: swarmdev-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: swarmdev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: swarmdev-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    container_name: swarmdev-qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  postgres_data:
  redis_data:
  qdrant_data:
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/.env.example apps/web/.env.local.example apps/orchestrator/.env.example docker-compose.yml
git commit -m "feat: add environment configuration files and docker-compose"
```

---

### Task 12: Create Dockerfiles for All Apps

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `apps/web/Dockerfile`
- Create: `apps/orchestrator/Dockerfile`

- [ ] **Step 1: API Dockerfile**

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN pnpm build

FROM base AS runner
WORKDIR /app/apps/api
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Web Dockerfile**

```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN pnpm build

FROM base AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 3: Orchestrator Dockerfile**

```dockerfile
# apps/orchestrator/Dockerfile
FROM python:3.11-slim AS base

FROM base AS deps
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS builder
WORKDIR /app
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY . .

FROM base AS runner
WORKDIR /app
ENV PYTHONUNBUFFERED=1

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /app .

EXPOSE 8000
CMD ["python", "main.py"]
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/Dockerfile apps/web/Dockerfile apps/orchestrator/Dockerfile
git commit -m "feat: add Dockerfiles for all three applications"
```

---

### Task 13: Implement Testing Suite

**Files:**
- Create: `apps/api/src/__tests__/routes.test.ts`
- Create: `apps/orchestrator/tests/test_agents.py`
- Create: `apps/web/src/__tests__/components.test.tsx`

- [ ] **Step 1: API tests**

```typescript
// apps/api/src/__tests__/routes.test.ts
import request from 'supertest';
import app from '../index';
import prisma from '../prisma/client';

describe('API Routes', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
    });
  });

  describe('GET /', () => {
    it('should return API info', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('SwarmDev API');
    });
  });

  describe('GET /api/projects', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
    });
  });
});
```

- [ ] **Step 2: Orchestrator tests**

```python
# apps/orchestrator/tests/test_agents.py
import pytest
import asyncio
from agents.supervisor import SupervisorAgent
from agents.frontend import FrontendAgent
from graph.state import ProjectState

@pytest.fixture
def initial_state():
    return {
        "project_id": "test-123",
        "user_id": "user-123",
        "user_prompt": "Build a todo app",
        "status": "PENDING",
        "files": {},
    }

@pytest.mark.asyncio
async def test_supervisor_agent(initial_state):
    agent = SupervisorAgent()
    result = await agent.run(initial_state)

    assert result["status"] in ["PLANNING", "FAILED"]
    assert "task_plan" in result or "error" in result

@pytest.mark.asyncio
async def test_frontend_agent(initial_state):
    initial_state["task_plan"] = [
        {"id": "1", "title": "Build UI", "agentType": "FRONTEND"}
    ]

    agent = FrontendAgent()
    result = await agent.run(initial_state)

    assert result["frontend_done"] == True
```

- [ ] **Step 3: Frontend component tests**

```typescript
// apps/web/src/__tests__/components.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from '@/components/ui/button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 4: Update package.json files with test scripts**

```json
// apps/api/package.json - add to scripts
"test": "jest --coverage"

// apps/orchestrator/requirements.txt - add
pytest>=7.0.0
pytest-asyncio>=0.21.0

// apps/web/package.json - add to scripts
"test": "vitest run"
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/__tests__/ apps/orchestrator/tests/ apps/web/src/__tests__/
git commit -m "test: add initial test suites for all three apps"
```

---

### Task 14: Create GitHub Actions CI/CD Pipeline

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: swarmdev_test
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pnpm install
      - run: pnpm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pnpm install
      - run: pnpm build
```

- [ ] **Step 2: Deploy workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_CREDENTIALS }}
      - uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: swarmdev-api
          image: gcr.io/${{ secrets.GCP_PROJECT_ID }}/api:${{ github.sha }}

  deploy-orchestrator:
    runs-on: ubuntu-latest
    needs: deploy-api
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_CREDENTIALS }}
      - uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: swarmdev-orchestrator
          image: gcr.io/${{ secrets.GCP_PROJECT_ID }}/orchestrator:${{ github.sha }}

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-api
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/
git commit -m "ci: add GitHub Actions CI/CD pipelines"
```

---

### Task 15: Verify and Run Locally

**Files:**
- Modify: `README.md` (update with complete instructions)

- [ ] **Step 1: Update README with complete setup instructions**

```markdown
# SwarmDev Monorepo

Multi-Agent Cloud Development Platform - describe your project and watch a team of AI agents build it.

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- Python >= 3.11
- pnpm >= 8.0.0
- Docker and Docker Compose

### Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.local.example apps/web/.env.local
   cp apps/orchestrator/.env.example apps/orchestrator/.env
   ```

3. **Start infrastructure services:**
   ```bash
   docker-compose up -d
   ```

4. **Set up the database:**
   ```bash
   cd packages/db
   pnpm prisma generate
   pnpm prisma migrate dev
   pnpm prisma db seed
   ```

5. **Start all applications:**
   ```bash
   pnpm dev
   ```

   Services will be available at:
   - Frontend: http://localhost:3000
   - API: http://localhost:3001
   - Orchestrator: http://localhost:8000

## Testing

```bash
pnpm test
```

## Project Structure

See docs/PROJECT_BLUEPRINT.md for complete architecture details.
```

- [ ] **Step 2: Run verification commands**

```bash
# Verify all apps build
pnpm build

# Run tests
pnpm test

# Start dev servers
pnpm dev
```

Expected: All apps start without errors

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README with complete setup instructions"
```

---

## Phase 1 Complete ✅

At this point, the foundation is complete:
- ✅ Monorepo with all packages configured
- ✅ Database schema and migrations
- ✅ API with all routes and services
- ✅ Socket.io real-time communication
- ✅ Orchestrator with all 9 agents
- ✅ Frontend IDE page
- ✅ Docker and CI/CD
- ✅ Testing infrastructure

## Remaining Phases (Summary)

### Phase 2: Advanced Features (Tasks 16-25)
- Task 16: Implement E2B sandbox integration
- Task 17: Implement Cloudflare R2 storage
- Task 18: Implement Stripe billing
- Task 19: Add auth pages (login/signup)
- Task 20: Complete dashboard page
- Task 21: Implement chat with agents
- Task 22: Add code review agent
- Task 23: Add security scanning agent
- Task 24: Implement project ZIP export
- Task 25: Add GitHub integration

### Phase 3: Power Features (Tasks 26-30)
- Task 26: RAG over project context (Qdrant)
- Task 27: Multi-turn conversation
- Task 28: Collaborative projects
- Task 29: Usage analytics dashboard
- Task 30: One-click deploy integrations

---

**Plan complete.** Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch fresh subagent per task with review between tasks
2. **Inline Execution** - Execute tasks in this session using executing-plans skill

Which approach?
