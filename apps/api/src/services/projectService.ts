import prisma from '../prisma/client';
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

export const projectService = {
  async getAllProjects(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          agents: {
            select: {
              agentType: true,
              status: true,
              completedAt: true,
            },
          },
        },
      }),
      prisma.project.count({
        where: { userId },
      }),
    ]);

    return {
      projects,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getProjectById(projectId: string, userId: string) {
    return prisma.project.findUnique({
      where: { id: projectId, userId },
      include: {
        agents: {
          orderBy: { createdAt: 'desc' },
          include: {
            logs: {
              orderBy: { timestamp: 'desc' },
              take: 50,
            },
          },
        },
        files: {
          select: {
            id: true,
            path: true,
            language: true,
            version: true,
            createdAt: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  },

  async createProject(input: CreateProjectInput) {
    const project = await prisma.project.create({
      data: {
        userId: input.userId,
        name: input.name,
        description: input.description,
        techStack: input.techStack || {},
        status: 'PENDING',
      },
    });

    // Emit socket event
    emitProjectStatus(project.id, 'PENDING');

    return project;
  },

  async updateProject(projectId: string, userId: string, data: Partial<CreateProjectInput>) {
    const project = await prisma.project.update({
      where: { id: projectId, userId },
      data,
    });

    return project;
  },

  async deleteProject(projectId: string, userId: string) {
    // First delete related records
    await prisma.buildLog.deleteMany({ where: { projectId } });
    await prisma.chatMessage.deleteMany({ where: { projectId } });
    await prisma.projectFile.deleteMany({ where: { projectId } });
    await prisma.agentLog.deleteMany({
      where: {
        agentRun: {
          projectId,
        },
      },
    });
    await prisma.agentRun.deleteMany({ where: { projectId } });

    // Then delete the project
    await prisma.project.delete({
      where: { id: projectId, userId },
    });
  },

  async startAgentPipeline(projectId: string) {
    // Get project with user info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { user: true },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'PLANNING' },
    });

    emitProjectStatus(projectId, 'PLANNING');
    emitAgentStatus(projectId, 'SUPERVISOR', 'RUNNING', 'Starting project planning');

    // Create agent run records for tracking
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
      await prisma.agentRun.create({
        data: {
          projectId,
          agentType,
          status: 'RUNNING',
          tokenUsed: 0,
          input: { user_prompt: project.description },
        },
      });
    }

    // Call orchestrator HTTP API with full project context (fixes Issue #3)
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
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'FAILED' },
      });
      emitProjectStatus(projectId, 'FAILED');
      throw error;
    }
  },
};

export default projectService;
