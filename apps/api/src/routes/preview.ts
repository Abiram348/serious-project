import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { previewService } from '../services/previewService';

const router = Router();

// Get preview status
router.get('/:id/preview', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user.id;
    const { id: projectId } = req.params;

    const status = await previewService.getStatus(projectId, userId);
    res.json(status);
  } catch (error: any) {
    console.error('Error getting preview status:', error);
    res.status(500).json({ error: error.message || 'Failed to get preview status' });
  }
});

// Start preview
router.post('/:id/preview/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user.id;
    const { id: projectId } = req.params;

    const status = await previewService.startPreview(projectId, userId);
    res.json(status);
  } catch (error: any) {
    console.error('Error starting preview:', error);
    res.status(500).json({ error: error.message || 'Failed to start preview' });
  }
});

// Stop preview
router.post('/:id/preview/stop', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user.id;
    const { id: projectId } = req.params;

    const status = await previewService.stopPreview(projectId, userId);
    res.json(status);
  } catch (error: any) {
    console.error('Error stopping preview:', error);
    res.status(500).json({ error: error.message || 'Failed to stop preview' });
  }
});

export default router;
