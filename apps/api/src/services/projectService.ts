import db from '../prisma/client';
import { emitProjectStatus, emitAgentStatus } from '../socket';

export interface CreateProjectInput {
  userId: string;
  name: string;
  description: string;
  techStack?: {
    frontend?: string;
    backend?: string;
    db?: string;
  };
}

export interface ProjectService {
  getAllProjects(userId: string, page?: number, limit?: number): Promise<any>;
  getProjectById(projectId: string, userId: string): Promise<any>;
  createProject(input: CreateProjectInput): Promise<any>;
  updateProject(projectId: string, userId: string, data: Partial<CreateProjectInput>): Promise<any>;
  deleteProject(projectId: string, userId: string): Promise<void>;
  startAgentPipeline(projectId: string): Promise<void>;
}

export const projectService: ProjectService = {
  async getAllProjects(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [projectsList, total] = await Promise.all([
      db.project.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.project.count({ where: { userId } }),
    ]);
    // For each project, fetch a summary of agents (latest status)
    const projectsWithAgents = await Promise.all(
      projectsList.map(async (proj) => {
        const agents = await db.agentRun.findMany({
          where: { projectId: proj.id },
          orderBy: { createdAt: 'desc' },
        });
        return { ...proj, agents };
      })
    );
    return {
      projects: projectsWithAgents,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getProjectById(projectId: string, userId: string) {
    const proj = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!proj) return null;
    // Fetch agents with latest logs (limit 50 per agent)
    const agentsRaw = await db.agentRun.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    // Fetch all logs in one query to avoid connection-pool exhaustion
    const runIds = agentsRaw.map((r) => r.id);
    const allLogs = runIds.length
      ? await db.agentLog.findMany({
          where: { agentRunId: { in: runIds } },
          orderBy: { timestamp: 'desc' },
        })
      : [];
    const logsByRunId = new Map<string, typeof allLogs>();
    for (const log of allLogs) {
      const arr = logsByRunId.get(log.agentRunId) || [];
      arr.push(log);
      logsByRunId.set(log.agentRunId, arr);
    }
    const agents = agentsRaw.map((run) => ({
      ...run,
      logs: (logsByRunId.get(run.id) || []).slice(0, 50),
    }));
    // Files
    const files = await db.projectFile.findMany({
      where: { projectId },
      select: { id: true, path: true, language: true, version: true, createdAt: true },
    });
    // Messages
    const messages = await db.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { ...proj, agents, files, messages };
  },

  async createProject(input: CreateProjectInput) {
    const created = await db.project.create({
      data: {
        userId: input.userId,
        name: input.name,
        description: input.description,
        techStack: input.techStack || {},
        status: 'PENDING',
      },
    });
    // Emit socket event
    emitProjectStatus(created.id, 'PENDING');
    return created;
  },

  async updateProject(projectId: string, userId: string, data: Partial<CreateProjectInput>) {
    return db.project.update({
      where: { id: projectId, userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.techStack && { techStack: data.techStack }),
      },
    });
  },

  async deleteProject(projectId: string, userId: string) {
    // Cascade: delete children first (defensive — Prisma cascade handles most)
    const runs = await db.agentRun.findMany({
      where: { projectId },
      select: { id: true },
    });
    const runIds = runs.map((r) => r.id);
    if (runIds.length) {
      await db.agentLog.deleteMany({ where: { agentRunId: { in: runIds } } });
      await db.agentRun.deleteMany({ where: { id: { in: runIds } } });
    }
    await db.buildLog.deleteMany({ where: { projectId } });
    await db.chatMessage.deleteMany({ where: { projectId } });
    await db.projectFile.deleteMany({ where: { projectId } });
    await db.project.deleteMany({ where: { id: projectId, userId } });
  },

  async startAgentPipeline(projectId: string) {
    const project = await db.project.findFirst({ where: { id: projectId } });
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    // Update status to PLANNING
    await db.project.update({
      where: { id: projectId },
      data: { status: 'PLANNING' },
    });
    emitProjectStatus(projectId, 'PLANNING');
    emitAgentStatus(projectId, 'SUPERVISOR', 'RUNNING', 'Starting project planning');
    const agentTypes = [
      'SUPERVISOR',
      'FRONTEND',
      'BACKEND',
      'DATABASE',
      'DEVOPS',
      'QA',
      'REVIEWER',
      'SECURITY',
      'DOCUMENTATION',
    ] as const;
    for (const agentType of agentTypes) {
      await db.agentRun.create({
        data: {
          projectId,
          agentType,
          status: 'RUNNING',
          tokenUsed: 0,
          input: { user_prompt: project.description },
        },
      });
    }
    // Call orchestrator API
    const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${orchestratorUrl}/projects/${projectId}/agents/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-SECRET': process.env.ORCHESTRATOR_SECRET || 'dev-secret',
          'X-USER-ID': project.userId,
          'X-USER-PROMPT': project.description || 'Build a web application',
          'X-TECH-STACK': JSON.stringify(project.techStack || {}),
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Orchestrator call failed: ${response.status} ${errorText}`);
      }
      const result = await response.json();
      console.log(`🚀 Agent pipeline started for project ${projectId}:`, result);
      emitProjectStatus(projectId, 'IN_PROGRESS');
    } catch (error) {
      console.error('Failed to call orchestrator:', error);
      await db.project.update({
        where: { id: projectId },
        data: { status: 'FAILED' },
      });
      emitProjectStatus(projectId, 'FAILED');
      throw error;
    }
  },
};

export default projectService;
