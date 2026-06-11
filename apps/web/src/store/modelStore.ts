import { create } from 'zustand';

interface ModelPreference {
  projectId: string;
  preferences: Record<string, string>;
  recommended: Record<string, string>;
  isCustom: boolean;
}

interface ModelState {
  preferences: Record<string, string>;
  recommended: Record<string, string>;
  isCustom: boolean;
  loading: boolean;
  error: string | null;

  fetchPreferences: (projectId: string) => Promise<void>;
  updatePreferences: (projectId: string, prefs: Record<string, string>) => Promise<void>;
  resetToDefaults: (projectId: string) => Promise<void>;
  getModelForAgent: (agent: string) => string;
}

export const useModelStore = create<ModelState>((set, get) => ({
  preferences: {},
  recommended: {},
  isCustom: false,
  loading: false,
  error: null,

  fetchPreferences: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}/models`);
      if (res.ok) {
        const data = await res.json();
        set({
          preferences: data.preferences || {},
          recommended: data.recommended || {},
          isCustom: data.isCustom || false,
          loading: false,
        });
      } else {
        set({ error: 'Failed to fetch model preferences', loading: false });
      }
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  updatePreferences: async (projectId: string, prefs: Record<string, string>) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs }),
      });
      if (res.ok) {
        const data = await res.json();
        set({
          preferences: data.preferences || {},
          isCustom: true,
          loading: false,
        });
      } else {
        set({ error: 'Failed to update model preferences', loading: false });
      }
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  resetToDefaults: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}/models`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        set({
          preferences: data.preferences || {},
          isCustom: false,
          loading: false,
        });
      } else {
        set({ error: 'Failed to reset model preferences', loading: false });
      }
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  getModelForAgent: (agent: string) => {
    const { preferences } = get();
    return preferences[agent] || 'codellama';
  },
}));
