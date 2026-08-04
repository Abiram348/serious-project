import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import db from '../prisma/client';
import { sandboxService } from '../services/sandboxService';

const router = Router();

// Execute shell command in sandbox
router.post('/:projectId/terminal/exec', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;
    const { command } = req.body;

    const project = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const sandbox = await sandboxService.getOrCreateSandbox(projectId);
    const result = await sandboxService.executeCommand(sandbox, command, projectId);

    res.json({
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    });
  } catch (error) {
    console.error('Error executing command:', error);
    res.status(500).json({ error: 'Failed to execute command' });
  }
});

// Stream terminal output (SSE)
router.get('/:projectId/terminal/stream', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;

    const project = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Fetch recent build logs
    const logs = await db.buildLog.findMany({
      where: { projectId },
      select: { stream: true },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    // Send existing logs
    for (const log of logs.reverse()) {
      res.write(`data: ${JSON.stringify({ type: 'output', data: log.stream })}\n\n`);
    }

    // Keep connection open with heartbeats
    const interval = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
    }, 30000);

    req.socket.on('close', () => {
      clearInterval(interval);
    });
  } catch (error) {
    console.error('Error streaming terminal:', error);
    res.status(500).json({ error: 'Failed to stream terminal' });
  }
});

export default router;
