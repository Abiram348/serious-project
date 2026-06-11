import { User as PrismaUser } from '@prisma/client';

export type User = PrismaUser;

declare module 'express' {
  interface Request {
    auth?: {
      userId: string;
      sessionId?: string;
    };
    user?: User;
    planLimits?: {
      maxProjects: number;
      maxTokensPerMonth: number;
      maxParallelAgents: number;
    };
  }
}
