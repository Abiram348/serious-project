import { create } from 'zustand';
import { apiClient } from '@/lib/api';

interface AgentRun {
  id: string;
  agentType: string;
  status: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  startedAt?: string;
  completedAt?: string;
  errorMsg?: string;
  tokenUsed: number;
  createdAt: string;
}

interface AgentLog {
  id: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

interface AgentState {
  agents: AgentRun[];
  logs: AgentLog[];
  loading: boolean;
  error: string | null;

  fetchAgents: (projectId: string) => Promise<void>;
  fetchAgentLogs: (agentRunId: string) => Promise<void>;
  clearLogs: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  logs: [],
  loading: false,
  error: null,

  fetchAgents: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await apiClient.get<AgentRun[]>(`/api/projects/${projectId}/agents`);
      set({ agents: data, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  fetchAgentLogs: async (agentRunId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await apiClient.get<AgentLog[]>(`/api/projects/agents/${agentRunId}/logs`);
      set({ logs: data, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  clearLogs: () => {
    set({ logs: [] });
  },
}));
