import { apiClient } from '@/lib/api';

export interface AgentRun {
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

export interface AgentLog {
  id: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export const agentService = {
  async getAgents(projectId: string): Promise<AgentRun[]> {
    return apiClient.get<AgentRun[]>(`/api/projects/${projectId}/agents`);
  },

  async getAgentLogs(agentRunId: string): Promise<AgentLog[]> {
    return apiClient.get<AgentLog[]>(`/api/projects/agents/${agentRunId}/logs`);
  },

  async sendAgentMessage(projectId: string, content: string): Promise<void> {
    await apiClient.post(`/api/projects/${projectId}/agents/message`, { content });
  },
};
