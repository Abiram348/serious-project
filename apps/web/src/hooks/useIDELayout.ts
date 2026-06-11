'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'swarmdev:ide:layout';

export interface IDELayout {
  /** Outer groups (horizontal): [sidebar, main] */
  horizontal: number[];
  /** Inner group (vertical) inside main: [editor, bottom] */
  vertical: number[];
  /** Right panel takes the second slot of horizontal; if 0, hidden */
  rightVisible: boolean;
  /** Bottom panel inside main; if false, main is full-height */
  bottomVisible: boolean;
  /** Sidebar visible */
  sidebarVisible: boolean;
}

const DEFAULTS: IDELayout = {
  horizontal: [18, 82],
  vertical: [70, 30],
  rightVisible: true,
  bottomVisible: true,
  sidebarVisible: true,
};

function loadFromStorage(): IDELayout {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      horizontal: Array.isArray(parsed.horizontal) && parsed.horizontal.length === 2
        ? parsed.horizontal
        : DEFAULTS.horizontal,
      vertical: Array.isArray(parsed.vertical) && parsed.vertical.length === 2
        ? parsed.vertical
        : DEFAULTS.vertical,
      rightVisible: parsed.rightVisible ?? DEFAULTS.rightVisible,
      bottomVisible: parsed.bottomVisible ?? DEFAULTS.bottomVisible,
      sidebarVisible: parsed.sidebarVisible ?? DEFAULTS.sidebarVisible,
    };
  } catch {
    return DEFAULTS;
  }
}

function saveToStorage(layout: IDELayout) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* quota — ignore */
  }
}

export function useIDELayout() {
  const [layout, setLayout] = useState<IDELayout>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLayout(loadFromStorage());
    setHydrated(true);
  }, []);

  // Debounced save
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveToStorage(layout), 200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hydrated, layout]);

  const toggleSidebar = useCallback(() => {
    setLayout((prev) => ({ ...prev, sidebarVisible: !prev.sidebarVisible }));
  }, []);

  const toggleRight = useCallback(() => {
    setLayout((prev) => ({ ...prev, rightVisible: !prev.rightVisible }));
  }, []);

  const toggleBottom = useCallback(() => {
    setLayout((prev) => ({ ...prev, bottomVisible: !prev.bottomVisible }));
  }, []);

  const reset = useCallback(() => {
    setLayout(DEFAULTS);
  }, []);

  return {
    layout,
    hydrated,
    toggleSidebar,
    toggleRight,
    toggleBottom,
    reset,
  };
}
