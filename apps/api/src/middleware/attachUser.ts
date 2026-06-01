import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

/**
 * Attach the full Prisma User object to the request after Clerk auth.
 * Must run after authMiddleware (requireAuth) so req.auth.userId is available.
 */
export async function attachUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const auth = req.auth ? await req.auth() : null;
    const clerkId = auth?.userId;

    if (!clerkId) {
      return next();
    }

    let user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      const email = auth?.sessionClaims?.email as string || `${clerkId}@clerk.user`;
      user = await prisma.user.create({
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
