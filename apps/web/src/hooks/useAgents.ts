import { useEffect, useState } from 'react';

interface Agent {
  id: string;
  agentType: string;
  status: 'IDLE' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED';
  input?: Record<string, any>;
  output?: Record<string, any>;
  startedAt?: string;
  completedAt?: string;
  errorMsg?: string;
  logs: Array<{
    id: string;
    level: string;
    message: string;
    timestamp: string;
  }>;
}

export function useAgents(projectId: string) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/agents`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
        setError(null);
      } else {
        setError('Failed to fetch agents');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchAgents();
    }
  }, [projectId]);

  return {
    agents,
    loading,
    error,
    refetch: fetchAgents,
  };
}
