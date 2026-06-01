'use client';

import ReactMarkdown from 'react-markdown';
import { Bot, User, Shield, Wrench } from 'lucide-react';

interface ChatMessageProps {
  id: string;
  role: 'USER' | 'SUPERVISOR' | 'AGENT' | 'SYSTEM';
  agentType?: string;
  content: string;
  createdAt: string;
}

const roleMeta: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  USER:       { icon: <User className="h-3.5 w-3.5" />, color: 'text-primary',          bg: 'bg-primary/10' },
  SUPERVISOR: { icon: <Shield className="h-3.5 w-3.5" />, color: 'text-secondary',       bg: 'bg-secondary/10' },
  AGENT:      { icon: <Wrench className="h-3.5 w-3.5" />, color: 'text-accent',           bg: 'bg-accent/10' },
  SYSTEM:     { icon: <Bot className="h-3.5 w-3.5" />, color: 'text-warning',          bg: 'bg-warning/10' },
};

export function ChatMessage({ role, agentType, content, createdAt }: ChatMessageProps) {
  const isUser = role === 'USER';
  const meta = roleMeta[role] || roleMeta.AGENT;

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
        {/* Sender label */}
        <div className={`flex items-center gap-1.5 text-[11px] ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="font-medium text-muted-foreground">
            {isUser ? 'You' : agentType ? `${agentType}` : role}
          </span>
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
