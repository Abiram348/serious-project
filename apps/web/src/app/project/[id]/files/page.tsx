'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileTree } from '@/components/editor/FileTree';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

interface ProjectFiles {
  path: string;
  content: string;
  language: string;
}

interface FileNode {
  type: 'file' | 'folder';
  name: string;
  path?: string;
  language?: string;
  children?: Record<string, FileNode>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function ProjectFilesPage({ params }: { params: { id: string } }) {
  const [files, setFiles] = useState<ProjectFiles[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(`/api/projects/${params.id}/files`);
        if (response.ok) {
          const data = await response.json();
          setFiles(data);
          if (data.length > 0) {
            setSelectedFile(data[0].path);
          }
        }
      } catch (error) {
        console.error('Error fetching files:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [params.id]);

  const persistFile = useCallback(
    async (path: string, content: string) => {
      setSaveState('saving');
      setSaveError(null);
      inflight.current.set(path, content);
      try {
        const response = await fetch(
          `/api/projects/${params.id}/files/${encodeURI(path)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
          }
        );
        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}: ${detail || response.statusText}`);
        }
        // If another edit landed while we were saving, don't clobber the dirty flag —
        // the user keeps typing, the next debounce tick will re-save.
        if (inflight.current.get(path) === content) {
          inflight.current.delete(path);
          setDirtyPaths((prev) => {
            const next = new Set(prev);
            next.delete(path);
            return next;
          });
          setSaveState('idle');
        } else {
          setSaveState('idle');
        }
      } catch (error) {
        console.error('Error saving file:', error);
        setSaveState('error');
        setSaveError(error instanceof Error ? error.message : String(error));
      }
    },
    [params.id]
  );

  const handleFileChange = useCallback(
    (path: string, content: string) => {
      setFiles((prev) =>
        prev.map((f) => (f.path === path ? { ...f, content } : f))
      );
      setDirtyPaths((prev) => {
        const next = new Set(prev);
        next.add(path);
        return next;
      });
      setSaveState('saving');

      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      saveTimer.current = setTimeout(() => {
        void persistFile(path, content);
      }, 1200);
    },
    [persistFile]
  );

  const flushNow = useCallback(
    (path: string) => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const file = files.find((f) => f.path === path);
      if (file && dirtyPaths.has(path)) {
        void persistFile(path, file.content);
      }
    },
    [files, dirtyPaths, persistFile]
  );

  const selectedFileData = files.find((f) => f.path === selectedFile);

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Files</h1>
          <p className="text-sm text-muted-foreground">Browse and edit project files</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={
              'text-xs ' +
              (saveState === 'saving'
                ? 'text-muted-foreground'
                : saveState === 'error'
                ? 'text-red-600'
                : saveState === 'saved' || (saveState === 'idle' && dirtyPaths.size === 0 && !saveError)
                ? 'text-emerald-600'
                : 'text-muted-foreground')
            }
            aria-live="polite"
          >
            {saveState === 'saving'
              ? 'Saving…'
              : saveState === 'error'
              ? `Save failed: ${saveError}`
              : dirtyPaths.size > 0
              ? `${dirtyPaths.size} unsaved change${dirtyPaths.size === 1 ? '' : 's'}`
              : 'All changes saved'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedFile && flushNow(selectedFile)}
            disabled={!selectedFile || !dirtyPaths.has(selectedFile)}
          >
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = `/api/projects/${params.id}/export`;
            }}
            disabled={files.length === 0}
          >
            Download All
          </Button>
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
            <div className="h-full overflow-auto p-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading files...</p>
              ) : files.length > 0 ? (
                <FileTree
                  files={files.reduce((acc, f) => {
                    acc[f.path] = { type: 'file', name: f.path.split('/').pop() || f.path, path: f.path, language: f.language };
                    return acc;
                  }, {} as Record<string, FileNode>)}
                  selectedFile={selectedFile}
                  onFileSelect={setSelectedFile}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No files yet</p>
              )}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={75}>
            {selectedFileData ? (
              <MonacoEditor
                path={selectedFileData.path}
                value={selectedFileData.content}
                language={selectedFileData.language}
                readOnly={false}
                onChange={(value) => handleFileChange(selectedFileData.path, value)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Select a file to view
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
