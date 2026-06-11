import { Request, Response, NextFunction } from 'express';
import { clerkMiddleware, requireAuth } from '@clerk/express';

// Global middleware — sets up req.auth on all routes (lax mode, doesn't block)
export const clerkAuthMiddleware = clerkMiddleware();

// Per-route middleware — blocks unauthenticated requests, but skip in test environment
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'test') {
    // In test mode, bypass Clerk auth but set a mock auth object so
    // attachUser and downstream handlers receive a user identity.
    (req as any).auth = { userId: 'test-clerk-id' };
    return next();
  }
  // Otherwise, use Clerk's requireAuth middleware
  return requireAuth()(req, res, next);
};

export default authMiddleware;