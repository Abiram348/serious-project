import { create } from 'zustand';

interface ChatMessage {
  id: string;
  projectId: string;
  role: 'USER' | 'SUPERVISOR' | 'AGENT' | 'SYSTEM';
  agentType?: string;
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;

  fetchMessages: (projectId: string) => Promise<void>;
  sendMessage: (projectId: string, content: string) => Promise<void>;
  clearMessages: () => void;
  addMessage: (message: ChatMessage) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  loading: false,
  error: null,

  fetchMessages: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}/chat`);
      if (res.ok) {
        const data = await res.json();
        set({ messages: data, loading: false });
      } else {
        set({ error: 'Failed to fetch messages', loading: false });
      }
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  sendMessage: async (projectId: string, content: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const message = await res.json();
        set((state) => ({
          messages: [...state.messages, message],
        }));

        // Agent response will come via Socket.io real-time event
        // See apps/api/src/socket/index.ts - send_message handler
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  addMessage: (message: ChatMessage) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },
}));
