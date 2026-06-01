import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../prisma/client';
import { emitAgentStatus, emitAgentLog } from '../socket';

const router = Router();

// Get all agent runs for a project
router.get('/projects/:projectId/agents', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const agentRuns = await prisma.agentRun.findMany({
      where: { projectId },
      include: {
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(agentRuns);
  } catch (error) {
    console.error('Error fetching agent runs:', error);
    res.status(500).json({ error: 'Failed to fetch agent runs' });
  }
});

// Get specific agent run details
router.get('/projects/:projectId/agents/:agentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId, agentId } = req.params;
    const user = (req as any).user;
    const userId = user.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const agentRun = await prisma.agentRun.findUnique({
      where: { id: agentId },
      include: {
        logs: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!agentRun || agentRun.projectId !== projectId) {
      return res.status(404).json({ error: 'Agent run not found' });
    }

    res.json(agentRun);
  } catch (error) {
    console.error('Error fetching agent run:', error);
    res.status(500).json({ error: 'Failed to fetch agent run' });
  }
});

// Send message to a specific agent
router.post('/projects/:projectId/agents/message', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { agentId, content } = req.body;
    const user = (req as any).user;
    const userId = user.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Save the message to chat
    const message = await prisma.chatMessage.create({
      data: {
        projectId,
        role: 'USER',
        content,
      },
    });

    // Emit to socket for real-time update
    emitAgentStatus(projectId, 'SUPERVISOR', 'MESSAGE_RECEIVED', 'User sent a message');

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Stream agent logs (SSE)
router.get('/projects/:projectId/agents/logs', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Fetch recent logs
    const logs = await prisma.agentLog.findMany({
      where: {
        agentRun: {
          projectId,
        },
      },
      include: {
        agentRun: {
          select: {
            agentType: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    // Send existing logs
    for (const log of logs.reverse()) {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    }

    // TODO: Set up real-time subscription to new logs
    // For now, just keep connection open
    const interval = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
    }, 30000);

    req.socket.on('close', () => {
      clearInterval(interval);
    });
  } catch (error) {
    console.error('Error streaming logs:', error);
    res.status(500).json({ error: 'Failed to stream logs' });
  }
});

export default router;
