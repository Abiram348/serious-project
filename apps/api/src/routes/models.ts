import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import db from '../prisma/client';
import { z } from 'zod';

const router = Router();

// Recommended default model assignments per agent
const RECOMMENDED_DEFAULTS: Record<string, string> = {
  SUPERVISOR: 'llama4',
  REVIEWER: 'llama4',
  SECURITY: 'llama4',
  FRONTEND: 'kimi',
  BACKEND: 'codellama',
  DATABASE: 'codellama',
  QA: 'codellama',
  DEVOPS: 'mistral-small',
  DOCUMENTATION: 'mistral-small',
};

const updateSchema = z.object({
  preferences: z.record(z.string()),
});

// Get model preferences for a project
router.get('/:projectId/models', authMiddleware, async (req: Request, res: Response) => {
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

    const prefs = await db.modelPreference.findUnique({
      where: { projectId },
    });

    const stored = (prefs?.preferences as Record<string, string>) || {};

    // Merge: stored overrides recommended
    const merged = { ...RECOMMENDED_DEFAULTS, ...stored };

    res.json({
      projectId,
      preferences: merged,
      recommended: RECOMMENDED_DEFAULTS,
      isCustom: Object.keys(stored).length > 0,
    });
  } catch (error) {
    console.error('Error fetching model preferences:', error);
    res.status(500).json({ error: 'Failed to fetch model preferences' });
  }
});

// Update model preferences for a project
router.post('/:projectId/models', authMiddleware, async (req: Request, res: Response) => {
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

    const { preferences } = updateSchema.parse(req.body);

    const updated = await db.modelPreference.upsert({
      where: { projectId },
      create: {
        projectId,
        preferences,
      },
      update: {
        preferences,
      },
    });

    res.json({
      projectId,
      preferences: updated.preferences,
      message: 'Model preferences updated',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error('Error updating model preferences:', error);
      res.status(500).json({ error: 'Failed to update model preferences' });
    }
  }
});

// Reset to recommended defaults
router.delete('/:projectId/models', authMiddleware, async (req: Request, res: Response) => {
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

    await db.modelPreference.deleteMany({ where: { projectId } });

    res.json({
      projectId,
      preferences: RECOMMENDED_DEFAULTS,
      message: 'Reset to recommended defaults',
    });
  } catch (error) {
    console.error('Error resetting model preferences:', error);
    res.status(500).json({ error: 'Failed to reset model preferences' });
  }
});

export default router;
