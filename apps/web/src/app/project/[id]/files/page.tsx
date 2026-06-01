'use client';

import { useState, useEffect } from 'react';
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

export default function ProjectFilesPage({ params }: { params: { id: string } }) {
  const [files, setFiles] = useState<ProjectFiles[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const selectedFileData = files.find((f) => f.path === selectedFile);

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Files</h1>
          <p className="text-sm text-muted-foreground">Browse and edit project files</p>
        </div>
        <Button variant="outline" size="sm">
          Download All
        </Button>
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
                onChange={(value) => {
                  // TODO: Implement file save
                  console.log('File changed:', value);
                }}
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
