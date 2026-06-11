import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import db from '../prisma/client';
import { z } from 'zod';

const router = Router();

const messageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  targetAgent: z.string().optional(),
  model: z.string().optional(),
});

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:8000';
const ORCHESTRATOR_SECRET = process.env.ORCHESTRATOR_SECRET || '';

// Get chat history for a project
router.get('/:projectId/chat', authMiddleware, async (req: Request, res: Response) => {
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

    const messages = await db.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

// Send message to agents — now actually triggers orchestrator and waits for response
router.post('/:projectId/chat', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;
    const { content, targetAgent, model } = req.body;

    const project = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const validatedData = messageSchema.parse({ content, targetAgent, model });

    // 1. Save user message
    const userMessage = await db.chatMessage.create({
      data: {
        projectId,
        role: 'USER',
        content: validatedData.content,
        targetAgent: validatedData.targetAgent || null,
        model: validatedData.model || null,
      },
    });

    // 2. Call orchestrator /chat endpoint and WAIT for response
    let agentResponse: { agent: string; model: string; agent_response: string } | null = null;
    let agentError: string | null = null;

    try {
      const orchestratorRes = await fetch(`${ORCHESTRATOR_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-SECRET': ORCHESTRATOR_SECRET,
        },
        body: JSON.stringify({
          project_id: projectId,
          content: validatedData.content,
          target_agent: validatedData.targetAgent || undefined,
          model: validatedData.model || undefined,
        }),
      });

      if (orchestratorRes.ok) {
        const data = await orchestratorRes.json() as { agent: string; model: string; agent_response: string };
        agentResponse = data;
      } else {
        const errorText = await orchestratorRes.text();
        agentError = `Orchestrator error (${orchestratorRes.status}): ${errorText}`;
      }
    } catch (fetchError) {
      agentError = `Failed to reach orchestrator: ${fetchError}`;
    }

    // 3. Save agent response to DB
    let agentMessage;
    if (agentResponse) {
      agentMessage = await db.chatMessage.create({
        data: {
          projectId,
          role: 'AGENT',
          agentType: agentResponse.agent,
          targetAgent: agentResponse.agent,
          model: agentResponse.model,
          content: agentResponse.agent_response,
        },
      });
    } else {
      agentMessage = await db.chatMessage.create({
        data: {
          projectId,
          role: 'SYSTEM',
          content: agentError || 'No response from agents.',
        },
      });
    }

    // 4. Emit via Socket.io for real-time updates
    const { getIO } = await import('../socket');
    const io = getIO();
    io.to(`project:${projectId}`).emit('chat_message', { messages: [userMessage, agentMessage] });

    // 5. Return both messages
    res.status(201).json({ userMessage, agentMessage });
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

    const project = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await db.chatMessage.deleteMany({ where: { projectId } });

    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('Error clearing chat:', error);
    res.status(500).json({ error: 'Failed to clear chat' });
  }
});

export default router;
