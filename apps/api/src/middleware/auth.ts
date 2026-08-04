import { Request, Response, NextFunction } from 'express';
import { clerkMiddleware, requireAuth } from '@clerk/express';

// Global middleware — sets up req.auth on all routes (lax mode, doesn't block)
export const clerkAuthMiddleware = clerkMiddleware();

// Per-route middleware — blocks unauthenticated requests, but skip in test environment
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'test') {
    // In test mode, bypass Clerk auth but set a mock auth object so
    // attachUser and downstream handlers receive a user identity.
    const testUserId = (req.headers['x-test-user-id'] as string) || 'test-clerk-id';
    (req as any).auth = { userId: testUserId };
    return next();
  }
  // Otherwise, check if clerkMiddleware (running in lax mode before this) already
  // validated the session. If not, return 401 JSON instead of redirecting.
  const auth = (req as any).auth;
  if (!auth?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

export default authMiddleware;