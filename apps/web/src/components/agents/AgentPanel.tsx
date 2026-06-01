'use client';

import { cn } from '@/lib/utils';
import { Bot, CheckCircle2, Loader2, AlertCircle, Clock, Wrench } from 'lucide-react';

export interface Agent {
  id: string;
  agentType: string;
  status: string;
  completedAt?: string;
  errorMsg?: string;
}

interface AgentPanelProps {
  projectId: string;
  agents: Agent[];
}

const agentMeta: Record<string, { icon: string; label: string; description: string }> = {
  SUPERVISOR:    { icon: 'S',  label: 'Supervisor',    description: 'Orchestrates tasks and coordinates agents' },
  FRONTEND:      { icon: 'F',  label: 'Frontend',      description: 'Builds UI components and pages' },
  BACKEND:       { icon: 'B',  label: 'Backend',       description: 'Builds APIs and business logic' },
  DATABASE:      { icon: 'D',  label: 'Database',      description: 'Designs schemas and migrations' },
  DEVOPS:        { icon: 'O',  label: 'DevOps',        description: 'Docker, CI/CD, deployment configs' },
  QA:            { icon: 'Q',  label: 'QA',             description: 'Writes and runs tests' },
  REVIEWER:      { icon: 'R',  label: 'Reviewer',       description: 'Reviews code for bugs and quality' },
  SECURITY:      { icon: '🔒', label: 'Security',       description: 'Audits for vulnerabilities' },
  DOCUMENTATION: { icon: '📄', label: 'Documentation',  description: 'Generates README and API docs' },
};

const statusConfig: Record<string, { color: string; dotClass: string; icon: React.ReactNode }> = {
  IDLE:      { color: 'text-muted-foreground', dotClass: 'status-dot-idle',       icon: <Clock className="h-3 w-3" /> },
  RUNNING:   { color: 'text-primary',           dotClass: 'status-dot-running',    icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  WAITING:   { color: 'text-warning',           dotClass: 'status-dot-waiting',    icon: <Clock className="h-3 w-3" /> },
  COMPLETED: { color: 'text-accent',            dotClass: 'status-dot-completed',  icon: <CheckCircle2 className="h-3 w-3" /> },
  FAILED:    { color: 'text-destructive',       dotClass: 'status-dot-failed',     icon: <AlertCircle className="h-3 w-3" /> },
};

export function AgentPanel({ projectId: _projectId, agents }: AgentPanelProps) {
  const activeCount = agents.filter((a) => ['RUNNING', 'WAITING'].includes(a.status)).length;
  const completedCount = agents.filter((a) => a.status === 'COMPLETED').length;
  const failedCount = agents.filter((a) => a.status === 'FAILED').length;

  return (
    <div className="flex h-full flex-col">
      {/* Summary bar */}
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Agent Swarm
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {agents.length} total
          </span>
        </div>
        <div className="flex gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 text-primary">
            <span className="status-dot status-dot-running" />
            {activeCount} active
          </span>
          <span className="inline-flex items-center gap-1 text-accent">
            <span className="status-dot status-dot-completed" />
            {completedCount} done
          </span>
          {failedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-destructive">
              <span className="status-dot status-dot-failed" />
              {failedCount} failed
            </span>
          )}
        </div>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No agents spawned yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Agents appear here when the Supervisor creates tasks
            </p>
          </div>
        ) : (
          agents.map((agent, i) => {
            const meta = agentMeta[agent.agentType] || {
              icon: '?',
              label: agent.agentType,
              description: '',
            };
            const cfg = statusConfig[agent.status] || statusConfig.IDLE;

            return (
              <div
                key={agent.id}
                className={cn(
                  'group rounded-lg border p-3 transition-all animate-fade-in-left',
                  agent.status === 'RUNNING'
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border/50 bg-card hover:border-primary/20'
                )}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-start gap-3">
                  {/* Agent avatar */}
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                      agent.status === 'RUNNING'
                        ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                        : 'bg-surface text-muted-foreground'
                    )}
                  >
                    {meta.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{meta.label}</span>
                      <span className={cfg.dotClass} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {meta.description}
                    </p>

                    {/* Status row */}
                    <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                      <span className={cfg.color}>{cfg.icon}</span>
                      <span className={cfg.color}>{agent.status}</span>
                      {agent.completedAt && (
                        <>
                          <span className="text-border">|</span>
                          <span className="text-muted-foreground">
                            {new Date(agent.completedAt).toLocaleTimeString()}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Error message */}
                    {agent.errorMsg && (
                      <p className="mt-1.5 rounded bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                        {agent.errorMsg}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
