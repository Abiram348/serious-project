import { PrismaClient } from '@prisma/client';

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || '';
  // Enforce a small connection limit so Supabase pooler (max 15) never saturates
  if (url.includes('connection_limit')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}connection_limit=3`;
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

export default prisma;

// Hot-reload guard: prevent multiple PrismaClient instances in dev
if (process.env.NODE_ENV !== 'production') {
  // @ts-ignore – attach to global for consistency with previous Prisma pattern
  if (!globalThis.prisma) {
    globalThis.prisma = prisma;
  }
}
