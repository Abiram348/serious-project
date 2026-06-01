'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileJson,
  FileText,
  FileType,
  Cog,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface FileNode {
  type: 'file' | 'folder';
  name: string;
  path?: string;
  language?: string;
  children?: Record<string, FileNode>;
}

interface FileTreeProps {
  files: Record<string, FileNode>;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
}

/* ------------------------------------------------------------------ */
/*  File icon by extension                                              */
/* ------------------------------------------------------------------ */
function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return <FileType className="h-4 w-4 text-blue-400 shrink-0" />;
    case 'js':
    case 'jsx':
      return <FileCode className="h-4 w-4 text-yellow-400 shrink-0" />;
    case 'json':
      return <FileJson className="h-4 w-4 text-yellow-500 shrink-0" />;
    case 'css':
    case 'scss':
      return <FileCode className="h-4 w-4 text-purple-400 shrink-0" />;
    case 'md':
    case 'mdx':
      return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
    case 'prisma':
      return <Cog className="h-4 w-4 text-accent shrink-0" />;
    case 'py':
      return <FileCode className="h-4 w-4 text-green-400 shrink-0" />;
    case 'yml':
    case 'yaml':
      return <Cog className="h-4 w-4 text-orange-400 shrink-0" />;
    case 'env':
    case 'env.example':
    case 'env.local':
      return <Cog className="h-4 w-4 text-muted-foreground shrink-0" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

/* ------------------------------------------------------------------ */
/*  FileTree                                                           */
/* ------------------------------------------------------------------ */
export function FileTree({ files, selectedFile, onFileSelect }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'frontend', 'backend']));

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: FileNode, path: string, depth: number = 0) => {
    const isExpanded = expandedFolders.has(path);
    const isSelected = selectedFile === path;

    if (node.type === 'folder') {
      return (
        <div key={path}>
          <button
            onClick={() => toggleFolder(path)}
            className="flex w-full items-center gap-1 py-1 pr-2 text-sm text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
            style={{ paddingLeft: `${8 + depth * 16}px` }}
          >
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 shrink-0 transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-primary/70 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-primary/50 shrink-0" />
            )}
            <span className="truncate text-[13px]">{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div>
              {Object.entries(node.children).map(([childName, childNode]) =>
                renderNode(childNode, `${path}/${childName}`, depth + 1)
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={path}
        onClick={() => onFileSelect(node.path || path)}
        className={cn(
          'flex w-full items-center gap-1 py-1 pr-2 text-sm transition-colors',
          isSelected
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <span className="w-3.5 shrink-0" />
        {getFileIcon(node.name)}
        <span className="truncate text-[13px]">{node.name}</span>
      </button>
    );
  };

  return (
    <div className="py-1">
      {Object.entries(files).length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-muted-foreground">
          No files yet. Agents will create files as they work.
        </div>
      ) : (
        Object.entries(files).map(([name, node]) => renderNode(node, name))
      )}
    </div>
  );
}
