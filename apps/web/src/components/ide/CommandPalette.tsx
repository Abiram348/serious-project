'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Command {
  id: string;
  label: string;
  category: 'File' | 'View' | 'Agent' | 'Terminal' | 'Project';
  shortcut?: string;
  action: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  commands: Command[];
  onClose: () => void;
}

export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlightIdx(0);
      // Focus on next tick after mount
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [query, commands]);

  // Group by category
  const grouped = useMemo(() => {
    const out: Record<string, Command[]> = {};
    for (const c of filtered) {
      (out[c.category] ||= []).push(c);
    }
    return out;
  }, [filtered]);

  // Keep highlightIdx in range
  useEffect(() => {
    if (highlightIdx >= filtered.length) setHighlightIdx(0);
  }, [filtered.length, highlightIdx]);

  if (!open) return null;

  const handleSelect = (cmd: Command) => {
    cmd.action();
    onClose();
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[highlightIdx];
      if (cmd) handleSelect(cmd);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette */}
      <div className="relative w-full max-w-[560px] overflow-hidden rounded-lg border border-border/50 bg-card shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightIdx(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No commands matching “{query}”.
            </div>
          ) : (
            (() => {
              let flatIdx = 0;
              return Object.entries(grouped).map(([category, cmds]) => (
                <div key={category} className="mb-1">
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {category}
                  </div>
                  {cmds.map((cmd) => {
                    const myIdx = flatIdx++;
                    const isActive = myIdx === highlightIdx;
                    return (
                      <button
                        key={cmd.id}
                        onMouseEnter={() => setHighlightIdx(myIdx)}
                        onClick={() => handleSelect(cmd)}
                        className={cn(
                          'flex w-full items-center justify-between px-3 py-1.5 text-left text-xs',
                          isActive
                            ? 'bg-primary/15 text-primary'
                            : 'text-foreground hover:bg-surface-elevated'
                        )}
                      >
                        <span>{cmd.label}</span>
                        {cmd.shortcut && (
                          <span className="ml-2 text-[10px] text-muted-foreground">
                            {cmd.shortcut}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ));
            })()
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border/50 px-3 py-1.5 text-[10px] text-muted-foreground">
          <span>{filtered.length} command{filtered.length === 1 ? '' : 's'}</span>
          <span>↑↓ navigate · ⏎ run · esc close</span>
        </div>
      </div>
    </div>
  );
}
