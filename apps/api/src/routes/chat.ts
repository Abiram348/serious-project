import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../prisma/client';
import { z } from 'zod';

const router = Router();

const messageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
});

// Get chat history for a project
router.get('/:projectId/chat', authMiddleware, async (req: Request, res: Response) => {
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

    const messages = await prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

// Send message to Supervisor agent
router.post('/:projectId/chat', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;
    const { content } = req.body;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const validatedData = messageSchema.parse({ content });

    const message = await prisma.chatMessage.create({
      data: {
        projectId,
        role: 'USER',
        content: validatedData.content,
      },
    });

    // TODO: Trigger Supervisor agent response
    // This would call the orchestrator to process the message

    res.status(201).json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
});

// Clear chat history
router.delete('/:projectId/chat', authMiddleware, async (req: Request, res: Response) => {
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

    await prisma.chatMessage.deleteMany({
      where: { projectId },
    });

    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('Error clearing chat:', error);
    res.status(500).json({ error: 'Failed to clear chat' });
  }
});

export default router;
