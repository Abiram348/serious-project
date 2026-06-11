'use client';

import { ChevronRight, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; dot: string }> = {
  PENDING:     { label: 'Pending',     dot: 'status-dot-idle' },
  PLANNING:    { label: 'Planning',    dot: 'status-dot-running' },
  IN_PROGRESS: { label: 'In Progress', dot: 'status-dot-running' },
  REVIEWING:   { label: 'Reviewing',   dot: 'status-dot-running' },
  COMPLETED:   { label: 'Completed',   dot: 'status-dot-completed' },
  FAILED:      { label: 'Failed',      dot: 'status-dot-failed' },
};

export interface StatusBarProps {
  projectName?: string;
  projectStatus?: string;
  selectedFile?: string | null;
  language?: string;
  cursorPos?: { line: number; column: number } | null;
}

export function StatusBar({
  projectName,
  projectStatus,
  selectedFile,
  language,
  cursorPos,
}: StatusBarProps) {
  const status = projectStatus ? statusConfig[projectStatus] : null;
  const segments = selectedFile ? selectedFile.split('/').filter(Boolean) : [];

  return (
    <div
      className="flex h-[22px] shrink-0 items-center justify-between border-t border-primary/30 bg-surface px-2 text-[10px] text-muted-foreground"
      role="status"
      aria-label="Status bar"
    >
      {/* Left: project + status */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 truncate">
          <GitBranch className="h-3 w-3" />
          <span className="truncate max-w-[160px]">{projectName || 'main'}</span>
        </div>
        {status && (
          <div className="flex items-center gap-1.5">
            <span className={status.dot} />
            <span>{status.label}</span>
          </div>
        )}
      </div>

      {/* Center: breadcrumbs */}
      <div className="flex flex-1 items-center justify-center gap-0.5 overflow-hidden px-4">
        {segments.length === 0 ? (
          <span className="text-muted-foreground/60">No file selected</span>
        ) : (
          segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-0.5 min-w-0">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />}
              <span
                className={cn(
                  'truncate',
                  i === segments.length - 1
                    ? 'text-foreground'
                    : 'hover:text-foreground cursor-pointer'
                )}
                title={segments.slice(0, i + 1).join('/')}
              >
                {seg}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Right: language, position, encoding, eol */}
      <div className="flex items-center gap-3">
        {language && (
          <span className="uppercase tracking-wide">{language}</span>
        )}
        {cursorPos && (
          <span className="tabular-nums">
            Ln {cursorPos.line}, Col {cursorPos.column}
          </span>
        )}
        <span>UTF-8</span>
        <span>LF</span>
        <span>Spaces: 2</span>
      </div>
    </div>
  );
}
