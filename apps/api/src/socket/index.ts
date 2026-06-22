import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import Redis from 'ioredis';
import db from '../prisma/client';
import { sandboxService } from '../services/sandboxService';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let redis: any = null;
let io: SocketIOServer;
export function initializeSocket(httpServer: Server): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Initialize Redis pub/sub bridge
  try {
    redis = new Redis(REDIS_URL);
    redis.on('connect', () => {
      console.log('🔌 Redis connected for pub/sub bridge');
    });
    redis.on('error', (err: any) => {
      console.warn('⚠️ Redis connection error:', err.message);
    });
    initializeRedisSubscriber();
  } catch {
    console.warn('⚠️ Redis not available, skipping pub/sub bridge');
  }

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

    // Send message to agents — mirrors apps/api/src/routes/chat.ts:
    // call orchestrator /chat (not the non-existent /messages), persist the
    // agent reply, and emit `chat_message` so subscribed clients receive it.
    socket.on('send_message', async ({ projectId, content }: { projectId: string; content: string }) => {
      if (!projectId || typeof content !== 'string' || !content.trim()) {
        socket.emit('chat_error', { error: 'projectId and non-empty content are required' });
        return;
      }

      try {
        // 1. Save the user message.
        const userMessage = await db.chatMessage.create({
          data: { projectId, role: 'USER', content },
        });

        // 2. Call orchestrator /chat and wait for the agent reply.
        const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:8000';
        const orchestratorSecret = process.env.ORCHESTRATOR_SECRET || '';
        let agentMessage: { id: string; role: string; content: string; agentType: string | null; model: string | null } | null = null;

        try {
          const orchestratorRes = await fetch(`${orchestratorUrl}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(orchestratorSecret ? { 'X-API-SECRET': orchestratorSecret } : {}),
            },
            body: JSON.stringify({ project_id: projectId, content }),
          });

          if (orchestratorRes.ok) {
            const data = (await orchestratorRes.json()) as { agent: string; model: string; agent_response: string };
            agentMessage = await db.chatMessage.create({
              data: {
                projectId,
                role: 'AGENT',
                agentType: data.agent,
                targetAgent: data.agent,
                model: data.model,
                content: data.agent_response,
              },
            });
          } else {
            const errorText = await orchestratorRes.text().catch(() => '');
            console.warn(`[send_message] orchestrator ${orchestratorRes.status}: ${errorText}`);
            agentMessage = await db.chatMessage.create({
              data: {
                projectId,
                role: 'SYSTEM',
                content: `Orchestrator error (${orchestratorRes.status})`,
              },
            });
          }
        } catch (fetchError) {
          console.warn('[send_message] orchestrator fetch failed:', fetchError);
          agentMessage = await db.chatMessage.create({
            data: {
              projectId,
              role: 'SYSTEM',
              content: 'Could not reach orchestrator',
            },
          });
        }

        // 3. Emit both messages so the chat sidebar updates in real time.
        io?.to(`project:${projectId}`).emit('chat_message', {
          messages: [userMessage, agentMessage],
        });
      } catch (error) {
        console.error('[send_message] error:', error);
        socket.emit('chat_error', { error: 'Failed to send message' });
      }
    });

    // Request file content (Issue #10)
    socket.on('request_file', async ({ projectId, path }: { projectId: string; path: string }) => {
      try {
        const fileRecord = await db.projectFile.findFirst({
          where: { projectId, path },
        });

        if (fileRecord) {
          socket.emit('file_content', {
            path,
            content: fileRecord.content,
            language: fileRecord.language,
            version: fileRecord.version,
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
      if (!projectId || typeof command !== 'string' || !command.trim()) {
        socket.emit('terminal_output', { data: 'Invalid command request\n' });
        return;
      }

      try {
        emitToProject(projectId, 'terminal_output', { data: `Executing: ${command}\n` });

        const sandbox = await sandboxService.getOrCreateSandbox(projectId);
        const result = await sandboxService.executeCommand(sandbox, command, projectId);

        if (result.stdout) {
          emitToProject(projectId, 'terminal_output', { data: result.stdout });
        }
        if (result.stderr) {
          emitToProject(projectId, 'terminal_output', { data: result.stderr });
        }

        emitToProject(projectId, 'terminal_output', {
          data: `\nExit code: ${result.exitCode}\n`,
        });
      } catch (error: any) {
        const message = error?.message || String(error);
        console.error(`[exec_command] project=${projectId} error:`, message);
        emitToProject(projectId, 'terminal_output', {
          data: `\x1b[31mTerminal sandbox error: ${message}\x1b[0m\n`,
        });
        if (message.includes('E2B_API_KEY')) {
          emitToProject(projectId, 'terminal_output', {
            data: '\x1b[33mSet E2B_API_KEY in apps/api/.env to enable the terminal sandbox.\x1b[0m\n',
          });
        }
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

    redis.on('message', (channel: string, message: string) => {
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
