import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import db from '../prisma/client';
import { z } from 'zod';
import { projectService } from '../services/projectService';
import { emitProjectStatus } from '../socket';

const router = Router();

// Validation schemas
const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  techStack: z.object({
    frontend: z.string().optional(),
    backend: z.string().optional(),
    db: z.string().optional(),
  }).optional(),
});

// Get all projects for the authenticated user (with pagination)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await projectService.getAllProjects(userId, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create a new project
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const validatedData = projectSchema.parse(req.body);
    const { userId: clerkId } = (req as any).auth || {};

    if (!clerkId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Ensure the user exists in our DB, create if missing
    let user = (req as any).user;
    if (!user) {
      user = await db.user.findFirst({ where: { clerkId } });
      if (!user) {
        user = await db.user.create({
          data: { clerkId, email: `${clerkId}@clerk.user` },
        });
      }
      (req as any).user = user;
    }

    const project = await projectService.createProject({
      userId: user.id,
      name: validatedData.name,
      description: validatedData.description || '',
      techStack: validatedData.techStack,
    });

    res.status(201).json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
});

// Get a specific project with full details
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user.id;
    const project = await projectService.getProjectById(req.params.id, userId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Update a project
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user.id;
    const validatedData = projectSchema.partial().parse(req.body);

    const project = await projectService.updateProject(req.params.id, userId, validatedData);

    res.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }
});

// Delete a project
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user.id;

    await projectService.deleteProject(req.params.id, userId);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Start agent pipeline for a project
router.post('/:id/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user.id;
    const { id: projectId } = req.params;

    // Verify project ownership
    const proj = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!proj) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await projectService.startAgentPipeline(projectId);

    res.json({
      success: true,
      message: 'Agent pipeline started',
      projectId,
    });
  } catch (error) {
    console.error('Error starting pipeline:', error);
    res.status(500).json({ error: 'Failed to start agent pipeline' });
  }
});

// Restart project (re-run pipeline)
router.post('/:id/restart', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user.id;
    const { id: projectId } = req.params;

    const proj = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!proj) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await db.project.update({
      where: { id: projectId },
      data: { status: 'PLANNING' },
    });
    emitProjectStatus(projectId, 'PLANNING');
    await projectService.startAgentPipeline(projectId);

    res.json({
      success: true,
      message: 'Project pipeline restarted',
      projectId,
    });
  } catch (error) {
    console.error('Error restarting project:', error);
    res.status(500).json({ error: 'Failed to restart project' });
  }
});

// Export project as ZIP
router.get('/:id/export', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user.id;
    const { id: projectId } = req.params;

    const proj = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!proj) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { buildProjectZip } = await import('../services/zipService');
    const zipBuffer = await buildProjectZip(projectId);
    const filename = `${proj.name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase() || 'project'}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(zipBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('No files to export')) {
      return res.status(404).json({ error: message });
    }
    console.error('Error exporting project:', error);
    res.status(500).json({ error: 'Failed to export project' });
  }
});

// Legacy POST export — redirects clients to GET download
router.post('/:id/export', authMiddleware, async (req: Request, res: Response) => {
  res.status(410).json({
    error: 'Use GET /api/projects/:id/export to download the ZIP file',
  });
});

export default router;
