'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, Wrench, Shield, Database, Cloud, ClipboardCheck, FileText, Sparkles, Code } from 'lucide-react';

interface AgentMentionProps {
  input: string;
  cursorPosition: number;
  onSelect: (agentId: string) => void;
  visible: boolean;
}

const AGENTS = [
  { id: 'SUPERVISOR', label: 'Supervisor', icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'FRONTEND', label: 'Frontend', icon: Code, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'BACKEND', label: 'Backend', icon: Wrench, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'DATABASE', label: 'Database', icon: Database, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { id: 'DEVOPS', label: 'DevOps', icon: Cloud, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { id: 'QA', label: 'QA', icon: ClipboardCheck, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'REVIEWER', label: 'Reviewer', icon: Shield, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { id: 'SECURITY', label: 'Security', icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'DOCUMENTATION', label: 'Docs', icon: FileText, color: 'text-slate-500', bg: 'bg-slate-500/10' },
];

export function AgentMention({ input, cursorPosition, onSelect, visible }: AgentMentionProps) {
  const [filtered, setFiltered] = useState(AGENTS);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Extract text after @ up to cursor
    const beforeCursor = input.slice(0, cursorPosition);
    const lastAt = beforeCursor.lastIndexOf('@');
    if (lastAt === -1) {
      setFiltered(AGENTS);
      return;
    }
    const query = beforeCursor.slice(lastAt + 1).toLowerCase();
    const f = AGENTS.filter(a =>
      a.label.toLowerCase().includes(query) ||
      a.id.toLowerCase().includes(query)
    );
    setFiltered(f);
    setHighlightedIndex(0);
  }, [input, cursorPosition]);

  if (!visible || filtered.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 z-50 w-56 rounded-xl border border-border/60 bg-surface-elevated shadow-xl shadow-black/10 overflow-hidden"
    >
      <div className="px-3 py-2 text-[11px] font-medium text-muted-foreground border-b border-border/40">
        Mention an agent
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        {filtered.map((agent, idx) => {
          const Icon = agent.icon;
          return (
            <button
              key={agent.id}
              onClick={() => onSelect(agent.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left ${
                idx === highlightedIndex ? 'bg-primary/10' : 'hover:bg-primary/5'
              }`}
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-md ${agent.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${agent.color}`} />
              </div>
              <span className="font-medium text-foreground">{agent.label}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">@{agent.id.toLowerCase()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
