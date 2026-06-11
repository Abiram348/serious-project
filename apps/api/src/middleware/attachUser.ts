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
    const clerkId = auth?.userId;

    if (!clerkId) {
      // In test mode, create a mock user so downstream handlers don't crash
      if (process.env.NODE_ENV === 'test') {
        const mockUser = await db.user.findFirst({ where: { clerkId: 'test-clerk-id' } });
        if (mockUser) {
          (req as any).user = mockUser;
        } else {
          // Return without user — tests that need auth should mock req.user themselves
        }
      }
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
