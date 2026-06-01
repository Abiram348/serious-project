import { create } from 'zustand';

interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  status: string;
  techStack: Record<string, any>;
  sandboxId?: string;
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface File {
  id: string;
  path: string;
  language?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  agentType: string;
  status: string;
  completedAt?: string;
  errorMsg?: string;
}

interface ProjectState {
  project: Project | null;
  files: Record<string, any>;
  agents: Agent[];
  loading: boolean;
  error: string | null;

  fetchProject: (projectId: string) => Promise<void>;
  fetchFiles: (projectId: string) => Promise<Record<string, any> | null>;
  fetchAgents: (projectId: string) => Promise<Agent[] | null>;
  updateProject: (data: Partial<Project>) => void;

  // Real-time socket-driven updates
  setProjectStatus: (status: string) => void;
  addFile: (path: string, fileData: any) => void;
  updateAgentStatus: (agentType: string, status: string, message?: string) => void;
  setPreviewUrl: (url: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: null,
  files: {},
  agents: [],
  loading: false,
  error: null,

  fetchProject: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        set({ project: data, loading: false });
      } else {
        set({ error: 'Failed to fetch project', loading: false });
      }
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  fetchFiles: async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      if (res.ok) {
        const data = await res.json();
        set({ files: data });
        return data;
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
    return null;
  },

  fetchAgents: async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/agents`);
      if (res.ok) {
        const data = await res.json();
        set({ agents: data });
        return data;
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
    return null;
  },

  updateProject: (data: Partial<Project>) => {
    set((state) => ({
      project: state.project ? { ...state.project, ...data } : null,
    }));
  },

  // Socket-driven updates
  setProjectStatus: (status: string) => {
    set((state) => ({
      project: state.project ? { ...state.project, status } : null,
    }));
  },

  addFile: (path: string, fileData: any) => {
    set((state) => {
      const updated = { ...state.files };
      // Build nested structure for file tree
      const parts = path.split('/');
      let current = updated;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        if (isFile) {
          current[part] = {
            type: 'file',
            path,
            language: fileData.language,
            createdBy: fileData.createdBy || fileData.agentType,
            id: `${path}-${Date.now()}`,
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        } else {
          if (!current[part]) {
            current[part] = {
              type: 'folder',
              name: part,
              children: {},
            };
          }
          current = (current[part] as any).children;
        }
      }
      return { files: updated };
    });
  },

  updateAgentStatus: (agentType: string, status: string, message?: string) => {
    set((state) => {
      const existing = state.agents.findIndex((a) => a.agentType === agentType);
      if (existing >= 0) {
        const updated = [...state.agents];
        updated[existing] = {
          ...updated[existing],
          status: status === 'completed' ? 'COMPLETED' : status === 'failed' ? 'FAILED' : 'RUNNING',
          completedAt: status === 'completed' ? new Date().toISOString() : updated[existing].completedAt,
          errorMsg: status === 'failed' ? (message || 'Unknown error') : updated[existing].errorMsg,
        };
        return { agents: updated };
      }
      // New agent
      return {
        agents: [
          ...state.agents,
          {
            id: `${agentType}-${Date.now()}`,
            agentType,
            status: 'RUNNING',
            completedAt: status === 'completed' ? new Date().toISOString() : undefined,
            errorMsg: status === 'failed' ? (message || 'Unknown error') : undefined,
          },
        ],
      };
    });
  },

  setPreviewUrl: (url: string) => {
    set((state) => ({
      project: state.project ? { ...state.project, previewUrl: url } : null,
    }));
  },
}));
