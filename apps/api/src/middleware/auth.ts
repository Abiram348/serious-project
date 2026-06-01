import { Request, Response, NextFunction } from 'express';
import { clerkMiddleware, requireAuth } from '@clerk/express';

// Global middleware — sets up req.auth on all routes (lax mode, doesn't block)
export const clerkAuthMiddleware = clerkMiddleware();

// Per-route middleware — blocks unauthenticated requests
export const authMiddleware = requireAuth();

export default authMiddleware;