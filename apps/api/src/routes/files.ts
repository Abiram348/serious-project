import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../prisma/client';
import { z } from 'zod';
import { emitFileCreated, emitFileUpdated } from '../socket';

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

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const files = await prisma.projectFile.findMany({
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

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const file = await prisma.projectFile.findFirst({
      where: { projectId, path: filePath },
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      path: file.path,
      content: file.content,
      language: file.language,
      version: file.version,
      createdBy: file.createdBy,
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

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { content, language } = req.body;

    const file = await prisma.projectFile.create({
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

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { content } = req.body;

    const file = await prisma.projectFile.update({
      where: { projectId_path: { projectId, path: filePath } },
      data: {
        content,
        version: { increment: 1 },
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

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await prisma.projectFile.delete({
      where: { projectId_path: { projectId, path: filePath } },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ── Internal routes (orchestrator → API, X-API-SECRET auth) ──

// Save file from orchestrator (upsert)
router.post('/internal/projects/:projectId/files/:path(*)', internalAuth, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const filePath = (req.params as any).path;

    const { content, language, createdBy } = req.body;

    const existing = await prisma.projectFile.findUnique({
      where: { projectId_path: { projectId, path: filePath } },
    });

    let file;
    if (existing) {
      file = await prisma.projectFile.update({
        where: { projectId_path: { projectId, path: filePath } },
        data: {
          content,
          language: language || existing.language,
          createdBy: createdBy || existing.createdBy,
          version: { increment: 1 },
        },
      });
      emitFileUpdated(projectId, filePath, content, createdBy);
    } else {
      file = await prisma.projectFile.create({
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
        current[part] = {
          type: 'file',
          ...file,
        };
      } else {
        if (!current[part]) {
          current[part] = {
            type: 'folder',
            name: part,
            children: {} as Record<string, unknown>,
          };
        }
        current = (current[part] as { children: Record<string, unknown> }).children;
      }
    }
  }

  return root;
}

export default router;
