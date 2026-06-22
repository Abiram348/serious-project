import { Request, Response, NextFunction } from 'express';
import db from '../prisma/client';

export const planCheckMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // req.auth is set by requireAuth middleware on protected routes
    if (!req.auth) {
      return next();
    }

    const auth = (req as any).auth;
    if (!auth?.userId) {
      return next();
    }

    const userId = auth.userId;

    // Use req.user if already set by attachUser middleware
    let user = (req as any).user;
    if (!user) {
      user = await db.user.findFirst({ where: { clerkId: userId } });
      if (!user) {
        user = await db.user.create({
          data: { clerkId: userId, email: `${userId}@clerk.user` },
        });
      }
      (req as any).user = user;
    }

    // Load related data: projects owned by user and recent usage logs
    const userProjects = await db.project.findMany({ where: { userId: user.id } });
    const monthStart = new Date();
    monthStart.setDate(1);
    const recentUsage = await db.usageLog.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: monthStart },
      },
    });

    const plan = user.plan as keyof typeof planLimits;
    const planLimits: Record<string, { maxProjects: number; maxTokens: number; maxParallelAgents: number }> = {
      FREE: { maxProjects: 3, maxTokens: 100000, maxParallelAgents: 2 },
      PRO: { maxProjects: -1, maxTokens: 2000000, maxParallelAgents: 5 },
      TEAM: { maxProjects: -1, maxTokens: 10000000, maxParallelAgents: 9 },
      ENTERPRISE: { maxProjects: -1, maxTokens: -1, maxParallelAgents: 9 },
    };

    const limits = planLimits[plan];

    // Project limit check — only enforce on project creation. Mounted at
    // /api/projects, so `req.path` is `/api/projects` here, not `/`.
    const isCreateProject =
      req.method === 'POST' &&
      (req.originalUrl === '/api/projects' || req.originalUrl === '/api/projects/');
    if (limits.maxProjects > 0 && userProjects.length >= limits.maxProjects && isCreateProject) {
      return res.status(403).json({
        error: 'Project limit reached',
        limit: limits.maxProjects,
        plan,
        upgrade: '/settings/billing',
      });
    }

    // Token usage check (sum tokensIn and tokensOut)
    const tokensUsed = recentUsage.reduce(
      (sum, log) => sum + (log.tokensIn ?? 0) + (log.tokensOut ?? 0),
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

    // Attach limits for downstream handlers
    (req as any).planLimits = limits;
    next();
  } catch (error) {
    console.error('Plan check error:', error);
    res.status(500).json({ error: 'Plan check failed' });
  }
};
