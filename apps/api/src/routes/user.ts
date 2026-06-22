import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import db from '../prisma/client';

const router = Router();

// Get current user profile
router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      credits: user.credits,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update current user profile
router.patch('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name, email } = req.body;
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    const updated = await db.user.update({
      where: { id: user.id },
      data: updateData,
    });

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      plan: updated.plan,
      credits: updated.credits,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
