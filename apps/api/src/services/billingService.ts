/**
 * Billing Service - Stripe integration for subscription management
 *
 * This service handles subscription billing, usage tracking, and plan enforcement.
 */

import prisma from '../prisma/client';
import Stripe from 'stripe';

export interface PlanLimits {
  maxProjects: number;
  maxTokensPerMonth: number;
  maxParallelAgents: number;
}

export interface BillingService {
  getPlanLimits(plan: string): PlanLimits;
  checkProjectLimit(userId: string): Promise<{ canCreate: boolean; current: number; limit: number }>;
  checkTokenLimit(userId: string): Promise<{ canUse: boolean; used: number; limit: number }>;
  logTokenUsage(userId: string, projectId: string, agentType: string, tokensIn: number, tokensOut: number): Promise<void>;
  upgradePlan(userId: string, newPlan: string): Promise<void>;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    maxProjects: 3,
    maxTokensPerMonth: 100000,
    maxParallelAgents: 2,
  },
  PRO: {
    maxProjects: -1, // unlimited
    maxTokensPerMonth: 2000000,
    maxParallelAgents: 5,
  },
  TEAM: {
    maxProjects: -1,
    maxTokensPerMonth: 10000000,
    maxParallelAgents: 9,
  },
  ENTERPRISE: {
    maxProjects: -1,
    maxTokensPerMonth: -1,
    maxParallelAgents: -1,
  },
};

export const billingService = {
  getPlanLimits(plan: string): PlanLimits {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
  },

  async checkProjectLimit(userId: string) {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { plan: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const limits = this.getPlanLimits(user.plan);
    const projectCount = await prisma.project.count({
      where: { userId },
    });

    return {
      canCreate: limits.maxProjects === -1 || projectCount < limits.maxProjects,
      current: projectCount,
      limit: limits.maxProjects,
    };
  },

  async checkTokenLimit(userId: string) {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { plan: true, id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const limits = this.getPlanLimits(user.plan);

    // Get current month usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageLogs = await prisma.usageLog.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: startOfMonth },
      },
    });

    const totalTokens = usageLogs.reduce((sum: number, log) => sum + log.tokensIn + log.tokensOut, 0);

    return {
      canUse: limits.maxTokensPerMonth === -1 || totalTokens < limits.maxTokensPerMonth,
      used: totalTokens,
      limit: limits.maxTokensPerMonth,
    };
  },

  async logTokenUsage(
    userId: string,
    projectId: string,
    agentType: string,
    tokensIn: number,
    tokensOut: number
  ) {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Ollama models are self-hosted / flat-rate; no per-token cost
    const cost = 0;

    await prisma.usageLog.create({
      data: {
        userId: user.id,
        projectId,
        agentType: agentType as any,
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

    await prisma.user.update({
      where: { clerkId: userId },
      data: { plan: newPlan as any },
    });
  },
};

export default billingService;
