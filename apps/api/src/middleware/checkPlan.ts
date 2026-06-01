import { Request, Response, NextFunction } from 'express';
import { billingService } from '../services/billingService';

/**
 * Check plan limits for the authenticated user.
 * Must run after attachUser so req.user is available.
 */
export async function checkPlan(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user;

    if (!user) {
      return next();
    }

    const limits = billingService.getPlanLimits(user.plan);

    // Attach limits to request for downstream use
    (req as any).planLimits = limits;

    next();
  } catch (error) {
    console.error('checkPlan error:', error);
    next(error);
  }
}
