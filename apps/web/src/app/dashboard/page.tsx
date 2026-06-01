'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Layers,
  Loader2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Status config                                                      */
/* ------------------------------------------------------------------ */
const statusConfig: Record<string, { label: string; variant: string; dot: string }> = {
  PENDING:    { label: 'Pending',    variant: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400', dot: 'status-dot-waiting' },
  PLANNING:   { label: 'Planning',   variant: 'border-blue-500/30 bg-blue-500/10 text-blue-400',    dot: 'status-dot-running' },
  IN_PROGRESS:{ label: 'In Progress',variant: 'border-primary/30 bg-primary/10 text-primary',        dot: 'status-dot-running' },
  REVIEWING:  { label: 'Reviewing',  variant: 'border-purple-500/30 bg-purple-500/10 text-purple-400', dot: 'status-dot-running' },
  COMPLETED:  { label: 'Completed',  variant: 'border-accent/30 bg-accent/10 text-accent',           dot: 'status-dot-completed' },
  FAILED:     { label: 'Failed',     variant: 'border-destructive/30 bg-destructive/10 text-destructive', dot: 'status-dot-failed' },
  ARCHIVED:   { label: 'Archived',   variant: 'border-muted-foreground/30 bg-muted/50 text-muted-foreground', dot: 'status-dot-idle' },
};

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */
function EmptyState() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <Layers className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-2xl font-semibold">No projects yet</h2>
      <p className="mt-2 max-w-md text-muted-foreground">
        Describe what you want to build and a team of nine AI agents will design, code,
        test, and deploy it — all in parallel.
      </p>
      <div className="mt-8 flex gap-4">
        <Button onClick={() => router.push('/dashboard/new')} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Your First Project
        </Button>
        <Button variant="outline" size="lg" asChild>
          <a href="/docs" target="_blank" rel="noopener noreferrer">
            Read the docs
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */
function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="h-5 w-32 shimmer rounded" />
            <div className="h-5 w-20 shimmer rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full shimmer rounded" />
            <div className="h-3 w-2/3 shimmer rounded" />
          </div>
          <div className="h-2 w-full shimmer rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */
export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then(async (r) => {
        if (!r.ok) {
          let message = 'Failed to load projects';
          try {
            const err = await r.json();
            message = err.error || message;
          } catch {
            message = await r.text() || message;
          }
          throw new Error(message);
        }
        return r.json();
      })
      .then((data) => setProjects(data.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: projects.length,
    active: projects.filter((p) => ['IN_PROGRESS', 'PLANNING', 'REVIEWING'].includes(p.status)).length,
    completed: projects.filter((p) => p.status === 'COMPLETED').length,
    failed: projects.filter((p) => p.status === 'FAILED').length,
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${stats.total} project${stats.total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stat pills */}
      {!loading && stats.total > 0 && (
        <div className="mb-8 flex flex-wrap gap-3 animate-fade-in">
          <StatPill icon={<FolderOpen className="h-3.5 w-3.5" />} label="Total" value={stats.total} />
          <StatPill
            icon={<Loader2 className="h-3.5 w-3.5 animate-spin" />}
            label="Active"
            value={stats.active}
            accent="text-primary"
          />
          <StatPill
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Completed"
            value={stats.completed}
            accent="text-accent"
          />
          <StatPill
            icon={<AlertCircle className="h-3.5 w-3.5" />}
            label="Failed"
            value={stats.failed}
            accent="text-destructive"
          />
        </div>
      )}

      {/* Project grid */}
      {loading ? (
        <LoadingSkeleton />
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => {
            const cfg = statusConfig[project.status] || statusConfig.PENDING;
            return (
              <button
                key={project.id}
                onClick={() => router.push(`/project/${project.id}`)}
                className="group relative rounded-xl border border-border/50 bg-card p-6 text-left transition-all hover:border-primary/30 hover:bg-surface-elevated animate-fade-in"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Status dot + badge */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cfg.dot} />
                    <span className="text-xs text-muted-foreground">{cfg.label}</span>
                  </div>
                  <Badge className={cfg.variant}>{cfg.label}</Badge>
                </div>

                {/* Project name + description */}
                <h3 className="text-base font-semibold truncate">{project.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {project.description || 'No description'}
                </p>

                {/* Progress bar (only for active projects) */}
                {['IN_PROGRESS', 'PLANNING', 'REVIEWING'].includes(project.status) && (
                  <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent shimmer"
                      style={{
                        width:
                          project.status === 'PLANNING' ? '25%' :
                          project.status === 'IN_PROGRESS' ? '60%' :
                          '85%',
                      }}
                    />
                  </div>
                )}

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    Open <ArrowRight className="h-3 w-3" />
                  </span>
                </div>

                {/* Hover glow */}
                <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    boxShadow: 'inset 0 0 0 1px hsl(190 100% 50% / 0.15), 0 0 20px hsl(190 100% 50% / 0.05)',
                  }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatPill                                                           */
/* ------------------------------------------------------------------ */
function StatPill({
  icon,
  label,
  value,
  accent = 'text-muted-foreground',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-2 text-sm">
      <span className={accent}>{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
