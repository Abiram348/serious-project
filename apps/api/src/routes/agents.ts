import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import db from '../prisma/client';
import { emitAgentStatus, emitAgentLog } from '../socket';

const router = Router();

// Helper to fetch a project owned by a user
async function getUserProject(userId: string, projectId: string) {
  return db.project.findFirst({ where: { id: projectId, userId } });
}

// Get all agent runs for a project
router.get('/projects/:projectId/agents', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;

    const project = await getUserProject(userId, projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const runs = await db.agentRun.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(runs);
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

    const project = await getUserProject(userId, projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const agentRun = await db.agentRun.findFirst({ where: { id: agentId } });
    if (!agentRun || agentRun.projectId !== projectId) {
      return res.status(404).json({ error: 'Agent run not found' });
    }

    const logs = await db.agentLog.findMany({
      where: { agentRunId: agentId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    res.json({ ...agentRun, logs });
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

    const project = await getUserProject(userId, projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const message = await db.chatMessage.create({
      data: { projectId, role: 'USER', content },
    });

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

    const project = await getUserProject(userId, projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Fetch recent logs for all runs of this project
    const runs = await db.agentRun.findMany({
      where: { projectId },
      select: { id: true },
    });
    const runIds = runs.map((r) => r.id);
    const logs = runIds.length
      ? await db.agentLog.findMany({
          where: { agentRunId: { in: runIds } },
          orderBy: { timestamp: 'desc' },
          take: 100,
        })
      : [];

    // Send existing logs
    for (const log of logs.reverse()) {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    }

    // Heartbeat interval to keep connection alive
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
