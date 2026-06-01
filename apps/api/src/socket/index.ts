import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import prisma from '../prisma/client';
import { redis } from '../lib/redis';

let io: SocketIOServer | null = null;

export function initializeSocket(httpServer: Server): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Initialize Redis pub/sub bridge (Issue #7)
  initializeRedisSubscriber();

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Join project room
    socket.on('join_project', ({ projectId }: { projectId: string }) => {
      socket.join(`project:${projectId}`);
      console.log(`Client ${socket.id} joined project:${projectId}`);
    });

    // Leave project room
    socket.on('leave_project', ({ projectId }: { projectId: string }) => {
      socket.leave(`project:${projectId}`);
      console.log(`Client ${socket.id} left project:${projectId}`);
    });

    // Send message to agents (Issue #10)
    socket.on('send_message', async ({ projectId, content }: { projectId: string; content: string }) => {
      try {
        // Save message to database
        const message = await prisma.chatMessage.create({
          data: {
            projectId,
            role: 'USER',
            content,
          },
        });

        // Broadcast to room
        io?.to(`project:${projectId}`).emit('agent_message', {
          role: 'USER',
          content,
          timestamp: new Date().toISOString(),
        });

        // Forward to orchestrator
        await fetch(`${process.env.ORCHESTRATOR_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId, content }),
        }).catch(() => {}); // Fire and forget
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    // Request file content (Issue #10)
    socket.on('request_file', async ({ projectId, path }: { projectId: string; path: string }) => {
      try {
        const file = await prisma.projectFile.findUnique({
          where: { projectId_path: { projectId, path } },
        });

        if (file) {
          socket.emit('file_content', {
            path,
            content: file.content,
            language: file.language,
            version: file.version,
          });
        } else {
          socket.emit('file_error', { path, error: 'File not found' });
        }
      } catch (error) {
        console.error('Error fetching file:', error);
        socket.emit('file_error', { path, error: 'Failed to fetch file' });
      }
    });

    // Execute shell command (Issue #10)
    socket.on('exec_command', async ({ projectId, command }: { projectId: string; command: string }) => {
      try {
        socket.emit('terminal_output', {
          data: `Executing: ${command}\n`,
        });

        // TODO: Integrate with E2B sandbox for actual execution
        socket.emit('terminal_output', {
          data: '⚠️ Command execution requires E2B sandbox integration\n',
        });
      } catch (error) {
        socket.emit('terminal_output', {
          data: `Error: ${error}\n`,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });

  return io;
}

// Redis pub/sub bridge - subscribes to orchestrator events
async function initializeRedisSubscriber() {
  if (!redis) {
    console.warn('⚠️ Redis not available, skipping pub/sub bridge');
    return;
  }

  try {
    await redis.subscribe('swarmdev:events');
    console.log('📡 Subscribed to swarmdev:events Redis channel');

    redis.on('message', (channel, message) => {
      if (channel === 'swarmdev:events' && io) {
        try {
          const event = JSON.parse(message);
          const { type, payload } = event;
          const timestamp = new Date().toISOString();

          // Forward to all Socket.io clients in the project room
          if (payload?.projectId) {
            io.to(`project:${payload.projectId}`).emit(type, { ...payload, timestamp });
          } else {
            // Broadcast to all clients if no projectId
            io.emit(type, { ...payload, timestamp });
          }
        } catch (parseError) {
          console.error('Failed to parse Redis event:', parseError);
        }
      }
    });
  } catch (err) {
    console.error('Failed to initialize Redis subscriber:', err);
  }
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
}

// Emit events to project room
export function emitToProject(projectId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`project:${projectId}`).emit(event, data);
  }
}

// Emit agent status update
export function emitAgentStatus(projectId: string, agentType: string, status: string, message?: string): void {
  emitToProject(projectId, 'agent_status', {
    agentType,
    status,
    message,
    timestamp: new Date().toISOString(),
  });
}

// Emit agent log
export function emitAgentLog(
  projectId: string,
  agentType: string,
  level: string,
  message: string,
  metadata?: Record<string, unknown>
): void {
  emitToProject(projectId, 'agent_log', {
    agentType,
    level,
    message,
    metadata,
    timestamp: new Date().toISOString(),
  });
}

// Emit file created
export function emitFileCreated(
  projectId: string,
  path: string,
  content: string,
  agentType?: string
): void {
  emitToProject(projectId, 'file_created', {
    path,
    content,
    agentType,
    timestamp: new Date().toISOString(),
  });
}

// Emit file updated
export function emitFileUpdated(
  projectId: string,
  path: string,
  content: string,
  agentType?: string
): void {
  emitToProject(projectId, 'file_updated', {
    path,
    content,
    agentType,
    timestamp: new Date().toISOString(),
  });
}

// Emit project status
export function emitProjectStatus(projectId: string, status: string): void {
  emitToProject(projectId, 'project_status', {
    status,
    timestamp: new Date().toISOString(),
  });
}

// Emit terminal output
export function emitTerminalOutput(projectId: string, data: string): void {
  emitToProject(projectId, 'terminal_output', {
    data,
    timestamp: new Date().toISOString(),
  });
}

// Emit build result
export function emitBuildResult(
  projectId: string,
  success: boolean,
  output?: string,
  errors?: string[]
): void {
  emitToProject(projectId, 'build_result', {
    success,
    output,
    errors,
    timestamp: new Date().toISOString(),
  });
}

// Emit preview ready
export function emitPreviewReady(projectId: string, url: string): void {
  emitToProject(projectId, 'preview_ready', {
    url,
    timestamp: new Date().toISOString(),
  });
}
