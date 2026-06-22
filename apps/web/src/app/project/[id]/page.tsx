'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { Terminal, TerminalHandle } from '@/components/editor/Terminal';
import { useProjectStore } from '@/store/projectStore';
import { useChatStore } from '@/store/chatStore';
import { useSocket } from '@/hooks/useSocket';
import { useEditorTabs } from '@/hooks/useEditorTabs';
import { useIDELayout } from '@/hooks/useIDELayout';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type AgentStatus = { name: string; status: string; color: string; active: boolean };

/* ------------------------------------------------------------------ */
/*  File tree helpers                                                  */
/* ------------------------------------------------------------------ */
function flattenFiles(files: Record<string, any>, prefix = ''): { path: string; name: string; type: 'file' | 'folder'; depth: number }[] {
  const out: { path: string; name: string; type: 'file' | 'folder'; depth: number }[] = [];
  const entries = Object.entries(files).sort((a, b) => {
    const aIsFolder = (a[1] as any)?.type === 'folder' ? 0 : 1;
    const bIsFolder = (b[1] as any)?.type === 'folder' ? 0 : 1;
    return aIsFolder - bIsFolder || a[0].localeCompare(b[0]);
  });
  for (const [name, node] of entries) {
    const p = prefix ? `${prefix}/${name}` : name;
    const typed = node as any;
    if (typed?.type === 'file') {
      out.push({ path: typed.path || p, name, type: 'file', depth: prefix.split('/').filter(Boolean).length });
    } else if (typed?.type === 'folder') {
      out.push({ path: p, name, type: 'folder', depth: prefix.split('/').filter(Boolean).length });
      if (typed.children) {
        out.push(...flattenFiles(typed.children, p));
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();

  const [bottomTab, setBottomTab] = useState('terminal');
  const [terminalKey, setTerminalKey] = useState(0);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const terminalRef = useRef<TerminalHandle>(null);

  const { project, files, agents, fetchProject, fetchFiles, fetchAgents, resetProject } = useProjectStore();
  const { connect, disconnect, subscribeToProject, socket } = useSocket();
  const tabs = useEditorTabs(projectId);
  const layout = useIDELayout();

  useEffect(() => {
    if (!projectId) return;
    resetProject();
    setFileContents({});
    connect();
    subscribeToProject(projectId);
    fetchProject(projectId);
    fetchFiles(projectId);
    fetchAgents(projectId);
    return () => { disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Forward server terminal output into the xterm surface.
  useEffect(() => {
    if (!socket) return;
    const handleTerminalOutput = (data: { data?: string }) => {
      if (data?.data) {
        terminalRef.current?.write(data.data);
      }
    };
    socket.on('terminal_output', handleTerminalOutput);
    return () => {
      socket.off('terminal_output', handleTerminalOutput);
    };
  }, [socket]);

  // Auto-open first file
  useEffect(() => {
    const flat = flattenFiles(files);
    if (tabs.tabs.length === 0 && flat.length > 0) {
      const firstFile = flat.find((f) => f.type === 'file');
      if (firstFile) tabs.openTab(firstFile.path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

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

  const saveActive = useCallback(
    async (path: string, content: string) => {
      try {
        await fetch(`/api/projects/${projectId}/files/${path}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        tabs.markClean(path);
      } catch {
        /* ignore */
      }
    },
    [projectId, tabs]
  );

  const handleTerminalCommand = (command: string) => {
    socket?.emit('exec_command', { projectId, command });
  };

  const handleContentChange = useCallback(
    (newContent: string) => {
      const path = tabs.activePath;
      if (!path) return;
      setFileContents((prev) => ({ ...prev, [path]: newContent }));
      tabs.markDirty(path);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveActive(path, newContent), 800);
    },
    [tabs, saveActive]
  );

  const language = tabs.activePath?.split('.').pop() || 'plaintext';
  const activeContent = tabs.activePath ? fileContents[tabs.activePath] ?? '' : '';

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (tabs.activePath) {
          const c = fileContents[tabs.activePath];
          if (c !== undefined) saveActive(tabs.activePath, c);
        }
      } else if (isMod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        layout.toggleSidebar();
      } else if (isMod && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        layout.toggleBottom();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [layout, tabs, fileContents, saveActive]);

  const agentList = (agents && agents.length > 0)
    ? agents.map((a) => ({
        name: a.agentType.toLowerCase(),
        status: a.status === 'COMPLETED' ? 'completed' : a.status === 'FAILED' ? 'failed' : 'busy',
        color: a.status === 'COMPLETED' ? '#1F9D55' : a.status === 'FAILED' ? '#C2410C' : '#F5500B',
        active: a.status === 'RUNNING',
      }))
    : [];

  const activeCount = agentList.filter((a) => a.active).length;
  const completedCount = agentList.filter((a) => a.status === 'completed').length;
  const progress = agents.length > 0 ? Math.round((completedCount / agentList.length) * 100) : 0;
  const eta =
    progress === 100
      ? 'done'
      : activeCount > 0
        ? `${Math.max(1, Math.ceil((agentList.length - completedCount) * 1.5))}m`
        : 'starting…';

  const handleDeploy = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/start`, { method: 'POST' });
      if (!res.ok) throw new Error(`Deploy failed: ${res.status}`);
    } catch (e) {
      console.error('Deploy error:', e);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#FAF6F0] font-sans text-[#1D1B1A]">
      {/* Header */}
      <IDEHeader
        name={project?.name || 'marketplace-mvp'}
        activeCount={activeCount}
        onDeploy={handleDeploy}
      />

      {/* Agent pills */}
      <AgentPillsBar agents={agentList} progress={progress} eta={eta} />

      {/* Workspace */}
      <Group id="workspace" orientation="horizontal" className="flex flex-1 min-h-0">
        {layout.layout.sidebarVisible && (
          <>
            <Panel id="sidebar" defaultSize="18%" minSize="12%" maxSize="35%" className="flex flex-col">
              <FileTreeSidebar
                files={files}
                selectedPath={tabs.activePath}
                onSelect={handleFileSelect}
                expandedFolders={expandedFolders}
                setExpandedFolders={setExpandedFolders}
              />
            </Panel>
            <Separator className="w-2 bg-[#EAE2DA] hover:bg-[#DDD3C9] data-[resize-handle-state=drag]:bg-[#C9C2BB] cursor-col-resize transition-colors z-10" />
          </>
        )}

        <Panel id="main" defaultSize={layout.layout.rightVisible ? "52%" : "82%"} minSize="30%" className="flex flex-col">
          <Group id="main-stack" orientation="vertical" className="flex flex-col h-full">
            <Panel id="editor" defaultSize={layout.layout.bottomVisible ? "65%" : "100%"} minSize="30%" className="flex flex-col">
              <EditorArea
                projectId={projectId}
                tabs={tabs.tabs}
                activePath={tabs.activePath}
                onSelectTab={(p) => tabs.setActive(p)}
                onCloseTab={(p) => tabs.closeTab(p)}
                language={language}
                value={activeContent}
                onChange={handleContentChange}
              />
            </Panel>
            {layout.layout.bottomVisible && (
              <>
                <Separator className="h-2 bg-[#EAE2DA] hover:bg-[#DDD3C9] data-[resize-handle-state=drag]:bg-[#C9C2BB] cursor-row-resize transition-colors z-10" />
                <Panel id="bottom" defaultSize="35%" minSize="15%" className="flex flex-col">
                  <BottomPanel
                    activeTab={bottomTab}
                    onTabChange={setBottomTab}
                    onClearTerminal={() => setTerminalKey((k) => k + 1)}
                    terminalKey={terminalKey}
                    projectId={projectId}
                    terminalRef={terminalRef}
                    onTerminalCommand={handleTerminalCommand}
                  />
                </Panel>
              </>
            )}
          </Group>
        </Panel>

        {layout.layout.rightVisible && (
          <>
            <Separator className="w-2 bg-[#EAE2DA] hover:bg-[#DDD3C9] data-[resize-handle-state=drag]:bg-[#C9C2BB] cursor-col-resize transition-colors z-10" />
            <Panel id="chat" defaultSize="30%" minSize="20%" maxSize="50%" className="flex flex-col">
              <ChatSidebar projectId={projectId} />
            </Panel>
          </>
        )}
      </Group>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  IDE Header                                                         */
/* ------------------------------------------------------------------ */
function IDEHeader({
  name,
  activeCount,
  onDeploy,
}: {
  name: string;
  activeCount: number;
  onDeploy: () => void;
}) {
  const router = useRouter();
  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-[#EAE2DA]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <span className="grid grid-cols-2 grid-rows-3 gap-[2px] w-[15px] h-[22px]">
            <span className="rounded-[2.5px] bg-[#F5500B] col-start-1 row-start-1" />
            <span className="rounded-[2.5px] bg-[#F5500B] col-start-2 row-start-2" />
            <span className="rounded-[2.5px] bg-[#F5500B] col-start-1 row-start-3" />
          </span>
          <span className="text-[15px] font-bold tracking-tight">SwarmDev</span>
        </div>
        <span className="h-4 w-px bg-[#EAE2DA]" />
        <div className="flex items-center gap-1.5 text-[13px]">
          <span className="text-[#8A827A]">abiram</span>
          <span className="text-[#C9C0B7]">/</span>
          <span className="font-mono font-medium text-[12.5px] truncate max-w-[160px]">{name}</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#EBE4DD] px-2.5 py-[3px] text-[11px] font-mono text-[#6B6259]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="12" r="3" /><line x1="18" y1="9" x2="18" y2="21" />
          </svg>
          main
        </span>
      </div>

      <div className="flex items-center gap-2">
        {activeCount > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-[#FFE1D2] px-3.5 py-1.5">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-[#F5500B] opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-[#F5500B]" />
            </span>
            <span className="text-[12.5px] font-semibold text-[#D74505]">
              Swarm building — {activeCount}/9 agents active
            </span>
          </div>
        )}
        <button className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD3C9] px-3.5 h-8 text-[13px] font-semibold hover:bg-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Share
        </button>
        <button
          onClick={onDeploy}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#F5500B] text-white px-4 h-8 text-[13px] font-semibold hover:bg-[#d94708]"
        >
          Deploy
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 7h10v10" /><path d="M7 17 17 7" />
          </svg>
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Agent Pills Bar                                                    */
/* ------------------------------------------------------------------ */
function AgentPillsBar({
  agents,
  progress,
  eta,
}: {
  agents: AgentStatus[];
  progress: number;
  eta: string;
}) {
  return (
    <div className="h-14 shrink-0 bg-white border-b border-[#EAE2DA] flex items-center justify-between px-4">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {agents.map((agent, i) => {
          const isCompleted = agent.status === 'completed';
          const isFailed = agent.status === 'failed';
          return (
            <span
              key={agent.name}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-mono ${
                agent.active
                  ? 'border-[#FFCDB4] bg-[#FFF3EC]'
                  : isCompleted
                    ? 'border-[#D9EBDD] bg-[#F2F9F3]'
                    : isFailed
                      ? 'border-[#F8C9AE] bg-[#FFF0ED]'
                      : 'border-[#EFE9E2]'
              }`}
            >
              {isCompleted ? (
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#1F9D55] text-white">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
              ) : (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${agent.active ? 'animate-pulse' : ''}`}
                  style={{
                    backgroundColor: agent.color,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              )}
              <span className={
                agent.active
                  ? 'font-medium text-[#C24006]'
                  : isCompleted
                    ? 'font-medium text-[#1F6A3C]'
                    : isFailed
                      ? 'font-medium text-[#C2410C]'
                      : 'text-[#A39A90]'
              }>
                {agent.name}
              </span>
            </span>
          );
        })}
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <div className="w-32 h-1 rounded-full bg-[#EFE9E2] overflow-hidden">
            <div className="h-full rounded-full bg-[#F5500B]" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-mono text-[12px] font-semibold text-[#1D1B1A]">{progress}%</span>
        </div>
        <span className="text-[11px] text-[#A39A90] leading-none">ETA {eta}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  File Tree Sidebar                                                  */
/* ------------------------------------------------------------------ */
function FileTreeSidebar({
  files,
  selectedPath,
  onSelect,
  expandedFolders,
  setExpandedFolders,
}: {
  files: Record<string, any>;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  expandedFolders: Set<string>;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const flat = flattenFiles(files);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const hasFiles = flat.length > 0;

  return (
    <aside className="w-full h-full py-2 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 pb-2 pt-1 h-9 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A827A] leading-none">Files</span>
        <div className="flex items-center gap-1 text-[#A39A90]">
          <button className="p-1 rounded-md hover:bg-[#F0E9E1]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="M9 15h6" />
            </svg>
          </button>
          <button className="p-1 rounded-md hover:bg-[#F0E9E1]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /><path d="M12 10v6" /><path d="M9 13h6" />
            </svg>
          </button>
          <button className="p-1 rounded-md hover:bg-[#F0E9E1]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 0 6.74 2.74L3 8" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 0-6.74-2.74L21 16" />
            </svg>
          </button>
        </div>
      </div>
      <div className="px-1.5 font-mono text-[13px] text-[#4A443E] overflow-auto flex-1">
        {!hasFiles && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-10 h-10 rounded-full bg-[#F1EAE2] grid place-items-center mb-3">
              <svg className="w-5 h-5 text-[#A39A90]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
              </svg>
            </div>
            <p className="text-[12px] font-medium text-[#6B6259]">No files yet</p>
            <p className="text-[11px] text-[#9A938C] mt-1">Agents will generate files as they build.</p>
          </div>
        )}
        {hasFiles && flat.map((item) => {
          const paddingLeft = 8 + item.depth * 12;
          const isActive = selectedPath === item.path;
          if (item.type === 'folder') {
            const isExpanded = expandedFolders.has(item.path);
            return (
              <button
                key={item.path}
                onClick={() => toggleFolder(item.path)}
                className="flex items-center gap-1.5 h-[26px] w-full text-left rounded-md hover:bg-[#F0E9E1] transition-colors"
                style={{ paddingLeft }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-[#A39A90] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#B0A79D]"
                >
                  <path d="m6 14 3 3h6l3-3" /><path d="M11 17V4" /><path d="m6 9 3-3h6l3 3" />
                </svg>
                <span className="text-[#6B6259] truncate">{item.name}</span>
              </button>
            );
          }
          return (
            <button
              key={item.path}
              onClick={() => onSelect(item.path)}
              className={`relative flex items-center gap-1.5 h-[26px] w-full text-left rounded-md transition-colors ${
                isActive ? 'bg-[#FFE6D9] font-medium text-[#1D1B1A]' : 'hover:bg-[#F0E9E1]'
              }`}
              style={{ paddingLeft }}
            >
              {isActive && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-[#F5500B]" />}
              <FileIcon name={item.name} active={isActive} />
              <span className="truncate">{item.name}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function FileIcon({ name, active }: { name: string; active?: boolean }) {
  const color = active ? '#F5500B' : '#B0A79D';
  if (name.endsWith('.tsx') || name.endsWith('.ts')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="m9 13 2 2 2-2" /><path d="m9 17 2 2 2-2" />
      </svg>
    );
  }
  if (name.endsWith('.prisma')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" /><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Editor Area                                                        */
/* ------------------------------------------------------------------ */
function EditorArea({
  projectId,
  tabs,
  activePath,
  onSelectTab,
  onCloseTab,
  language,
  value,
  onChange,
}: {
  projectId: string;
  tabs: { path: string; dirty: boolean }[];
  activePath: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  language: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col h-full p-3 pb-3">
      <div className="flex items-end justify-between shrink-0">
        <div className="flex items-end gap-1">
          {tabs.map((tab) => {
            const isActive = tab.path === activePath;
            const fileName = tab.path.split('/').pop() || tab.path;
            const isTsx = fileName.endsWith('.tsx');
            return (
              <button
                key={tab.path}
                onClick={() => onSelectTab(tab.path)}
                className={`relative flex items-center gap-2 px-3.5 h-9 overflow-hidden transition-colors ${
                  isActive
                    ? 'bg-white border border-[#EAE2DA] border-b-0 rounded-t-lg'
                    : 'text-[#8A827A] hover:bg-[#F2ECE4] rounded-t-lg'
                }`}
              >
                {isActive && <span className="absolute top-0 left-0 right-0 h-[2.5px] bg-[#F5500B]" />}
                <FileIcon name={fileName} active={isActive} />
                <span className={`font-mono text-[12px] ${isActive ? 'font-medium text-[#1D1B1A]' : ''}`}>{fileName}</span>
                {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-[#FFA180]" />}
                <span
                  onClick={(e) => { e.stopPropagation(); onCloseTab(tab.path); }}
                  className="ml-1 text-[#A39A90] hover:text-[#1D1B1A]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 pb-1.5">
          <button className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#8A827A] hover:bg-[#F2ECE4]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" />
            </svg>
          </button>
          <button
            onClick={() => window.open(`/project/${projectId}/preview`, '_blank')}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD3C9] bg-white px-3 h-7 text-[12px] font-semibold text-[#4A443E] hover:bg-[#F2ECE4]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
            </svg>
            Preview
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-xl rounded-tl-none bg-[#1D1B1A] overflow-hidden">
        {activePath ? (
          <MonacoEditor
            key={activePath}
            path={activePath}
            value={value}
            onChange={onChange}
            language={language}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#6B6259]">
            Select a file to start editing
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bottom Panel                                                       */
/* ------------------------------------------------------------------ */
function BottomPanel({
  activeTab,
  onTabChange,
  onClearTerminal,
  terminalKey,
  projectId,
  terminalRef,
  onTerminalCommand,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClearTerminal: () => void;
  terminalKey: number;
  projectId: string;
  terminalRef: React.RefObject<TerminalHandle>;
  onTerminalCommand: (command: string) => void;
}) {
  return (
    <div className="shrink-0 rounded-xl bg-[#1D1B1A] overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-5">
          {['Terminal', 'Agent logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab.toLowerCase().replace(' ', '_'))}
              className={`relative font-sans text-[12px] py-2.5 transition-colors ${
                activeTab === tab.toLowerCase().replace(' ', '_')
                  ? 'font-semibold text-[#F5E9DC]'
                  : 'text-[#7A7470] hover:text-[#F5E9DC]'
              }`}
            >
              {tab}
              {activeTab === tab.toLowerCase().replace(' ', '_') && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F5500B] rounded-full" />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2.5 text-[#7A7470]">
          <button onClick={onClearTerminal}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
          <button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8" /><path d="M3 16.2V21m0 0h4.8M3 21l6-6" /><path d="M21 7.8V3m0 0h-4.8M21 3l-6 6" /><path d="M3 7.8V3m0 0h4.8M3 3l6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`flex-1 min-h-0 font-mono text-[12px] ${activeTab === 'agent_logs' ? 'overflow-auto px-4 py-3' : ''}`}>
        {activeTab === 'terminal' && (
          <Terminal
            ref={terminalRef}
            projectId={projectId}
            clearSignal={terminalKey}
            showHeader={false}
            onCommandExec={onTerminalCommand}
          />
        )}
        {activeTab === 'agent_logs' && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-10 h-10 rounded-full bg-[#F1EAE2] grid place-items-center mb-3">
              <svg className="w-5 h-5 text-[#A39A90]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-[12px] font-medium text-[#6B6259]">No agent logs yet</p>
            <p className="text-[11px] text-[#9A938C] mt-1">Logs will appear as agents run.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat Sidebar                                                       */
/* ------------------------------------------------------------------ */
function ChatSidebar({ projectId }: { projectId: string }) {
  const { messages, loading, isTyping, sendMessage, fetchMessages } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages(projectId);
  }, [projectId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    await sendMessage(projectId, input);
    setInput('');
  };

  return (
    <aside className="w-full h-full bg-white flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 h-12 border-b border-[#EAE2DA] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold">Swarm chat</span>
          <div className="flex -space-x-1">
            <span className="relative z-40 w-3.5 h-3.5 rounded-full bg-[#1D1B1A] ring-2 ring-white" />
            <span className="relative z-30 w-3.5 h-3.5 rounded-full bg-[#F5500B] ring-2 ring-white" />
            <span className="relative z-20 w-3.5 h-3.5 rounded-full bg-[#FFA180] ring-2 ring-white" />
            <span className="relative z-10 w-3.5 h-3.5 rounded-full bg-[#D8D0CA] ring-2 ring-white" />
          </div>
        </div>
        <button className="text-[#A39A90]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-4 py-4 flex flex-col gap-4 text-[13px]">
        {messages.length === 0 && (
          <>
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#1D1B1A] text-white px-3.5 py-2.5 leading-relaxed">
                Build a marketplace MVP with listings, checkout and seller dashboard
              </div>
            </div>

            <div className="flex flex-col gap-1 max-w-[90%]">
              <div className="flex items-center gap-1.5 pl-1">
                <span className="w-2 h-2 rounded-full bg-[#F5500B]" />
                <span className="font-mono text-[11px] text-[#8A827A]">supervisor</span>
                <span className="text-[10.5px] text-[#C9C0B7]">2m</span>
              </div>
              <div className="rounded-2xl rounded-tl-md bg-[#FAF6F0] border border-[#EAE2DA] px-3.5 py-2.5 leading-relaxed text-[#332F2B]">
                Plan ready — decomposed into 9 tasks. Database first, then parallel backend/frontend.
                <div className="mt-2.5 flex flex-col gap-1.5 border-t border-[#EAE2DA] pt-2.5">
                  {[
                    { done: true, text: 'Prisma schema + migrations' },
                    { done: true, text: 'Auth + session middleware' },
                    { done: false, text: 'Listings grid + checkout flow' },
                  ].map((t) => (
                    <div key={t.text} className="flex items-center gap-2 text-[12px]">
                      <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full shrink-0 ${t.done ? 'bg-[#F5500B] text-white' : 'border-[1.5px] border-[#D8D0CA]'}`}>
                        {t.done && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </span>
                      <span className={t.done ? 'line-through text-[#A39A90]' : 'text-[#6B6259]'}>{t.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1 max-w-[90%]">
              <div className="flex items-center gap-1.5 pl-1">
                <span className="w-2 h-2 rounded-full bg-[#F5500B] animate-pulse" />
                <span className="font-mono text-[11px] text-[#8A827A]">backend-agent</span>
                <span className="text-[10.5px] text-[#C9C0B7]">40s</span>
              </div>
              <div className="rounded-2xl rounded-tl-md bg-[#FAF6F0] border border-[#EAE2DA] px-3.5 py-2.5 leading-relaxed text-[#332F2B]">
                Generated{' '}
                <span className="font-mono text-[12px] bg-[#EFE9E1] rounded px-1">/api/listings</span>,{' '}
                <span className="font-mono text-[12px] bg-[#EFE9E1] rounded px-1">/api/checkout</span>{' '}
                with Stripe stub.{` `}
                <span className="inline-flex items-center rounded-full bg-[#FFD9C7] px-1.5 py-px font-mono text-[11.5px] font-medium text-[#C24006]">@reviewer</span>{' '}
                please verify auth middleware.
              </div>
            </div>

            <div className="flex flex-col gap-1 max-w-[90%]">
              <div className="flex items-center gap-1.5 pl-1">
                <span className="w-2 h-2 rounded-full bg-[#D8D0CA]" />
                <span className="font-mono text-[11px] text-[#8A827A]">qa-agent</span>
                <span className="text-[10.5px] text-[#C9C0B7]">12s</span>
              </div>
              <div className="rounded-2xl rounded-tl-md bg-[#FAF6F0] border border-[#EAE2DA] px-3.5 py-2.5 leading-relaxed text-[#332F2B]">
                Unit suite finished on{' '}
                <span className="font-mono text-[12px]">apps/api</span>:
                <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-[#D9EBDD] bg-[#F2F9F3] px-3 py-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#2F9E5B] text-white shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <div className="leading-tight">
                    <div className="font-mono text-[12px] font-semibold text-[#1F6A3C]">48/48 unit tests passing</div>
                    <div className="text-[11px] text-[#7BA489]">vitest · 3.4s</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'flex-col gap-1 max-w-[90%]'}`}>
            {msg.role !== 'USER' && (
              <div className="flex items-center gap-1.5 pl-1">
                <span className={`w-2 h-2 rounded-full ${msg.agentType ? 'bg-[#F5500B]' : 'bg-[#D8D0CA]'}`} />
                <span className="font-mono text-[11px] text-[#8A827A]">{msg.agentType?.toLowerCase() || 'system'}</span>
              </div>
            )}
            <div
              className={`px-3.5 py-2.5 leading-relaxed ${
                msg.role === 'USER'
                  ? 'max-w-[85%] rounded-2xl rounded-br-md bg-[#1D1B1A] text-white'
                  : 'rounded-2xl rounded-tl-md bg-[#FAF6F0] border border-[#EAE2DA] text-[#332F2B]'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="mt-auto flex items-center gap-2 pl-1 text-[12px] text-[#A39A90]">
            <span className="w-2 h-2 rounded-full bg-[#F5500B] animate-pulse" />
            <span className="font-mono text-[11px]">frontend-agent</span> is typing
            <span className="flex gap-[3px]">
              <span className="w-1 h-1 rounded-full bg-[#A39A90] animate-typing-dot" />
              <span className="w-1 h-1 rounded-full bg-[#A39A90] animate-typing-dot" style={{ animationDelay: '0.15s' }} />
              <span className="w-1 h-1 rounded-full bg-[#A39A90] animate-typing-dot" style={{ animationDelay: '0.3s' }} />
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 pb-4 pt-1 shrink-0">
        <div className="flex items-center gap-1.5 pb-2">
          {['@supervisor', '@backend', '@qa'].map((tag) => (
            <span key={tag} className="rounded-full border border-[#EAE2DA] bg-[#FAF6F0] px-2 py-[3px] font-mono text-[11px] text-[#8A827A] cursor-pointer hover:border-[#F5500B] hover:text-[#F5500B] transition-colors">
              {tag}
            </span>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-xl border border-[#DDD3C9] bg-white px-3 py-2.5 shadow-sm">
          <button type="button" className="text-[#A39A90] flex items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="M12 5v14" />
            </svg>
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 text-[12.5px] text-[#1A1817] outline-none bg-transparent"
            placeholder="Message the swarm — use @ to mention an agent"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#F5500B] text-white shrink-0 disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
            </svg>
          </button>
        </form>
      </div>
    </aside>
  );
}
