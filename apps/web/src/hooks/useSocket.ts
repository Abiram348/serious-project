import { io, Socket } from 'socket.io-client';
import { useProjectStore } from '@/store/projectStore';
import { useChatStore } from '@/store/chatStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function useSocket() {
  const { setProjectStatus, addFile, updateAgentStatus, setPreviewUrl, fetchFiles, fetchAgents } =
    useProjectStore();
  const { addMessage } = useChatStore();

  const connect = () => {
    if (!socket) {
      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        console.log('Socket connected:', socket?.id);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }
    return socket;
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  };

  const subscribeToProject = (projectId: string) => {
    if (!socket) return;

    socket.emit('join_project', { projectId });

    socket.on('project_status', (data: { status: string }) => {
      setProjectStatus(data.status);
      // Refresh full project data on completion
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        fetchFiles(projectId);
        fetchAgents(projectId);
      }
    });

    socket.on('file_created', (data: { path: string; content?: string; agentType?: string; language?: string }) => {
      addFile(data.path, {
        content: data.content,
        language: data.language,
        agentType: data.agentType,
      });
    });

    socket.on('file_updated', (data: { path: string; content?: string; agentType?: string }) => {
      addFile(data.path, {
        content: data.content,
        agentType: data.agentType,
      });
    });

    socket.on('agent_status', (data: { agent: string; status: string; message?: string }) => {
      const normalizedType = data.agent?.toUpperCase?.() || 'UNKNOWN';
      updateAgentStatus(normalizedType, data.status, data.message);

      if (data.message) {
        addMessage({
          id: `${Date.now()}-${Math.random()}`,
          projectId,
          role: 'AGENT',
          agentType: normalizedType,
          content: data.message,
          createdAt: new Date().toISOString(),
        });
      }
    });

    socket.on('agent_log', (data: { agent: string; level: string; message: string }) => {
      if (data.level === 'ERROR' || data.level === 'WARNING') {
        addMessage({
          id: `${Date.now()}-${Math.random()}`,
          projectId,
          role: 'SYSTEM',
          content: `[${data.level}] ${data.agent}: ${data.message}`,
          createdAt: new Date().toISOString(),
        });
      }
    });

    socket.on('agent_message', (data: { role?: string; agentType?: string; content: string }) => {
      if (data.content) {
        addMessage({
          id: `${Date.now()}-${Math.random()}`,
          projectId,
          role: (data.role as any) || 'AGENT',
          agentType: data.agentType,
          content: data.content,
          createdAt: new Date().toISOString(),
        });
      }
    });

    socket.on('chat_message', (data: { messages: any[] }) => {
      if (data.messages?.length) {
        for (const msg of data.messages) {
          addMessage({
            id: msg.id || `${Date.now()}-${Math.random()}`,
            projectId,
            role: msg.role || 'AGENT',
            agentType: msg.agentType,
            targetAgent: msg.targetAgent,
            model: msg.model,
            content: msg.content,
            createdAt: msg.createdAt || new Date().toISOString(),
          });
        }
      }
    });

    socket.on('preview_ready', (data: { url: string }) => {
      setPreviewUrl(data.url);
    });
  };

  const unsubscribeFromProject = (projectId: string) => {
    if (!socket) return;

    socket.emit('leave_project', { projectId });
    socket.off('project_status');
    socket.off('file_created');
    socket.off('file_updated');
    socket.off('agent_status');
    socket.off('agent_log');
    socket.off('agent_message');
    socket.off('chat_message');
    socket.off('terminal_output');
    socket.off('build_result');
    socket.off('preview_ready');
  };

  return {
    connect,
    disconnect,
    subscribeToProject,
    unsubscribeFromProject,
    socket,
  };
}
