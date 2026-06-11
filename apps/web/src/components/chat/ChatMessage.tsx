'use client';

import ReactMarkdown from 'react-markdown';
import { Bot, User, Shield, Wrench, Cpu } from 'lucide-react';

interface ChatMessageProps {
  id: string;
  role: 'USER' | 'SUPERVISOR' | 'AGENT' | 'SYSTEM';
  agentType?: string;
  targetAgent?: string;
  model?: string;
  content: string;
  createdAt: string;
}

const roleMeta: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  USER:       { icon: <User className="h-3.5 w-3.5" />,    color: 'text-primary',          bg: 'bg-primary/10',          label: 'You' },
  SUPERVISOR: { icon: <Shield className="h-3.5 w-3.5" />,  color: 'text-amber-500',        bg: 'bg-amber-500/10',        label: 'Supervisor' },
  AGENT:      { icon: <Wrench className="h-3.5 w-3.5" />,  color: 'text-blue-500',         bg: 'bg-blue-500/10',         label: 'Agent' },
  SYSTEM:     { icon: <Bot className="h-3.5 w-3.5" />,     color: 'text-slate-500',        bg: 'bg-slate-500/10',        label: 'System' },
};

export function ChatMessage({ role, agentType, targetAgent, model, content, createdAt }: ChatMessageProps) {
  const isUser = role === 'USER';
  const meta = roleMeta[role] || roleMeta.AGENT;

  // Display name: use agentType or targetAgent for agent messages
  const displayName = isUser
    ? 'You'
    : agentType || targetAgent || meta.label;

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.color}`}
      >
        {meta.icon}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Sender label + model badge */}
        <div className={`flex items-center gap-1.5 text-[11px] ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="font-medium text-muted-foreground">
            {displayName}
          </span>
          {model && (
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-elevated border border-border/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <Cpu className="h-2.5 w-2.5" />
              {model}
            </span>
          )}
        </div>

        {/* Content */}
        <div
          className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-md'
              : 'bg-surface-elevated text-foreground rounded-tl-md border border-border/50'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-code:text-accent prose-code:bg-surface prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-surface prose-pre:border prose-pre:border-border/50">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className={`text-[10px] text-muted-foreground ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
