import dotenv from 'dotenv';

dotenv.config(); // Load env variables before any other imports

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { initializeSocket, getIO } from './socket';
import { startBackgroundSync } from './services/syncService';

// Route imports
import authRoutes from './routes/auth';
import projectsRoutes from './routes/projects';
import agentsRoutes from './routes/agents';
import filesRoutes from './routes/files';
import chatRoutes from './routes/chat';
import modelRoutes from './routes/models';
import terminalRoutes from './routes/terminal';
import gitRoutes from './routes/git';
import billingRoutes from './routes/billing';
import previewRoutes from './routes/preview';

// Middleware imports
import { apiLimiter } from './middleware/rateLimit';
import { clerkAuthMiddleware } from './middleware/auth';
import { planCheckMiddleware } from './middleware/planCheck';
import { attachUser } from './middleware/attachUser';
import { checkPlan } from './middleware/checkPlan';


const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting (Issue #9 - separate middleware module)
app.use(apiLimiter);

// Clerk auth middleware (lax mode) — sets up req.auth on all routes
app.use(clerkAuthMiddleware);

// Public routes (before auth middleware)
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '🚀 SwarmDev API is running!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      projects: '/api/projects',
      agents: '/api/agents',
      files: '/api/projects/:id/files',
      chat: '/api/projects/:id/chat',
    }
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Attach user from DB after auth
app.use(attachUser);

// Plan enforcement middleware (Issue #8)
app.use(planCheckMiddleware);

// Check plan limits
app.use(checkPlan);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', previewRoutes); // preview routes handle /projects/:id/preview/*
app.use('/api/projects', projectsRoutes);
app.use('/api', agentsRoutes); // agents routes handle /projects/:id/agents
app.use('/api', filesRoutes); // files routes handle /projects/:id/files/*
app.use('/api/projects', chatRoutes);
app.use('/api/projects', modelRoutes);
app.use('/api/projects', terminalRoutes);
app.use('/api/projects', gitRoutes);
app.use('/api/billing', billingRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
initializeSocket(httpServer);

// Start background file sync to R2 (Issue #12)
if (process.env.NODE_ENV !== 'test') {
  startBackgroundSync();
}

// Only start the HTTP server when this file is executed directly (not when imported in tests)
if (require.main === module) {
  const server = httpServer.listen(port, () => {
    console.log(`🚀 SwarmDev API running on http://localhost:${port}`);
    console.log(`📡 Socket.io server initialized`);
    console.log(`🔗 Health check: http://localhost:${port}/health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

export default app;