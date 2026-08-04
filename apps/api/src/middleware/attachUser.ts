import { Request, Response, NextFunction } from 'express';
import db from '../prisma/client';

/**
 * Attach the full User object to the request after Clerk auth.
 * Must run after authMiddleware (requireAuth) so req.auth.userId is available.
 */
export async function attachUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const auth = (req as any).auth || null;
    let clerkId = auth?.userId;

    if (!clerkId && process.env.NODE_ENV === 'test') {
      clerkId = (req.headers['x-test-user-id'] as string) || 'test-clerk-id';
    }

    if (!clerkId) {
      return next();
    }

    // Try to find existing user by clerkId
    let user = await db.user.findFirst({ where: { clerkId } });

    // If not found, create a new user record
    if (!user) {
      const email = (auth?.sessionClaims?.email as string) || `${clerkId}@clerk.user`;
      user = await db.user.create({
        data: { clerkId, email },
      });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error('attachUser error:', error);
    next(error);
  }
}
