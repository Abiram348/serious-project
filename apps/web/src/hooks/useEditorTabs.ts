'use client';

import { useCallback, useEffect, useState } from 'react';

export interface EditorTab {
  path: string;
  dirty: boolean;
}

const STORAGE_PREFIX = 'swarmdev:ide:tabs:';

function loadFromStorage(projectId: string): { tabs: EditorTab[]; active: string | null } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + projectId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.tabs)) return null;
    return { tabs: parsed.tabs, active: parsed.active ?? null };
  } catch {
    return null;
  }
}

function saveToStorage(projectId: string, tabs: EditorTab[], active: string | null) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_PREFIX + projectId,
      JSON.stringify({ tabs, active })
    );
  } catch {
    /* quota exceeded — ignore */
  }
}

export function useEditorTabs(projectId: string) {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount / projectId change
  useEffect(() => {
    const saved = loadFromStorage(projectId);
    if (saved) {
      setTabs(saved.tabs);
      setActivePath(saved.active);
    } else {
      setTabs([]);
      setActivePath(null);
    }
    setHydrated(true);
  }, [projectId]);

  // Persist on change (skip pre-hydration writes)
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(projectId, tabs, activePath);
  }, [hydrated, projectId, tabs, activePath]);

  const openTab = useCallback((path: string) => {
    setTabs((prev) => {
      if (prev.some((t) => t.path === path)) return prev;
      return [...prev, { path, dirty: false }];
    });
    setActivePath(path);
  }, []);

  const closeTab = useCallback(
    (path: string) => {
      setTabs((prev) => {
        const next = prev.filter((t) => t.path !== path);
        if (activePath === path) {
          const idx = prev.findIndex((t) => t.path === path);
          const fallback = next[Math.min(idx, next.length - 1)]?.path ?? null;
          setActivePath(fallback);
        }
        return next;
      });
    },
    [activePath]
  );

  const setActive = useCallback((path: string) => {
    setActivePath(path);
  }, []);

  const markDirty = useCallback((path: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.path === path ? { ...t, dirty: true } : t))
    );
  }, []);

  const markClean = useCallback((path: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.path === path ? { ...t, dirty: false } : t))
    );
  }, []);

  const isOpen = useCallback((path: string) => tabs.some((t) => t.path === path), [tabs]);

  return {
    tabs,
    activePath,
    openTab,
    closeTab,
    setActive,
    markDirty,
    markClean,
    isOpen,
  };
}
