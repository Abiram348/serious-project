'use client';

import { useMemo, useState } from 'react';
import { Search, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchPanelProps {
  files: Record<string, any>;
  onFileSelect: (path: string) => void;
}

interface FlatFile {
  path: string;
  name: string;
  type: 'file' | 'folder';
}

function flatten(files: Record<string, any>, prefix = ''): FlatFile[] {
  const out: FlatFile[] = [];
  for (const [name, node] of Object.entries(files)) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (node?.type === 'folder') {
      out.push({ path, name, type: 'folder' });
      if (node.children) {
        out.push(...flatten(node.children, path));
      }
    } else {
      out.push({ path, name, type: 'file' });
    }
  }
  return out;
}

export function SearchPanel({ files, onFileSelect }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [includeContent, setIncludeContent] = useState(false);

  const all = useMemo(() => flatten(files), [files]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return all.filter((f) => {
      if (f.type !== 'file') return false;
      return f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q);
    });
  }, [all, query]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border/50 px-3 py-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Search
        </div>
      </div>

      {/* Input */}
      <div className="border-b border-border/50 p-2">
        <div className="flex items-center gap-2 rounded-md border border-border/50 bg-background px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files by name…"
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              aria-label="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <label className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={includeContent}
            onChange={(e) => setIncludeContent(e.target.checked)}
            className="h-3 w-3 accent-primary"
          />
          Search file contents (coming soon)
        </label>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {query.trim() === '' ? (
          <div className="px-4 py-8 text-center text-[11px] text-muted-foreground">
            Type to search file names across the project.
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-8 text-center text-[11px] text-muted-foreground">
            No files matching “{query}”.
          </div>
        ) : (
          <ul className="py-1">
            {results.map((f) => (
              <li key={f.path}>
                <button
                  onClick={() => onFileSelect(f.path)}
                  className="flex w-full items-center gap-2 px-3 py-1 text-left text-xs text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                >
                  <FileText className={cn('h-3.5 w-3.5 shrink-0')} />
                  <span className="truncate">
                    {highlight(f.path, query)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border/50 px-3 py-1.5 text-[10px] text-muted-foreground/70">
        {results.length} file{results.length === 1 ? '' : 's'} found
      </div>
    </div>
  );
}

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="rounded bg-primary/20 px-0.5 text-primary">
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}
