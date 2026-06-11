'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { Terminal } from '@/components/editor/Terminal';
import { useProjectStore } from '@/store/projectStore';
import { useSocket } from '@/hooks/useSocket';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { AgentPanel } from '@/components/agents/AgentPanel';
import { useEditorTabs } from '@/hooks/useEditorTabs';
import { useIDELayout } from '@/hooks/useIDELayout';
import { ActivityBar, type SidebarPanel } from '@/components/ide/ActivityBar';
import { Sidebar } from '@/components/ide/Sidebar';
import { EditorTabs } from '@/components/ide/EditorTabs';
import { StatusBar } from '@/components/ide/StatusBar';
import { CommandPalette, type Command } from '@/components/ide/CommandPalette';
import { LivePreview } from '@/components/editor/LivePreview';
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
  GanttChart,
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
  onToggleSidebar,
  onToggleRight,
  onToggleBottom,
  onOpenPalette,
  rightVisible,
  bottomVisible,
  sidebarVisible,
}: {
  name: string;
  status: string;
  onToggleSidebar: () => void;
  onToggleRight: () => void;
  onToggleBottom: () => void;
  onOpenPalette: () => void;
  rightVisible: boolean;
  bottomVisible: boolean;
  sidebarVisible: boolean;
}) {
  const cfg = statusConfig[status] || statusConfig.PENDING;
  const router = useRouter();

  return (
    <header className="flex h-12 items-center justify-between border-b border-primary/30 bg-surface px-4 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to dashboard"
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
        <button
          onClick={onOpenPalette}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
          title="Command Palette (⌘⇧P)"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Commands</span>
        </button>
        <button
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
          title="Preview (coming soon)"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </button>
        <button
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
          title="Deploy (coming soon)"
        >
          <Rocket className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Deploy</span>
        </button>
        <button
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
          title="Settings (coming soon)"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>

        <div className="ml-2 h-5 w-px bg-border/50" />

        <button
          onClick={onToggleSidebar}
          className={`rounded-md p-1.5 transition-colors ${
            sidebarVisible ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
          }`}
          title="Toggle Sidebar (⌘B)"
        >
          <PanelRight className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleRight}
          className={`rounded-md p-1.5 transition-colors ${
            rightVisible ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
          }`}
          title="Toggle Right Panel"
        >
          <PanelRight className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleBottom}
          className={`rounded-md p-1.5 transition-colors ${
            bottomVisible ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
          }`}
          title="Toggle Bottom Panel (⌘J)"
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
  onClearTerminal,
  terminalKey,
}: {
  projectId: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClearTerminal: () => void;
  terminalKey: number;
}) {
  const tabs = [
    { id: 'terminal', icon: TerminalIcon, label: 'Terminal' },
    { id: 'build',    icon: Play,         label: 'Build' },
    { id: 'preview',  icon: ExternalLink, label: 'Preview' },
    { id: 'tests',    icon: CheckCircle2, label: 'Tests' },
  ];

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center border-b border-primary/30 bg-surface-elevated">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 border-r border-primary/20 px-4 py-1.5 text-xs transition-colors ${
              activeTab === tab.id
                ? 'border-t-2 border-t-primary bg-background text-primary'
                : 'text-muted-foreground hover:bg-surface hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
        <div className="flex-1 border-b border-primary/30" />
        {activeTab === 'terminal' && (
          <button
            onClick={onClearTerminal}
            className="border-b border-primary/30 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            title="Clear terminal"
          >
            clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'terminal' && <Terminal projectId={projectId} clearSignal={terminalKey} />}
        {activeTab === 'build' && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <div className="text-center space-y-2">
              <Play className="mx-auto h-8 w-8 opacity-40" />
              <p>Build output appears here</p>
            </div>
          </div>
        )}
        {activeTab === 'preview' && <LivePreview projectId={projectId} />}
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
  activeTab: 'chat' | 'agents';
  onTabChange: (tab: 'chat' | 'agents') => void;
  agents: Agent[];
}) {
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex border-b border-primary/30">
        <button
          onClick={() => onTabChange('chat')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
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
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            activeTab === 'agents'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          Agents
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatWindow projectId={projectId} />}
        {activeTab === 'agents' && <AgentPanel projectId={projectId} agents={agents} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main IDE Page                                                      */
/* ------------------------------------------------------------------ */
export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [activePanel, setActivePanel] = useState<SidebarPanel>('explorer');
  const [bottomTab, setBottomTab] = useState('terminal');
  const [rightTab, setRightTab] = useState<'chat' | 'agents'>('chat');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [cursorPos, setCursorPos] = useState<{ line: number; column: number } | null>(null);
  const [terminalKey, setTerminalKey] = useState(0);

  const { project, files, agents, fetchProject, fetchFiles, fetchAgents, addFile } = useProjectStore();
  const { connect, disconnect, subscribeToProject } = useSocket();
  const tabs = useEditorTabs(projectId);
  const layout = useIDELayout();

  // Initial mount: connect socket, fetch project data
  useEffect(() => {
    if (!projectId) return;
    connect();
    subscribeToProject(projectId);
    fetchProject(projectId);
    fetchFiles(projectId).then((f) => {
      if (f) {
        // If we have saved tabs but no project data, that's fine.
        // If we have no saved tabs, do nothing — user opens files explicitly.
      }
    });
    fetchAgents(projectId);

    return () => { disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Watch the files store; when new files arrive via socket, auto-open them as tabs
  // (only if the file path is new — i.e. not already in tabs)
  useEffect(() => {
    // Find all file paths in the file tree
    const filePaths: string[] = [];
    const walk = (node: any, prefix = '') => {
      if (!node) return;
      for (const [name, child] of Object.entries(node)) {
        const p = prefix ? `${prefix}/${name}` : name;
        if ((child as any)?.type === 'file' && (child as any).path) {
          filePaths.push((child as any).path);
        } else if ((child as any)?.type === 'folder' && (child as any).children) {
          walk((child as any).children, p);
        }
      }
    };
    walk(files);
    // If user has zero tabs and there are files, open the first one
    if (tabs.tabs.length === 0 && filePaths.length > 0) {
      tabs.openTab(filePaths[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // Open a file: fetch content, register tab, set active
  const handleFileSelect = useCallback(
    async (path: string) => {
      tabs.openTab(path);
      if (fileContents[path] !== undefined) return;
      try {
        const res = await fetch(`/api/projects/${projectId}/files/${path}`);
        if (res.ok) {
          const data = await res.json();
          setFileContents((prev) => ({ ...prev, [path]: data.content }));
        } else {
          setFileContents((prev) => ({ ...prev, [path]: '' }));
        }
      } catch {
        setFileContents((prev) => ({ ...prev, [path]: '' }));
      }
    },
    [projectId, fileContents, tabs]
  );

  // Save current file
  const saveActive = useCallback(
    async (path: string, content: string) => {
      try {
        await fetch(`/api/projects/${projectId}/files/${path}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        tabs.markClean(path);
        const updated = await fetchFiles(projectId);
        if (updated) {
          // refresh in-memory tree
        }
      } catch {
        // ignore — could surface a toast later
      }
    },
    [projectId, fetchFiles, tabs]
  );

  // Wrapper for Monaco's onChange: marks dirty, debounces save
  const handleContentChange = useCallback(
    (newContent: string) => {
      const path = tabs.activePath;
      if (!path) return;
      setFileContents((prev) => ({ ...prev, [path]: newContent }));
      tabs.markDirty(path);
      // debounce save
      const t = setTimeout(() => {
        saveActive(path, newContent);
      }, 800);
      return () => clearTimeout(t);
    },
    [tabs, saveActive]
  );

  // Save command (explicit Cmd+S)
  const saveNow = useCallback(() => {
    const path = tabs.activePath;
    if (!path) return;
    const content = fileContents[path];
    if (content !== undefined) saveActive(path, content);
  }, [tabs.activePath, fileContents, saveActive]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveNow();
      } else if (isMod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        layout.toggleSidebar();
      } else if (isMod && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        layout.toggleBottom();
      } else if (isMod && e.key.toLowerCase() === 'w') {
        if (tabs.activePath) {
          e.preventDefault();
          tabs.closeTab(tabs.activePath);
        }
      } else if (e.key === 'Escape' && paletteOpen) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen, saveNow, layout, tabs]);

  const language = tabs.activePath?.split('.').pop() || 'plaintext';
  const activeContent = tabs.activePath ? fileContents[tabs.activePath] ?? '' : '';

  // --- Command palette commands ---
  const commands: Command[] = useMemo(() => {
    const out: Command[] = [
      { id: 'view.toggle-sidebar',  label: 'View: Toggle Sidebar',              category: 'View',     shortcut: '⌘B', action: () => layout.toggleSidebar() },
      { id: 'view.toggle-right',    label: 'View: Toggle Right Panel',          category: 'View',                       action: () => layout.toggleRight() },
      { id: 'view.toggle-bottom',   label: 'View: Toggle Bottom Panel',         category: 'View',     shortcut: '⌘J', action: () => layout.toggleBottom() },
      { id: 'view.reset-layout',    label: 'View: Reset Layout',                category: 'View',                       action: () => layout.reset() },
      { id: 'file.save',            label: 'File: Save',                        category: 'File',     shortcut: '⌘S', action: saveNow },
      { id: 'file.close-tab',       label: 'File: Close Active Tab',            category: 'File',     shortcut: '⌘W', action: () => tabs.activePath && tabs.closeTab(tabs.activePath) },
      { id: 'panel.explorer',       label: 'Panel: Show Explorer',              category: 'View',                       action: () => setActivePanel('explorer') },
      { id: 'panel.search',         label: 'Panel: Show Search',                category: 'View',                       action: () => setActivePanel('search') },
      { id: 'panel.agents',         label: 'Panel: Show Agents',                category: 'View',                       action: () => setActivePanel('agents') },
      { id: 'panel.chat',           label: 'Panel: Show Chat',                  category: 'View',                       action: () => setActivePanel('chat') },
      { id: 'bottom.terminal',      label: 'Bottom: Open Terminal',             category: 'View',                       action: () => { layout.toggleBottom(); setBottomTab('terminal'); } },
      { id: 'bottom.build',         label: 'Bottom: Open Build',                category: 'View',                       action: () => { layout.toggleBottom(); setBottomTab('build'); } },
      { id: 'bottom.tests',         label: 'Bottom: Open Tests',                category: 'View',                       action: () => { layout.toggleBottom(); setBottomTab('tests'); } },
      { id: 'terminal.clear',       label: 'Terminal: Clear',                   category: 'Terminal',                   action: () => setTerminalKey((k) => k + 1) },
      { id: 'project.preview',      label: 'Project: Open Preview (coming soon)', category: 'Project',                  action: () => { /* no-op for now */ } },
    ];
    return out;
  }, [layout, saveNow, tabs]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <IDEHeader
        name={project?.name || ''}
        status={project?.status || 'PENDING'}
        onToggleSidebar={layout.toggleSidebar}
        onToggleRight={layout.toggleRight}
        onToggleBottom={layout.toggleBottom}
        onOpenPalette={() => setPaletteOpen(true)}
        rightVisible={layout.layout.rightVisible}
        bottomVisible={layout.layout.bottomVisible}
        sidebarVisible={layout.layout.sidebarVisible}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar (always visible) */}
        <ActivityBar active={activePanel} onSelect={setActivePanel} />

        {layout.layout.sidebarVisible && (
          <Group orientation="horizontal" className="flex-1" id="ide-h-group-sidebar">
            {/* Sidebar */}
            <Panel
              id="sidebar-panel"
              defaultSize={`${layout.layout.horizontal[0]}%`}
              minSize="12%"
              maxSize="40%"
            >
              <Sidebar
                projectId={projectId}
                activePanel={activePanel}
                files={files}
                selectedFile={tabs.activePath}
                onFileSelect={handleFileSelect}
                agents={agents as Agent[]}
              />
            </Panel>

            <Separator id="sidebar-separator" className="group relative z-10 w-2 cursor-col-resize bg-border/60 transition-colors hover:bg-primary active:bg-primary data-[resize-handle-state=hover]:bg-primary data-[resize-handle-state=drag]:bg-primary" style={{ touchAction: 'none' }}>
              <span className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-primary/30 group-hover:bg-primary/60 group-active:bg-primary/60" />
            </Separator>

            {/* Main: editor + bottom */}
            <Panel
              id="main-panel"
              defaultSize={`${layout.layout.rightVisible ? layout.layout.horizontal[1] - 30 : layout.layout.horizontal[1]}%`}
              minSize="30%"
            >
              <Group orientation="vertical" id="ide-v-group-main">
                {/* Editor area */}
                <Panel
                  id="editor-panel"
                  defaultSize={`${layout.layout.bottomVisible ? layout.layout.vertical[0] : 100}%`}
                  minSize="30%"
                >
                  <div className="flex h-full flex-col">
                    <EditorTabs
                      tabs={tabs.tabs}
                      activePath={tabs.activePath}
                      onSelect={(p) => tabs.setActive(p)}
                      onClose={(p) => tabs.closeTab(p)}
                    />
                    <div className="flex-1 overflow-hidden bg-background">
                      {tabs.activePath ? (
                        <MonacoEditor
                          key={tabs.activePath}
                          path={tabs.activePath}
                          value={activeContent}
                          onChange={handleContentChange}
                          language={language}
                          onCursorPosition={setCursorPos}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          <div className="text-center space-y-2">
                            <FileCode className="mx-auto h-10 w-10 opacity-30" />
                            <p>Select a file from the Explorer to start editing</p>
                            <p className="text-xs text-muted-foreground/60">
                              or press <kbd className="rounded border border-border/50 px-1.5 py-0.5 text-[10px]">⌘⇧P</kbd> to open the command palette
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <StatusBar
                      projectName={project?.name}
                      projectStatus={project?.status}
                      selectedFile={tabs.activePath}
                      language={language}
                      cursorPos={cursorPos}
                    />
                  </div>
                </Panel>

                {layout.layout.bottomVisible && (
                  <>
                    <Separator id="bottom-separator" className="group relative z-10 h-2 cursor-row-resize bg-border/60 transition-colors hover:bg-primary active:bg-primary data-[resize-handle-state=hover]:bg-primary data-[resize-handle-state=drag]:bg-primary" style={{ touchAction: 'none' }}>
                      <span className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary/30 group-hover:bg-primary/60 group-active:bg-primary/60" />
                    </Separator>

                    <Panel
                      id="bottom-panel"
                      defaultSize={`${layout.layout.vertical[1]}%`}
                      minSize="15%"
                    >
                      <BottomPanel
                        projectId={projectId}
                        activeTab={bottomTab}
                        onTabChange={setBottomTab}
                        onClearTerminal={() => setTerminalKey((k) => k + 1)}
                        terminalKey={terminalKey}
                      />
                    </Panel>
                  </>
                )}
              </Group>
            </Panel>

            {layout.layout.rightVisible && (
              <>
                <Separator id="right-separator" className="group relative z-10 w-2 cursor-col-resize bg-border/60 transition-colors hover:bg-primary active:bg-primary data-[resize-handle-state=hover]:bg-primary data-[resize-handle-state=drag]:bg-primary" style={{ touchAction: 'none' }}>
                  <span className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-primary/30 group-hover:bg-primary/60 group-active:bg-primary/60" />
                </Separator>

                <Panel
                  id="right-panel"
                  defaultSize="30%"
                  minSize="20%"
                  maxSize="50%"
                >
                  <RightPanel
                    projectId={projectId}
                    activeTab={rightTab}
                    onTabChange={setRightTab}
                    agents={agents as Agent[]}
                  />
                </Panel>
              </>
            )}
          </Group>
        )}

        {/* If sidebar is hidden, show only the editor */}
        {!layout.layout.sidebarVisible && (
          <Group orientation="horizontal" className="flex-1" id="ide-h-group-nosidebar">
            <Panel id="main-panel-ns" defaultSize={`${layout.layout.rightVisible ? 70 : 100}%`} minSize="30%">
              <Group orientation="vertical" id="ide-v-group-main-ns">
                <Panel
                  id="editor-panel-ns"
                  defaultSize={`${layout.layout.bottomVisible ? layout.layout.vertical[0] : 100}%`}
                  minSize="30%"
                >
                  <div className="flex h-full flex-col">
                    <EditorTabs
                      tabs={tabs.tabs}
                      activePath={tabs.activePath}
                      onSelect={(p) => tabs.setActive(p)}
                      onClose={(p) => tabs.closeTab(p)}
                    />
                    <div className="flex-1 overflow-hidden bg-background">
                      {tabs.activePath ? (
                        <MonacoEditor
                          key={tabs.activePath}
                          path={tabs.activePath}
                          value={activeContent}
                          onChange={handleContentChange}
                          language={language}
                          onCursorPosition={setCursorPos}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          <div className="text-center space-y-2">
                            <FileCode className="mx-auto h-10 w-10 opacity-30" />
                            <p>Press the activity bar to open Explorer</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <StatusBar
                      projectName={project?.name}
                      projectStatus={project?.status}
                      selectedFile={tabs.activePath}
                      language={language}
                      cursorPos={cursorPos}
                    />
                  </div>
                </Panel>
                {layout.layout.bottomVisible && (
                  <>
                    <Separator id="bottom-separator-ns" className="group relative z-10 h-2 cursor-row-resize bg-border/60 transition-colors hover:bg-primary active:bg-primary data-[resize-handle-state=hover]:bg-primary data-[resize-handle-state=drag]:bg-primary" style={{ touchAction: 'none' }}>
                      <span className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary/30 group-hover:bg-primary/60 group-active:bg-primary/60" />
                    </Separator>
                    <Panel id="bottom-panel-ns" defaultSize={`${layout.layout.vertical[1]}%`} minSize="15%">
                      <BottomPanel
                        projectId={projectId}
                        activeTab={bottomTab}
                        onTabChange={setBottomTab}
                        onClearTerminal={() => setTerminalKey((k) => k + 1)}
                        terminalKey={terminalKey}
                      />
                    </Panel>
                  </>
                )}
              </Group>
            </Panel>
            {layout.layout.rightVisible && (
              <>
                <Separator id="right-separator-ns" className="group relative z-10 w-2 cursor-col-resize bg-border/60 transition-colors hover:bg-primary active:bg-primary data-[resize-handle-state=hover]:bg-primary data-[resize-handle-state=drag]:bg-primary" style={{ touchAction: 'none' }}>
                  <span className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-primary/30 group-hover:bg-primary/60 group-active:bg-primary/60" />
                </Separator>
                <Panel id="right-panel-ns" defaultSize="30%" minSize="20%" maxSize="50%">
                  <RightPanel
                    projectId={projectId}
                    activeTab={rightTab}
                    onTabChange={setRightTab}
                    agents={agents as Agent[]}
                  />
                </Panel>
              </>
            )}
          </Group>
        )}
      </div>

      <CommandPalette
        open={paletteOpen}
        commands={commands}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}
