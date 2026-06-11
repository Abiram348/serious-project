/**
 * Billing Service - Stripe integration for subscription management
 *
 * This service handles subscription billing, usage tracking, and plan enforcement.
 */

import db from '../prisma/client';

export const billingService = {
  async getUserPlan(userId: string) {
    return db.user.findFirst({ where: { id: userId } });
  },

  async getUsageThisMonth(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageRows = await db.usageLog.findMany({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    });

    const totalTokens = usageRows.reduce(
      (sum, log) => sum + (log.tokensIn ?? 0) + (log.tokensOut ?? 0),
      0
    );

    const limits: Record<string, { maxProjects: number; maxTokensPerMonth: number }> = {
      FREE: { maxProjects: 1, maxTokensPerMonth: 10000 },
      PRO: { maxProjects: 5, maxTokensPerMonth: 100000 },
      TEAM: { maxProjects: 20, maxTokensPerMonth: 500000 },
      ENTERPRISE: { maxProjects: -1, maxTokensPerMonth: -1 },
    };

    const user = await db.user.findFirst({ where: { id: userId } });
    const plan = user?.plan ?? 'FREE';
    const planLimits = limits[plan] ?? limits.FREE;

    return {
      canUse: planLimits.maxTokensPerMonth === -1 || totalTokens < planLimits.maxTokensPerMonth,
      used: totalTokens,
      limit: planLimits.maxTokensPerMonth,
      plan,
    };
  },

  async logUsage(
    userId: string,
    projectId: string,
    agentType: string,
    tokensIn: number,
    tokensOut: number
  ) {
    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Ollama models are self-hosted / flat-rate; no per-token cost
    const cost = 0;

    await db.usageLog.create({
      data: {
        userId: user.id,
        projectId,
        agentType,
        tokensIn,
        tokensOut,
        cost,
      },
    });
  },

  async upgradePlan(userId: string, newPlan: string) {
    const validPlans = ['FREE', 'PRO', 'TEAM', 'ENTERPRISE'];
    if (!validPlans.includes(newPlan)) {
      throw new Error('Invalid plan');
    }
    return db.user.update({
      where: { id: userId },
      data: { plan: newPlan },
    });
  },

  /**
   * Plan limits lookup. Exposed separately for middleware that needs them
   * without doing a DB roundtrip (e.g. checkPlan middleware).
   */
  getPlanLimits(plan: string) {
    const planLimits: Record<string, { maxProjects: number; maxTokensPerMonth: number; maxParallelAgents: number }> = {
      FREE: { maxProjects: 1, maxTokensPerMonth: 10000, maxParallelAgents: 2 },
      PRO: { maxProjects: 5, maxTokensPerMonth: 100000, maxParallelAgents: 5 },
      TEAM: { maxProjects: 20, maxTokensPerMonth: 500000, maxParallelAgents: 9 },
      ENTERPRISE: { maxProjects: -1, maxTokensPerMonth: -1, maxParallelAgents: 9 },
    };
    return planLimits[plan] ?? planLimits.FREE;
  },
};

export default billingService;
