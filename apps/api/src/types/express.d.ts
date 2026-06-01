import { Request } from 'express';
import { User } from '@prisma/client';

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
