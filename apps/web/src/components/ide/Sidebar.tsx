'use client';

import { useState } from 'react';
import { FileTree } from '@/components/editor/FileTree';
import { SearchPanel } from './SearchPanel';
import { AgentPanel } from '@/components/agents/AgentPanel';
import { ChatWindow } from '@/components/chat/ChatWindow';
import type { Agent } from '@/components/agents/AgentPanel';
import type { SidebarPanel } from './ActivityBar';
import { Files, Search, Bot, MessageSquare } from 'lucide-react';

export interface SidebarProps {
  projectId: string;
  activePanel: SidebarPanel;
  files: Record<string, any>;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  agents: Agent[];
}

const panelMeta: Record<SidebarPanel, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  explorer: { label: 'Explorer', icon: Files },
  search:   { label: 'Search',   icon: Search },
  agents:   { label: 'Agents',   icon: Bot },
  chat:     { label: 'Chat',     icon: MessageSquare },
};

export function Sidebar({
  projectId,
  activePanel,
  files,
  selectedFile,
  onFileSelect,
  agents,
}: SidebarProps) {
  const meta = panelMeta[activePanel];
  const Icon = meta.icon;

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex h-8 items-center gap-2 border-b border-primary/30 bg-surface px-3 text-[10px] font-bold uppercase tracking-widest text-primary">
        <Icon className="h-3.5 w-3.5" />
        <span className="truncate">{meta.label}</span>
        {activePanel === 'explorer' && files && Object.keys(files).length > 0 && (
          <span className="ml-auto text-[9px] font-normal normal-case text-muted-foreground/60">
            {Object.keys(files).length} root
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {activePanel === 'explorer' && (
          <div className="h-full overflow-y-auto">
            <FileTree
              files={files}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
            />
          </div>
        )}
        {activePanel === 'search' && (
          <SearchPanel files={files} onFileSelect={onFileSelect} />
        )}
        {activePanel === 'agents' && (
          <AgentPanel projectId={projectId} agents={agents} />
        )}
        {activePanel === 'chat' && (
          <ChatWindow projectId={projectId} />
        )}
      </div>
    </div>
  );
}
