import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import db from '../prisma/client';
import { z } from 'zod';
import { gitService } from '../services/gitService';

const router = Router();

const commitSchema = z.object({
  message: z.string().min(1, 'Commit message is required'),
  files: z.array(z.string()).optional(),
});

async function assertProjectAccess(projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) {
    return null;
  }
  return project;
}

function handleGitError(res: Response, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('E2B') || message.includes('API key')) {
    return res.status(503).json({
      error: 'Sandbox unavailable',
      message: 'Set E2B_API_KEY in apps/api/.env to enable git operations.',
    });
  }
  console.error(fallback, error);
  return res.status(500).json({ error: fallback });
}

// Initialize git repo
router.post('/:projectId/git/init', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const project = await assertProjectAccess(projectId, user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const result = await gitService.init(projectId);
    res.json({ success: true, ...result });
  } catch (error) {
    return handleGitError(res, error, 'Failed to initialize git');
  }
});

// Push to GitHub
router.post('/:projectId/git/push', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const { githubRepo, githubToken } = req.body;

    const project = await assertProjectAccess(projectId, user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!githubRepo) {
      return res.status(400).json({ error: 'GitHub repository is required' });
    }

    const result = await gitService.push(projectId, githubRepo, githubToken);
    res.json({ success: true, message: `Pushed to ${result.repo}` });
  } catch (error) {
    return handleGitError(res, error, 'Failed to push to GitHub');
  }
});

// Get git status
router.get('/:projectId/git/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;

    const project = await assertProjectAccess(projectId, user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const status = await gitService.status(projectId);
    res.json(status);
  } catch (error) {
    return handleGitError(res, error, 'Failed to get git status');
  }
});

// Manual commit
router.post('/:projectId/git/commit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const { message, files } = req.body;

    const project = await assertProjectAccess(projectId, user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const validatedData = commitSchema.parse({ message, files });
    const result = await gitService.commit(projectId, validatedData.message, validatedData.files);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return handleGitError(res, error, 'Failed to create commit');
  }
});

export default router;
