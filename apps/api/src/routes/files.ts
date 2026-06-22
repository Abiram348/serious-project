import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import db from '../prisma/client';
import { z } from 'zod';
import { emitFileCreated, emitFileUpdated, emitProjectStatus } from '../socket';

const router = Router();

const fileSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  content: z.string().min(1, 'Content is required'),
  language: z.string().optional(),
});

// ── Internal auth for orchestrator → API calls ──
function internalAuth(req: Request, res: Response, next: Function) {
  const secret = req.headers['x-api-secret'] as string;
  const expected = process.env.ORCHESTRATOR_SECRET || 'dev-secret';
  if (!secret || secret !== expected) {
    return res.status(403).json({ error: 'Invalid internal secret' });
  }
  next();
}

// ── User-facing routes (Clerk auth) ──

// List all project files (tree structure)
router.get('/projects/:projectId/files', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;

    const proj = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!proj) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const files = await db.projectFile.findMany({
      where: { projectId },
      select: {
        id: true,
        path: true,
        language: true,
        createdBy: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { path: 'asc' },
    });

    const fileTree = buildFileTree(files);
    res.json(fileTree);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get file content
router.get('/projects/:projectId/files/*', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;
    const filePath = req.params[0];

    const proj = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!proj) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const f = await db.projectFile.findFirst({
      where: { projectId, path: filePath },
    });
    if (!f) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      path: f.path,
      content: f.content,
      language: f.language,
      version: f.version,
      createdBy: f.createdBy,
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// Create new file (user)
router.post('/projects/:projectId/files/*', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;
    const filePath = req.params[0];

    const proj = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!proj) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { content, language } = req.body;

    const file = await db.projectFile.create({
      data: {
        projectId,
        path: filePath,
        content,
        language,
        createdBy: null,
      },
    });

    emitFileCreated(projectId, filePath, content, 'USER');
    res.status(201).json(file);
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: 'Failed to create file' });
  }
});

// Update file content (user)
router.patch('/projects/:projectId/files/*', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;
    const filePath = req.params[0];

    const proj = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!proj) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { content } = req.body;

    // Look up current version, then increment (Prisma can't do `version + 1` directly without raw)
    const existing = await db.projectFile.findFirst({
      where: { projectId, path: filePath },
    });
    if (!existing) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = await db.projectFile.update({
      where: { id: existing.id },
      data: {
        content,
        version: existing.version + 1,
      },
    });

    emitFileUpdated(projectId, filePath, content, 'USER');
    res.json(file);
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// Delete file
router.delete('/projects/:projectId/files/*', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const userId = user.id;
    const filePath = req.params[0];

    const proj = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!proj) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await db.projectFile.deleteMany({
      where: { projectId, path: filePath },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ── Internal routes (orchestrator → API, X-API-SECRET auth) ──
router.post('/internal/projects/:projectId/files/:path(*)', internalAuth, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const filePath = (req.params as any).path;
    const { content, language, createdBy } = req.body;

    // Upsert logic
    const exists = await db.projectFile.findFirst({
      where: { projectId, path: filePath },
    });

    let file;
    if (exists) {
      file = await db.projectFile.update({
        where: { id: exists.id },
        data: {
          content,
          language: language || exists.language,
          createdBy: createdBy || exists.createdBy,
          version: exists.version + 1,
        },
      });
      emitFileUpdated(projectId, filePath, content, createdBy);
    } else {
      file = await db.projectFile.create({
        data: {
          projectId,
          path: filePath,
          content,
          language,
          createdBy: createdBy || 'AGENT',
        },
      });
      emitFileCreated(projectId, filePath, content, createdBy);
    }

    res.status(201).json(file);
  } catch (error) {
    console.error('Error saving file from orchestrator:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// Update project status from orchestrator
router.patch('/internal/projects/:id/status', internalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const project = await db.project.update({
      where: { id },
      data: { status },
    });

    // Emit real-time status update
    emitProjectStatus(id, status);

    res.json(project);
  } catch (error) {
    console.error('Error updating project status internally:', error);
    res.status(500).json({ error: 'Failed to update project status' });
  }
});

// ── Helpers ──
function buildFileTree(files: Array<{ path: string; [key: string]: unknown }>) {
  const root: Record<string, unknown> = {};
  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (isFile) {
        current[part] = { type: 'file', name: part, ...file };
      } else {
        if (!current[part]) {
          current[part] = { type: 'folder', name: part, children: {} as Record<string, unknown> };
        }
        current = (current[part] as { children: Record<string, unknown> }).children;
      }
    }
  }
  return root;
}

export default router;
