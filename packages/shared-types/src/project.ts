export enum ProjectStatus {
  PENDING = 'PENDING',
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEWING = 'REVIEWING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

export enum Plan {
  FREE = 'FREE',
  PRO = 'PRO',
  TEAM = 'TEAM',
  ENTERPRISE = 'ENTERPRISE',
}

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  plan: Plan;
  credits: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  techStack: Record<string, any>; // { frontend: string, backend: string, db: string }
  sandboxId?: string;
  previewUrl?: string;
  githubRepo?: string;
  deployUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentType {
  SUPERVISOR: 'SUPERVISOR';
  FRONTEND: 'FRONTEND';
  BACKEND: 'BACKEND';
  DATABASE: 'DATABASE';
  DEVOPS: 'DEVOPS';
  QA: 'QA';
  REVIEWER: 'REVIEWER';
  SECURITY: 'SECURITY';
  DOCUMENTATION: 'DOCUMENTATION';
}

export const AgentType = {
  SUPERVISOR: 'SUPERVISOR',
  FRONTEND: 'FRONTEND',
  BACKEND: 'BACKEND',
  DATABASE: 'DATABASE',
  DEVOPS: 'DEVOPS',
  QA: 'QA',
  REVIEWER: 'REVIEWER',
  SECURITY: 'SECURITY',
  DOCUMENTATION: 'DOCUMENTATION',
};

export enum AgentStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  WAITING = 'WAITING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface AgentRun {
  id: string;
  projectId: string;
  agentType: keyof typeof AgentType;
  status: AgentStatus;
  input?: Record<string, any>;
  output?: Record<string, any>;
  startedAt?: string;
  completedAt?: string;
  errorMsg?: string;
  tokenUsed: number;
  createdAt: string;
}