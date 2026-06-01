import { useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';

export function useProject(projectId: string) {
  const { project, files, agents, fetchProject, fetchFiles, fetchAgents, loading, error } = useProjectStore();

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
      fetchFiles(projectId);
      fetchAgents(projectId);
    }
  }, [projectId]);

  return {
    project,
    files,
    agents,
    loading,
    error,
    refetch: () => {
      fetchProject(projectId);
      fetchFiles(projectId);
      fetchAgents(projectId);
    },
  };
}
