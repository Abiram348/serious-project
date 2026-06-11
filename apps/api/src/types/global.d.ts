/**
 * Global type declarations for SwarmDev API
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // Hot-reload guard for PrismaClient in development
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export {};
