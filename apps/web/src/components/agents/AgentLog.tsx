'use client';

import { useEffect, useRef } from 'react';
import { useAgentStore } from '@/store/agentStore';
import { cn } from '@/lib/utils';
import { AlertCircle, Info, AlertTriangle, Bug } from 'lucide-react';

interface AgentLogProps {
  projectId: string;
  agentRunId: string;
}

const levelConfig: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  DEBUG:   { color: 'text-muted-foreground', bg: 'bg-surface',          border: 'border-border/50',     icon: <Bug className="h-3 w-3" /> },
  INFO:    { color: 'text-primary',           bg: 'bg-primary/5',        border: 'border-primary/20',   icon: <Info className="h-3 w-3" /> },
  WARNING: { color: 'text-warning',           bg: 'bg-warning/5',        border: 'border-warning/30',   icon: <AlertTriangle className="h-3 w-3" /> },
  ERROR:   { color: 'text-destructive',       bg: 'bg-destructive/5',    border: 'border-destructive/30', icon: <AlertCircle className="h-3 w-3" /> },
};

export function AgentLog({ agentRunId }: AgentLogProps) {
  const { logs, loading, error, fetchAgentLogs, clearLogs } = useAgentStore();
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (agentRunId) fetchAgentLogs(agentRunId);
    return () => { clearLogs(); };
  }, [agentRunId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        Loading logs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-destructive">{error}</div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No logs yet
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {logs.map((log) => {
          const cfg = levelConfig[log.level] || levelConfig.INFO;
          return (
            <div
              key={log.id}
              className={cn('rounded-md border px-3 py-2 text-sm', cfg.bg, cfg.border)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={cfg.color}>{cfg.icon}</span>
                <span className={cn('text-xs font-semibold uppercase', cfg.color)}>
                  {log.level}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-foreground">{log.message}</p>
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <pre className="mt-1.5 rounded bg-surface px-2 py-1.5 text-[11px] text-muted-foreground overflow-x-auto border border-border/30">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
