import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../prisma/client';
import { z } from 'zod';

const router = Router();

const commitSchema = z.object({
  message: z.string().min(1, 'Commit message is required'),
  files: z.array(z.string()).optional(),
});

// Initialize git repo
router.post('/:projectId/git/init', authMiddleware, async (req: Request, res: Response) => {
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

    // TODO: Initialize git in E2B sandbox
    res.json({
      success: true,
      message: 'Git repository initialized',
    });
  } catch (error) {
    console.error('Error initializing git:', error);
    res.status(500).json({ error: 'Failed to initialize git' });
  }
});

// Push to GitHub
router.post('/:projectId/git/push', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;
    const { githubRepo, githubToken } = req.body;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!githubRepo) {
      return res.status(400).json({ error: 'GitHub repository is required' });
    }

    // TODO: Push to GitHub using the provided token
    res.json({
      success: true,
      message: `Pushed to ${githubRepo}`,
    });
  } catch (error) {
    console.error('Error pushing to GitHub:', error);
    res.status(500).json({ error: 'Failed to push to GitHub' });
  }
});

// Get git status
router.get('/:projectId/git/status', authMiddleware, async (req: Request, res: Response) => {
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

    // TODO: Get actual git status from sandbox
    res.json({
      branch: 'main',
      clean: true,
      ahead: 0,
      behind: 0,
      files: [],
    });
  } catch (error) {
    console.error('Error getting git status:', error);
    res.status(500).json({ error: 'Failed to get git status' });
  }
});

// Manual commit
router.post('/:projectId/git/commit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;
    const { message, files } = req.body;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const validatedData = commitSchema.parse({ message });

    // TODO: Create git commit in sandbox
    res.json({
      success: true,
      message: `Committed: ${validatedData.message}`,
      sha: 'abc123',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error('Error creating commit:', error);
      res.status(500).json({ error: 'Failed to create commit' });
    }
  }
});

export default router;
