'use client';

import { useRef } from 'react';
import { X, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditorTab } from '@/hooks/useEditorTabs';

export interface EditorTabsProps {
  tabs: EditorTab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

function basename(p: string): string {
  const parts = p.split('/');
  return parts[parts.length - 1] || p;
}

export function EditorTabs({ tabs, activePath, onSelect, onClose }: EditorTabsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (tabs.length === 0) {
    return (
      <div className="flex h-9 items-center border-b border-primary/30 bg-surface px-3 text-[11px] text-muted-foreground">
        No file open
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-primary/30 bg-surface scrollbar-thin"
      role="tablist"
      aria-label="Open editors"
    >
      {tabs.map((tab) => {
        const isActive = tab.path === activePath;
        const name = basename(tab.path);
        return (
          <div
            key={tab.path}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'group flex h-full min-w-[120px] max-w-[220px] cursor-pointer items-center gap-1.5 border-r border-primary/20 px-3 text-xs transition-colors',
              isActive
                ? 'border-t-2 border-t-primary bg-background text-foreground'
                : 'border-t-2 border-t-transparent text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
            )}
            onClick={() => onSelect(tab.path)}
            onAuxClick={(e) => {
              // Middle-click closes
              if (e.button === 1) {
                e.preventDefault();
                onClose(tab.path);
              }
            }}
            title={tab.path}
          >
            <Circle
              className={cn(
                'h-2 w-2 shrink-0',
                tab.dirty ? 'fill-warning text-warning' : 'fill-transparent text-transparent'
              )}
              aria-label={tab.dirty ? 'Unsaved changes' : ''}
            />
            <span className="truncate">{name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.path);
              }}
              className={cn(
                'ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm',
                isActive
                  ? 'hover:bg-surface-elevated text-muted-foreground hover:text-foreground'
                  : 'text-transparent group-hover:text-muted-foreground hover:!text-foreground hover:bg-surface-elevated'
              )}
              aria-label={`Close ${name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
