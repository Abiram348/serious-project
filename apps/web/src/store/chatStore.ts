import { create } from 'zustand';

interface ChatMessage {
  id: string;
  projectId: string;
  role: 'USER' | 'SUPERVISOR' | 'AGENT' | 'SYSTEM';
  agentType?: string;
  targetAgent?: string;
  model?: string;
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  selectedModel: string;
  selectedAgent: string | null;
  isTyping: boolean;

  fetchMessages: (projectId: string) => Promise<void>;
  sendMessage: (projectId: string, content: string, targetAgent?: string | null, model?: string | null) => Promise<void>;
  clearMessages: () => void;
  addMessage: (message: ChatMessage) => void;
  addMessages: (messages: ChatMessage[]) => void;
  setSelectedModel: (model: string) => void;
  setSelectedAgent: (agent: string | null) => void;
  setTyping: (typing: boolean) => void;
}

const AVAILABLE_MODELS = [
  'llama4',
  'codellama',
  'kimi',
  'mistral-small',
  'gpt-oss',
];

const AVAILABLE_AGENTS = [
  { id: null, label: 'Auto (Supervisor decides)' },
  { id: 'SUPERVISOR', label: 'Supervisor' },
  { id: 'FRONTEND', label: 'Frontend' },
  { id: 'BACKEND', label: 'Backend' },
  { id: 'DATABASE', label: 'Database' },
  { id: 'DEVOPS', label: 'DevOps' },
  { id: 'QA', label: 'QA' },
  { id: 'REVIEWER', label: 'Reviewer' },
  { id: 'SECURITY', label: 'Security' },
  { id: 'DOCUMENTATION', label: 'Documentation' },
];

export { AVAILABLE_MODELS, AVAILABLE_AGENTS };

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  loading: false,
  error: null,
  selectedModel: 'llama4',
  selectedAgent: null,
  isTyping: false,

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

  sendMessage: async (projectId: string, content: string, targetAgent?: string | null, model?: string | null) => {
    const state = get();
    const agent = targetAgent !== undefined ? targetAgent : state.selectedAgent;
    const selectedModel = model !== undefined ? model : state.selectedModel;

    set({ isTyping: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          targetAgent: agent || undefined,
          model: selectedModel || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const userMsg = data.userMessage;
        const agentMsg = data.agentMessage;
        // Use the idempotent addMessages helper so that Socket.io and the
        // POST response can't race and create duplicates.
        get().addMessages([userMsg, agentMsg].filter(Boolean));
        set({ isTyping: false });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      set({ error: String(error), isTyping: false });
    }
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  addMessage: (message: ChatMessage) => {
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
    });
  },

  addMessages: (messages: ChatMessage[]) => {
    set((state) => {
      const existingIds = new Set(state.messages.map((m) => m.id));
      const newMessages = messages.filter((m) => !existingIds.has(m.id));
      if (newMessages.length === 0) return state;
      return { messages: [...state.messages, ...newMessages] };
    });
  },

  setSelectedModel: (model: string) => {
    set({ selectedModel: model });
  },

  setSelectedAgent: (agent: string | null) => {
    set({ selectedAgent: agent });
  },

  setTyping: (typing: boolean) => {
    set({ isTyping: typing });
  },
}));
