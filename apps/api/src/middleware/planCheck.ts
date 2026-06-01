import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

export const planCheckMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // req.auth is a function only after requireAuth() runs (applied per-route).
    // For public routes, skip — route-specific auth middleware handles its own auth.
    if (typeof req.auth !== 'function') {
      return next();
    }

    const auth = await req.auth();
    if (!auth.userId) {
      return next();
    }

    const userId = auth.userId;

    // Use req.user if available (set by attachUser middleware)
    let user = (req as any).user;
    if (!user) {
      user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
      if (!user) {
        user = await prisma.user.create({
          data: { clerkId: userId, email: `${userId}@clerk.user` },
        });
      }
      (req as any).user = user;
    }

    // Reload with includes for plan checks
    const userWithRelations = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        projects: { select: { id: true, status: true } },
        usageLogs: {
          where: { createdAt: { gte: new Date(new Date().setDate(1)) } },
        },
      },
    });

    const plan = userWithRelations.plan;
    const planLimits: Record<string, { maxProjects: number; maxTokens: number; maxParallelAgents: number }> = {
      FREE: { maxProjects: 3, maxTokens: 100000, maxParallelAgents: 2 },
      PRO: { maxProjects: -1, maxTokens: 2000000, maxParallelAgents: 5 },
      TEAM: { maxProjects: -1, maxTokens: 10000000, maxParallelAgents: 9 },
      ENTERPRISE: { maxProjects: -1, maxTokens: -1, maxParallelAgents: 9 },
    };

    const limits = planLimits[plan as keyof typeof planLimits];

    // Check project count
    if (limits.maxProjects > 0 && userWithRelations.projects.length >= limits.maxProjects) {
      return res.status(403).json({
        error: 'Project limit reached',
        limit: limits.maxProjects,
        upgrade: '/billing/plans',
      });
    }

    // Check token usage
    const tokensUsed = userWithRelations.usageLogs.reduce(
      (sum: number, log: any) => sum + log.tokensIn + log.tokensOut,
      0
    );
    if (limits.maxTokens > 0 && tokensUsed >= limits.maxTokens) {
      return res.status(403).json({
        error: 'Token limit reached',
        used: tokensUsed,
        limit: limits.maxTokens,
        upgrade: '/billing/plans',
      });
    }

    // Attach limits to request for downstream use
    (req as any).planLimits = limits;

    next();
  } catch (error) {
    console.error('Plan check error:', error);
    res.status(500).json({ error: 'Plan check failed' });
  }
};
