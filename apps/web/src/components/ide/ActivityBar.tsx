'use client';

import {
  Files,
  Search,
  GitBranch,
  Bug,
  Bot,
  MessageSquare,
  Settings,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SidebarPanel = 'explorer' | 'search' | 'agents' | 'chat';

export interface ActivityBarProps {
  active: SidebarPanel;
  onSelect: (panel: SidebarPanel) => void;
}

interface Item {
  id: SidebarPanel;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ITEMS: Item[] = [
  { id: 'explorer', label: 'Explorer',  icon: Files },
  { id: 'search',   label: 'Search',    icon: Search },
  { id: 'agents',   label: 'Agents',    icon: Bot },
  { id: 'chat',     label: 'Chat',      icon: MessageSquare },
];

const SECONDARY: Item[] = [
  // Placeholders — VS Code has Source Control and Run & Debug here.
  // We render them as disabled for now and let the user activate them later.
  { id: 'explorer', label: 'Source Control (coming soon)', icon: GitBranch },
  { id: 'explorer', label: 'Run & Debug (coming soon)',    icon: Bug },
];

export function ActivityBar({ active, onSelect }: ActivityBarProps) {
  return (
    <div
      className="flex h-full w-12 shrink-0 flex-col items-center justify-between border-r border-primary/30 bg-surface"
      role="toolbar"
      aria-label="Activity Bar"
    >
      <div className="flex w-full flex-col items-center gap-1 py-2">
        {ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              title={item.label}
              aria-label={item.label}
              aria-pressed={isActive}
              className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
              )}
              <item.icon className="h-5 w-5" />
            </button>
          );
        })}

        <div className="my-1 h-px w-8 bg-border/50" />

        {SECONDARY.map((item, i) => (
          <button
            key={i}
            disabled
            title={item.label}
            aria-label={item.label}
            className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground/40"
          >
            <item.icon className="h-5 w-5" />
          </button>
        ))}
      </div>

      <div className="flex w-full flex-col items-center gap-1 pb-2">
        <button
          disabled
          title="Settings (coming soon)"
          aria-label="Settings"
          className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground/40"
        >
          <Settings className="h-5 w-5" />
        </button>
        <button
          disabled
          title="Account"
          aria-label="Account"
          className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground/40"
        >
          <User className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
