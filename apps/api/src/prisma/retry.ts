import { Prisma } from '@prisma/client';

/**
 * Run a Prisma operation with bounded retry on transient connection errors.
 * Rescues Prisma's P2024 (pool timeout) and raw connection-closed errors that
 * Supabase's pooler throws when connections briefly go idle.
 *
 * Intentionally not async-spread: keep the call sites readable. Each retry
 * waits up to ~400ms, so worst case the call adds <2s before surfacing.
 */
export async function withPrismaRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  const attempts = opts.attempts ?? 4;
  const baseDelay = opts.baseDelayMs ?? 200;
  const label = opts.label ?? 'prisma';

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientPrismaError(err) || i === attempts - 1) {
        throw err;
      }
      const delay = baseDelay * Math.pow(2, i);
      console.warn(
        `[${label}] transient Prisma error (attempt ${i + 1}/${attempts}), retrying in ${delay}ms: ${
          (err as Error).message
        }`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  // Should be unreachable, but TS needs a return.
  throw lastErr;
}

export function isTransientPrismaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  // Prisma P2024 = "Timed out fetching a new connection from connection pool"
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2024') {
    return true;
  }
  const message = (err as { message?: string }).message || '';
  if (
    message.includes('Connection closed') ||
    message.includes('ECONNRESET') ||
    message.includes('ETIMEDOUT') ||
    message.includes('Engine has already been destroyed')
  ) {
    return true;
  }
  return false;
}