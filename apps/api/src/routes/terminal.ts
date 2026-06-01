import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../prisma/client';
import { emitTerminalOutput } from '../socket';

const router = Router();

// Execute shell command in sandbox
router.post('/:projectId/terminal/exec', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;
    const { command } = req.body;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // TODO: Execute command in E2B sandbox
    // For now, return a placeholder response
    res.json({
      success: true,
      output: `Command executed: ${command}`,
      exitCode: 0,
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

    // Fetch recent build logs
    const logs = await prisma.buildLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
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
