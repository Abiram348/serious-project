'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { FileTree } from '@/components/editor/FileTree';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { Terminal } from '@/components/editor/Terminal';
import { AgentPanel } from '@/components/agents/AgentPanel';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useProjectStore } from '@/store/projectStore';
import { useSocket } from '@/hooks/useSocket';
import {
  ChevronDown,
  ExternalLink,
  Rocket,
  Settings,
  PanelBottom,
  PanelRight,
  MessageSquare,
  Bot,
  TerminalIcon,
  FileCode,
  Play,
  CheckCircle2,
  XCircle,
  GanttChart,
  Loader2,
} from 'lucide-react';
import type { Agent } from '@/components/agents/AgentPanel';

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */
const statusConfig: Record<string, { label: string; dot: string }> = {
  PENDING:     { label: 'Pending',     dot: 'status-dot-idle' },
  PLANNING:    { label: 'Planning',    dot: 'status-dot-running' },
  IN_PROGRESS: { label: 'In Progress', dot: 'status-dot-running' },
  REVIEWING:   { label: 'Reviewing',   dot: 'status-dot-running' },
  COMPLETED:   { label: 'Completed',   dot: 'status-dot-completed' },
  FAILED:      { label: 'Failed',      dot: 'status-dot-failed' },
};

type ProjectFile = {
  type: 'file' | 'folder';
  name: string;
  path?: string;
  children?: Record<string, ProjectFile>;
};

/* ------------------------------------------------------------------ */
/*  IDE Header                                                         */
/* ------------------------------------------------------------------ */
function IDEHeader({
  name,
  status,
  onToggleRight,
  onToggleBottom,
  rightVisible,
  bottomVisible,
}: {
  name: string;
  status: string;
  onToggleRight: () => void;
  onToggleBottom: () => void;
  rightVisible: boolean;
  bottomVisible: boolean;
}) {
  const cfg = statusConfig[status] || statusConfig.PENDING;
  const router = useRouter();

  return (
    <header className="flex h-12 items-center justify-between border-b border-border/50 bg-surface px-4 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <GanttChart className="h-4 w-4" />
        </button>
        <div className="h-5 w-px bg-border/50" />
        <h1 className="text-sm font-semibold tracking-tight truncate max-w-[200px]">
          {name || 'Untitled'}
        </h1>
        <div className="flex items-center gap-1.5 rounded-full border border-border/50 px-2.5 py-0.5 text-[11px]">
          <span className={cfg.dot} />
          <span className="text-muted-foreground">{cfg.label}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </button>
        <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors">
          <Rocket className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Deploy</span>
        </button>
        <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors">
          <Settings className="h-3.5 w-3.5" />
        </button>

        <div className="ml-2 h-5 w-px bg-border/50" />

        <button
          onClick={onToggleRight}
          className={`rounded-md p-1.5 transition-colors ${
            rightVisible ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
          }`}
          title="Toggle agent panel"
        >
          <PanelRight className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleBottom}
          className={`rounded-md p-1.5 transition-colors ${
            bottomVisible ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
          }`}
          title="Toggle bottom panel"
        >
          <PanelBottom className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Bottom Panel Tabs                                                  */
/* ------------------------------------------------------------------ */
function BottomPanel({
  projectId,
  activeTab,
  onTabChange,
}: {
  projectId: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const tabs = [
    { id: 'terminal', icon: TerminalIcon, label: 'Terminal' },
    { id: 'build', icon: Play, label: 'Build' },
    { id: 'preview', icon: ExternalLink, label: 'Preview' },
    { id: 'tests', icon: CheckCircle2, label: 'Tests' },
  ];

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border/50 bg-surface-elevated">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 border-r border-border/50 px-4 py-2 text-xs transition-colors ${
              activeTab === tab.id
                ? 'border-t-2 border-t-primary bg-background text-foreground'
                : 'text-muted-foreground hover:bg-surface hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
        <div className="flex-1 border-b border-border/50" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'terminal' && <Terminal projectId={projectId} />}
        {activeTab === 'build' && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <div className="text-center space-y-2">
              <Play className="mx-auto h-8 w-8 opacity-40" />
              <p>Build output appears here</p>
            </div>
          </div>
        )}
        {activeTab === 'preview' && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <div className="text-center space-y-2">
              <ExternalLink className="mx-auto h-8 w-8 opacity-40" />
              <p>Live preview loads after the dev server starts</p>
            </div>
          </div>
        )}
        {activeTab === 'tests' && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <div className="text-center space-y-2">
              <CheckCircle2 className="mx-auto h-8 w-8 opacity-40" />
              <p>Test results appear after QA agent runs</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Right Panel                                                        */
/* ------------------------------------------------------------------ */
function RightPanel({
  projectId,
  activeTab,
  onTabChange,
  agents,
}: {
  projectId: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  agents: Agent[];
}) {
  return (
    <div className="flex h-full flex-col bg-card">
      {/* Tab bar */}
      <div className="flex border-b border-border/50">
        <button
          onClick={() => onTabChange('chat')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'chat'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Chat
        </button>
        <button
          onClick={() => onTabChange('agents')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'agents'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          Agents
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatWindow projectId={projectId} />}
        {activeTab === 'agents' && <AgentPanel projectId={projectId} agents={agents} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main IDE Layout                                                    */
/* ------------------------------------------------------------------ */
export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [rightTab, setRightTab] = useState<'chat' | 'agents'>('chat');
  const [bottomTab, setBottomTab] = useState('terminal');
  const [rightVisible, setRightVisible] = useState(true);
  const [bottomVisible, setBottomVisible] = useState(true);
  const [files, setFiles] = useState<Record<string, ProjectFile>>({});
  const [agents, setAgents] = useState<Agent[]>([]);

  const { project, fetchProject, fetchFiles, fetchAgents } = useProjectStore();
  const { connect, disconnect, subscribeToProject } = useSocket();

  useEffect(() => {
    if (!projectId) return;
    connect();
    subscribeToProject(projectId);
    fetchProject(projectId);
    fetchFiles(projectId).then((f) => f && setFiles(f as any));
    fetchAgents(projectId).then((a) => a && setAgents(a as any));

    return () => { disconnect(); };
  }, [projectId]);

  const handleFileSelect = useCallback(async (path: string) => {
    setSelectedFile(path);
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${path}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
      }
    } catch {
      // file fetch failed — editor stays empty
    }
  }, [projectId]);

  const handleFileSave = useCallback(async (content: string) => {
    if (!selectedFile) return;
    try {
      await fetch(`/api/projects/${projectId}/files/${selectedFile}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      // Refresh file list
      const updated = await fetchFiles(projectId);
      if (updated) setFiles(updated as any);
    } catch {
      // save failed silently
    }
  }, [projectId, selectedFile, fetchFiles]);

  const language = selectedFile?.split('.').pop() || 'plaintext';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <IDEHeader
        name={project?.name || ''}
        status={project?.status || 'PENDING'}
        onToggleRight={() => setRightVisible((v) => !v)}
        onToggleBottom={() => setBottomVisible((v) => !v)}
        rightVisible={rightVisible}
        bottomVisible={bottomVisible}
      />

      <div className="flex flex-1 overflow-hidden">
        <Group orientation="horizontal">
          {/* File Explorer */}
          <Panel defaultSize={18} minSize={12} maxSize={30}>
            <div className="h-full overflow-y-auto border-r border-border/50 bg-surface/50">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Explorer
                </span>
              </div>
              <FileTree
                files={files}
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
              />
            </div>
          </Panel>
          <Separator className="w-1 bg-border/50 transition-colors hover:bg-primary/30 active:bg-primary/50" />

          {/* Editor + Bottom */}
          <Panel defaultSize={rightVisible ? 52 : 82} minSize={30}>
            <Group orientation="vertical">
              {/* Monaco Editor */}
              <Panel defaultSize={bottomVisible ? 65 : 100} minSize={30}>
                <div className="h-full">
                  {/* Editor tabs bar */}
                  {selectedFile && (
                    <div className="flex items-center border-b border-border/50 bg-surface px-2">
                      <div className="flex items-center gap-1.5 border-r border-border/50 border-t-2 border-t-primary bg-background px-3 py-1.5 text-xs">
                        <FileCode className="h-3.5 w-3.5 text-primary" />
                        <span className="truncate max-w-[200px]">
                          {selectedFile.split('/').pop()}
                        </span>
                      </div>
                      <div className="flex-1 border-b border-border/50" />
                    </div>
                  )}
                  <MonacoEditor
                    path={selectedFile || ''}
                    value={fileContent}
                    onChange={handleFileSave}
                    language={language}
                  />
                </div>
              </Panel>

              {bottomVisible && (
                <>
                  <Separator className="h-1 bg-border/50 transition-colors hover:bg-primary/30 active:bg-primary/50" />
                  <Panel defaultSize={35} minSize={15}>
                    <BottomPanel
                      projectId={projectId}
                      activeTab={bottomTab}
                      onTabChange={setBottomTab}
                    />
                  </Panel>
                </>
              )}
            </Group>
          </Panel>

          {/* Right Panel */}
          {rightVisible && (
            <>
              <Separator className="w-1 bg-border/50 transition-colors hover:bg-primary/30 active:bg-primary/50" />
              <Panel defaultSize={30} minSize={20} maxSize={40}>
                <RightPanel
                  projectId={projectId}
                  activeTab={rightTab}
                  onTabChange={(tab: string) => setRightTab(tab as 'chat' | 'agents')}
                  agents={agents}
                />
              </Panel>
            </>
          )}
        </Group>
      </div>
    </div>
  );
}
