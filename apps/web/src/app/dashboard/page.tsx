'use client';

import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                    */
/* ------------------------------------------------------------------ */
type Project = { id: string; slug: string; name: string; description: string; status: 'Building' | 'Deployed' | 'Draft'; agentsActive: number; progress: number; tags: string[]; updated: string; };

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  if (diffM < 1) return 'just now';
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function mapApiProject(p: any): Project {
  const statusMap: Record<string, Project['status']> = {
    PENDING: 'Draft',
    PLANNING: 'Building',
    IN_PROGRESS: 'Building',
    REVIEWING: 'Building',
    COMPLETED: 'Deployed',
    FAILED: 'Draft',
    ARCHIVED: 'Draft',
  };
  const agents: any[] = p.agents || [];
  const active = agents.filter((a: any) => a.status === 'RUNNING').length;
  const completed = agents.filter((a: any) => a.status === 'COMPLETED').length;
  const progress = agents.length > 0 ? Math.round((completed / 9) * 100) : 0;
  const tags: string[] = [];
  if (p.techStack?.frontend) tags.push(p.techStack.frontend);
  if (p.techStack?.backend) tags.push(p.techStack.backend);
  if (p.techStack?.db) tags.push(p.techStack.db);
  return {
    id: p.id,
    slug: p.name,
    name: p.name,
    description: p.description || 'No description',
    status: statusMap[p.status] || 'Draft',
    agentsActive: Math.min(active, 9),
    progress,
    tags: tags.length ? tags : ['SwarmDev'],
    updated: timeAgo(p.updatedAt),
  };
}

function computeStats(projects: any[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const buildsThisMonth = projects.filter((p) => new Date(p.createdAt) >= monthStart).length;
  const activeBuilds = projects.filter((p) => ['IN_PROGRESS', 'PLANNING', 'REVIEWING'].includes(p.status)).length;
  const completedBuilds = projects.filter((p) => p.status === 'COMPLETED').length;
  const totalAgentRuns = projects.reduce((sum, p) => sum + (p.agents?.length || 0), 0);
  const totalTokens = projects.reduce((sum, p) => sum + (p.agents?.reduce((s: number, a: any) => s + (a.tokenUsed || 0), 0) || 0), 0);
  return { buildsThisMonth, activeBuilds, completedBuilds, totalAgentRuns, totalTokens, totalProjects: projects.length };
}

function computeActivity(projects: any[]) {
  const agentActions: Record<string, string> = {
    SUPERVISOR: 'orchestrating swarm plan',
    FRONTEND: 'building UI components',
    BACKEND: 'generating API routes',
    DATABASE: 'designing schema',
    DEVOPS: 'provisioning infrastructure',
    QA: 'running test suite',
    REVIEWER: 'reviewing code output',
    SECURITY: 'scanning for vulnerabilities',
    DOCUMENTATION: 'writing documentation',
  };

  const runs = projects
    .flatMap((p) => (p.agents || []).map((a: any) => ({ ...a, projectName: p.name })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return runs.slice(0, 5).map((run) => {
    const action = agentActions[run.agentType] || 'working';
    const message =
      run.status === 'RUNNING'
        ? `${action} for`
        : run.status === 'COMPLETED'
          ? `completed ${action.replace(/ing /, 'ed ')} for`
          : run.status === 'FAILED'
            ? `failed while ${action} on`
            : `${action} for`;
    const color = run.status === 'RUNNING' ? '#F5500B' : run.status === 'COMPLETED' ? '#1F9D55' : run.status === 'FAILED' ? '#EF4444' : '#FFA180';
    return {
      agent: `${run.agentType?.toLowerCase() || 'unknown'}-agent`,
      color,
      message,
      target: run.projectName,
      time: timeAgo(run.createdAt),
    };
  });
}

function computeRoster(projects: any[]) {
  const allRuns = projects.flatMap((p) => p.agents || []);
  const latestByType: Record<string, any> = {};
  for (const run of allRuns) {
    const type = run.agentType;
    if (!type) continue;
    if (!latestByType[type] || new Date(run.createdAt) > new Date(latestByType[type].createdAt)) {
      latestByType[type] = run;
    }
  }

  const statusMap: Record<string, { status: string; color: string }> = {
    RUNNING: { status: 'busy', color: '#F5500B' },
    COMPLETED: { status: 'idle', color: 'rgba(255,255,255,0.25)' },
    IDLE: { status: 'idle', color: 'rgba(255,255,255,0.25)' },
    FAILED: { status: 'error', color: '#FFA180' },
  };

  const agentTypes = ['SUPERVISOR', 'BACKEND', 'DATABASE', 'FRONTEND', 'DEVOPS', 'QA', 'REVIEWER', 'SECURITY', 'DOCUMENTATION'];

  return agentTypes.map((type) => {
    const run = latestByType[type];
    const mapped = run ? statusMap[run.status] || statusMap.IDLE : statusMap.IDLE;
    return { name: type.toLowerCase(), status: mapped.status, color: mapped.color };
  });
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */
export default function Dashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const [greeting, setGreeting] = useState('Good morning');
  const [prompt, setPrompt] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [rawProjects, setRawProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 12 && h < 18) setGreeting('Good afternoon');
    else if (h >= 18) setGreeting('Good evening');
    else setGreeting('Good morning');
  }, []);

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const [projectsData, profileData] = await Promise.all([
        fetch('/api/projects').then((r) => r.json()),
        fetch('/api/user/profile').then((r) => r.json()).catch(() => null),
      ]);
      const list = projectsData?.projects || [];
      setRawProjects(list);
      setProjects(list.map(mapApiProject));
      setProfile(profileData);
    } catch {
      // silent
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const firstName = user?.firstName || profile?.name || 'Builder';
  const userPlan = profile?.plan || 'FREE';

  const stats = computeStats(rawProjects);
  const activity = computeActivity(rawProjects);
  const roster = computeRoster(rawProjects);

  const filteredProjects =
    filter === 'All'
      ? projects
      : projects.filter((p) =>
          filter === 'Building'
            ? p.status === 'Building'
            : filter === 'Deployed'
              ? p.status === 'Deployed'
              : p.status === 'Draft'
        );

  const handleBuild = async () => {
    if (!prompt.trim() || isBuilding) return;
    setIsBuilding(true);
    try {
      const name = prompt.trim().split(/\s+/).slice(0, 4).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30) || 'new-project';
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: prompt.trim(),
          techStack: { frontend: 'nextjs', backend: 'nodejs' },
        }),
      });
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      const project = await res.json();
      try {
        await fetch(`/api/projects/${project.id}/start`, { method: 'POST' });
      } catch {
        // Best-effort start
      }
      router.push(`/project/${project.id}`);
    } catch (e) {
      console.error('Build error:', e);
      alert('Failed to start build. Please try again.');
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="bg-[#FAF6F0] text-[#1A1817] min-h-screen flex antialiased font-sans">
      <div className="hidden lg:block">
        <Sidebar firstName={firstName} userPlan={userPlan} stats={stats} />
      </div>

      <main className="flex-1 min-w-0 px-4 md:px-8 pt-7 pb-12">
        <motion.div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        >
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight leading-tight">{greeting}, {firstName}</h1>
            <p className="text-[12px] font-mono text-[#9A938C] mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {stats.activeBuilds} build{stats.activeBuilds !== 1 ? 's' : ''} in progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-white border border-[#EAE2DA] rounded-full pl-4 pr-3 py-2.5 w-full md:w-[320px] cursor-text">
              <svg className="w-4 h-4 text-[#6B6661] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <span className="text-[13px] text-[#9A938C] truncate">Search projects, agents, docs…</span>
              <span className="ml-auto text-[11px] font-mono text-[#9A938C] bg-[#FAF6F0] border border-[#EAE2DA] rounded-md px-1.5 py-0.5">⌘K</span>
            </div>
            <button className="relative w-10 h-10 grid place-items-center bg-white border border-[#EAE2DA] rounded-full hover:bg-[#FFF6F0] transition-colors">
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#F5500B] ring-2 ring-white" />
            </button>
            <button
              onClick={() => router.push('/dashboard/new')}
              className="flex items-center gap-1.5 bg-[#F5500B] text-white text-[13.5px] font-semibold rounded-full pl-3.5 pr-4 py-2.5 hover:bg-[#DD4607] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round">
                <path d="M5 12h14" /><path d="M12 5v14" />
              </svg>
              New Project
            </button>
          </div>
        </motion.div>

        <PromptBanner prompt={prompt} setPrompt={setPrompt} onBuild={handleBuild} isBuilding={isBuilding} />
        <StatsCards stats={stats} />
        <ProjectsSection projects={filteredProjects} filter={filter} setFilter={setFilter} loading={projectsLoading} onDelete={loadProjects} />
        <BottomSection activity={activity} roster={roster} />
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */
function Sidebar({ firstName, userPlan, stats }: { firstName: string; userPlan: string; stats: ReturnType<typeof computeStats> }) {
  const navItems = [
    { label: 'Home', href: '/dashboard', active: true, icon: HomeIcon },
    { label: 'Projects', href: '/dashboard', active: false, icon: ProjectsIcon },
    { label: 'Agents', href: '/agents', active: false, icon: AgentsIcon },
    { label: 'Deployments', href: '/dashboard', active: false, icon: DeployIcon },
    { label: 'Usage', href: '/dashboard', active: false, icon: UsageIcon },
    { label: 'Settings', href: '/settings', active: false, icon: SettingsIcon },
  ];

  const planLimits: Record<string, number> = { FREE: 3, PRO: 10, TEAM: 50, ENTERPRISE: Infinity };
  const limit = planLimits[userPlan] || 3;
  const pct = limit === Infinity ? 0 : Math.min((stats.totalProjects / limit) * 100, 100);
  const planLabel = userPlan.charAt(0) + userPlan.slice(1).toLowerCase();

  return (
    <aside className="w-[240px] shrink-0 border-r border-[#EAE2DA] flex flex-col h-screen sticky top-0">
      <div className="px-5 pt-6 pb-5 flex items-center gap-2.5">
        <div className="grid grid-cols-2 gap-[3px] w-[26px] h-[26px]">
          <span className="bg-[#F5500B] rounded-[5px]" />
          <span className="bg-[#F5500B] rounded-[5px] translate-y-[3px] opacity-90" />
          <span className="bg-[#F5500B] rounded-[5px]" />
          <span className="rounded-[5px]" />
        </div>
        <span className="text-[19px] font-bold tracking-tight">SwarmDev</span>
      </div>

      <nav className="px-3 mt-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-[14px] transition-colors ${
              item.active
                ? 'bg-[#FFC9B5]/60 text-[#1A1817] font-semibold'
                : 'text-[#6B6661] font-medium hover:bg-white'
            }`}
          >
            <item.icon className="w-[18px] h-[18px]" active={item.active} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mx-5 my-5 border-t border-[#EAE2DA]" />

      <div className="mx-4 rounded-2xl bg-white border border-[#EAE2DA] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold">Swarm capacity</span>
          <svg className="w-3.5 h-3.5 text-[#F5500B]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-[#F1EAE2] overflow-hidden">
          <div className="h-full rounded-full bg-[#F5500B] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-[11px] font-mono text-[#6B6661]">
          Builds: {stats.totalProjects}/{limit === Infinity ? '∞' : limit}
        </p>
      </div>

      <div className="mt-auto px-4 pb-5">
        <div className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-white transition-colors cursor-pointer">
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: 'w-9 h-9 rounded-full',
                userButtonPopoverCard: 'font-sans',
              },
            }}
          />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight truncate">{firstName}</p>
            <span className="inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-px rounded-full bg-[#FFC9B5]/60 text-[#C2410C]">{planLabel} plan</span>
          </div>
          <svg className="w-4 h-4 ml-auto text-[#6B6661] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round">
            <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </div>
      </div>
    </aside>
  );
}

/* Sidebar icons */
function HomeIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg className={`${className} ${active ? 'text-[#F5500B]' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function ProjectsIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}
function AgentsIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
    </svg>
  );
}
function DeployIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}
function UsageIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}
function SettingsIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Prompt Banner                                                      */
/* ------------------------------------------------------------------ */
function PromptBanner({
  prompt,
  setPrompt,
  onBuild,
  isBuilding,
}: {
  prompt: string;
  setPrompt: Dispatch<SetStateAction<string>>;
  onBuild: () => void;
  isBuilding: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <motion.section
      className="mt-6 rounded-3xl bg-white border border-[#F8C9AE] shadow-[0_0_0_6px_rgba(245,80,11,0.05),0_24px_60px_-30px_rgba(245,80,11,0.25)] px-4 md:px-10 py-6 md:py-9"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: 'easeOut', delay: 0.09 }}
    >
      <div className="max-w-[760px] mx-auto text-center">
        <p className="text-[12px] font-mono uppercase tracking-[0.18em] text-[#C2410C]">9 agents · 1 prompt</p>
        <h2 className="mt-2 text-[24px] md:text-[32px] leading-tight font-semibold tracking-tight">What will your swarm build today?</h2>
        <div className="mt-6 flex items-center gap-3 bg-[#FAF6F0] border border-[#EAE2DA] rounded-full pl-3 pr-2 py-2 focus-within:border-[#F5500B]/50">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 grid place-items-center rounded-full bg-white border border-[#EAE2DA] text-[#6B6661] shrink-0 hover:border-[#F5500B]/50 transition-colors"
            title="Attach"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round">
              <path d="M5 12h14" /><path d="M12 5v14" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPrompt((prev) => prev + (prev ? '\n' : '') + `[Attached: ${file.name}]`);
            }}
          />
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onBuild();
              }
            }}
            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder-[#9A938C]"
            placeholder="Describe your app, the swarm brings it to life…"
          />
          <button
            onClick={onBuild}
            disabled={isBuilding || !prompt.trim()}
            className="w-10 h-10 grid place-items-center rounded-full bg-[#F5500B] text-white shrink-0 hover:bg-[#DD4607] transition-colors disabled:opacity-50"
            title="Build"
          >
            {isBuilding ? (
              <svg className="w-[18px] h-[18px] animate-spin" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.22-8.56" />
              </svg>
            ) : (
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
          <span className="text-[12px] text-[#9A938C] mr-1">Try:</span>
          {['SaaS KPI dashboard', 'AI support chatbot', 'Marketplace MVP', 'Internal admin panel'].map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-full bg-white border border-[#EAE2DA] hover:border-[#F5500B] hover:text-[#F5500B] transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats Cards                                                        */
/* ------------------------------------------------------------------ */
function StatsCards({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const formatNumber = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${n}`);
  return (
    <motion.section
      className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: 'easeOut', delay: 0.18 }}
    >
      <StatCard
        label="Builds this month"
        value={String(stats.buildsThisMonth)}
        sub={`${stats.totalProjects} total builds`}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" />
          </svg>
        }
        chart
      />
      <StatCard
        label="Agent runs"
        value={formatNumber(stats.totalAgentRuns)}
        sub={`${formatNumber(stats.totalTokens)} tokens used`}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        }
      />
      <StatCard
        label="Deployments"
        value={String(stats.completedBuilds)}
        sub={stats.completedBuilds > 0 ? 'Completed projects' : 'No completed builds yet'}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
          </svg>
        }
        live={stats.activeBuilds > 0}
      />
      <StatCard
        label="Active agents"
        value={String(stats.activeBuilds)}
        sub={stats.activeBuilds > 0 ? 'Currently building' : 'No active builds'}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        }
      />
    </motion.section>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  chart,
  live,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  chart?: boolean;
  live?: boolean;
}) {
  return (
    <div className="bg-white border border-[#EAE2DA] rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-[#6B6661]">{label}</span>
        {icon}
      </div>
      <div className="mt-2 flex items-end justify-between">
        <span className="text-[28px] font-semibold leading-none tracking-tight">{value}</span>
        {chart && (
          <div className="flex items-end gap-[3px] h-7">
            <span className="w-[5px] rounded-full bg-[#FFC9B5] h-2" />
            <span className="w-[5px] rounded-full bg-[#FFC9B5] h-3.5" />
            <span className="w-[5px] rounded-full bg-[#FFA180] h-2.5" />
            <span className="w-[5px] rounded-full bg-[#FFA180] h-4" />
            <span className="w-[5px] rounded-full bg-[#F5500B] h-5" />
            <span className="w-[5px] rounded-full bg-[#F5500B] h-7" />
          </div>
        )}
        {live && (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1F9D55] bg-[#1F9D55]/10 px-2 py-0.5 rounded-full mb-px">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1F9D55]" />
            live
          </span>
        )}
      </div>
      <p className="mt-2 text-[11.5px] text-[#9A938C]">{sub}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Projects Section                                                   */
/* ------------------------------------------------------------------ */
function ProjectsSection({
  projects,
  filter,
  setFilter,
  loading,
  onDelete,
}: {
  projects: Project[];
  filter: string;
  setFilter: (f: string) => void;
  loading?: boolean;
  onDelete?: () => void;
}) {
  return (
    <motion.section
      className="mt-10"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: 'easeOut', delay: 0.27 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-semibold tracking-tight">Your projects</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-[#EAE2DA] rounded-full p-1">
            {['All', 'Building', 'Deployed', 'Drafts'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[12.5px] px-3.5 py-1.5 rounded-full transition-colors ${
                  filter === f
                    ? 'bg-[#211F1E] text-white font-semibold'
                    : 'text-[#6B6661] hover:text-[#1A1817] font-medium'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#6B6661] bg-white border border-[#EAE2DA] rounded-full px-3.5 py-2 hover:text-[#1A1817] transition-colors">
            Recent
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-[#EAE2DA] rounded-3xl p-6 flex flex-col animate-pulse">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="h-4 bg-[#F1EAE2] rounded w-3/4" />
                <div className="mt-2 h-3 bg-[#F1EAE2] rounded w-1/2" />
              </div>
              <div className="h-5 bg-[#F1EAE2] rounded-full w-16 shrink-0" />
            </div>
            <div className="mt-3 h-3 bg-[#F1EAE2] rounded w-full" />
            <div className="mt-4 flex items-center gap-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: 9 }).map((_, j) => (
                  <span key={j} className="w-2 h-2 rounded-full bg-[#F1EAE2]" />
                ))}
              </div>
              <div className="h-3 bg-[#F1EAE2] rounded w-20" />
            </div>
            <div className="mt-auto pt-4">
              <div className="pt-3 border-t border-[#F1EAE2] flex items-center justify-between">
                <div className="h-3 bg-[#F1EAE2] rounded w-24" />
                <div className="w-7 h-7 rounded-full bg-[#F1EAE2]" />
              </div>
            </div>
          </div>
        ))}
        {!loading && projects.map((project) => (
          <ProjectCard key={project.id} project={project} onDelete={onDelete} />
        ))}
        {!loading && projects.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-[#F1EAE2] grid place-items-center mb-4">
              <svg className="w-7 h-7 text-[#A39A90]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[#1A1817]">No projects yet</p>
            <p className="text-[13px] text-[#9A938C] mt-1 max-w-sm">
              Describe your app idea above and the swarm will build it for you.
            </p>
          </div>
        )}
      </div>
    </motion.section>
  );
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete?: () => void }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const statusColors = {
    Building: 'text-[#C2410C] bg-[#FFC9B5]/55',
    Deployed: 'text-white bg-[#211F1E]',
    Draft: 'text-[#55504B] bg-[#D8D0CA]',
  };

  const dotColors = ['bg-[#F5500B]', 'bg-[#FFA180]', 'bg-[#E5DDD5]'];
  const getDotColor = (idx: number, active: number) => {
    if (idx < active) return dotColors[Math.min(idx, 1)];
    return 'bg-[#E5DDD5]';
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      onDelete?.();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete project. Please try again.');
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <article
      onClick={() => router.push(`/project/${project.id}`)}
      className="bg-white border border-[#EAE2DA] rounded-3xl p-6 flex flex-col hover:shadow-[0_18px_40px_-22px_rgba(33,31,30,0.28)] transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15.5px] font-semibold truncate">{project.name}</h3>
          <p className="text-[11px] font-mono text-[#9A938C] mt-0.5">{project.id}</p>
        </div>
        <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusColors[project.status]}`}>
          {project.status === 'Building' && (
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-[#F5500B] opacity-60 animate-ping" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-[#F5500B]" />
            </span>
          )}
          {project.status === 'Deployed' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#1F9D55]" />
          )}
          {project.status}
        </span>
      </div>
      <p className="mt-3 text-[13px] text-[#6B6661] leading-snug truncate">{project.description}</p>
      <div className="mt-4 flex items-center gap-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className={`w-2 h-2 rounded-full ${getDotColor(i, project.agentsActive)}`} />
          ))}
        </div>
        <span className="text-[11px] font-mono text-[#6B6661]">{project.agentsActive}/9 agents active</span>
      </div>
      {project.status === 'Building' && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-[#F1EAE2] overflow-hidden">
            <div className="h-full rounded-full bg-[#F5500B]" style={{ width: `${project.progress}%` }} />
          </div>
          <span className="text-[10.5px] font-mono text-[#9A938C]">{project.progress}%</span>
        </div>
      )}
      <div className="mt-4 flex items-center gap-1.5 flex-wrap">
        {project.tags.map((tag) => (
          <span key={tag} className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-[#D8D0CA]/45 text-[#6B6661]">{tag}</span>
        ))}
      </div>
      <div className="mt-auto pt-4">
        <div className="pt-3 border-t border-[#F1EAE2] flex items-center justify-between">
          <span className="text-[11.5px] text-[#9A938C]">Updated {project.updated}</span>
          <div className="flex items-center gap-1.5">
            {confirming ? (
              <>
                <span className="text-[11px] text-[#C2410C] font-medium">Delete?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-[11px] font-semibold px-2 py-1 rounded-full bg-[#C2410C] text-white hover:bg-[#A33000] transition-colors disabled:opacity-50"
                >
                  {deleting ? '...' : 'Yes'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
                  className="text-[11px] font-semibold px-2 py-1 rounded-full bg-[#F1EAE2] text-[#6B6661] hover:bg-[#EAE2DA] transition-colors"
                >
                  No
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
                  className="w-7 h-7 grid place-items-center rounded-full border border-[#EAE2DA] text-[#6B6661] hover:bg-[#FAF6F0] hover:text-[#C2410C] hover:border-[#C2410C]/30 transition-colors"
                  title="Delete project"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6" /><path d="M14 11v6" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/project/${project.id}`); }}
                  className="w-7 h-7 grid place-items-center rounded-full border border-[#EAE2DA] text-[#6B6661] hover:bg-[#FAF6F0] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 7h10v10" /><path d="M7 17 17 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Bottom Section (Activity + Roster)                                 */
/* ------------------------------------------------------------------ */
function BottomSection({ activity, roster }: { activity: ReturnType<typeof computeActivity>; roster: ReturnType<typeof computeRoster> }) {
  const router = useRouter();
  const hasActivity = activity.length > 0;
  return (
    <motion.section
      className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: 'easeOut', delay: 0.36 }}
    >
      <div className="md:col-span-2 bg-white border border-[#EAE2DA] rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold tracking-tight">Recent swarm activity</h2>
          <button
            onClick={() => router.push('/agents')}
            className="text-[12.5px] font-semibold text-[#F5500B] flex items-center gap-1 hover:gap-1.5 transition-all"
          >
            View all
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
        {hasActivity ? (
          <ul className="mt-3 divide-y divide-[#F1EAE2]">
            {activity.map((item, i) => (
              <li key={i} className="flex items-center gap-3 py-3.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[12px] font-mono w-[130px] shrink-0">{item.agent}</span>
                <span className="text-[13px] text-[#6B6661] truncate">
                  {item.message}{' '}
                  {item.target && <span className="font-medium text-[#1A1817]">{item.target}</span>}
                </span>
                <span className="ml-auto text-[11.5px] font-mono text-[#9A938C] shrink-0">{item.time}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 text-center py-8">
            <p className="text-[13px] text-[#9A938C]">No swarm activity yet. Start a build to see live updates.</p>
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#FAF6F0] border border-[#EAE2DA] px-4 py-3">
          <span className="w-2 h-2 rounded-full bg-[#F5500B] animate-pulse" />
          <span className="text-[11.5px] font-mono text-[#6B6661]">streaming live from build cluster · us-east-1</span>
          <span className="ml-auto text-[11px] font-mono text-[#9A938C] bg-white border border-[#EAE2DA] rounded-md px-1.5 py-0.5">tail -f</span>
        </div>
      </div>

      <div className="bg-[#211F1E] text-white rounded-3xl p-6 flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold tracking-tight">Swarm roster</h2>
          <span className="text-[10.5px] font-mono text-[#FFA180] bg-white/10 px-2 py-0.5 rounded-full">9 agents</span>
        </div>
        <ul className="mt-4 space-y-2.5 text-[12.5px]">
          {roster.map((agent) => (
            <li key={agent.name} className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: agent.color }} />
              <span className="font-mono text-white/85">{agent.name}</span>
              <span className="ml-auto text-[10.5px] font-mono text-white/40">{agent.status}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => router.push('/agents')}
          className="mt-auto pt-5"
        >
          <span className="flex items-center justify-center gap-1.5 w-full text-[12.5px] font-semibold bg-white/10 hover:bg-white/15 transition-colors rounded-full py-2.5">
            Open agent console
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 7h10v10" /><path d="M7 17 17 7" />
            </svg>
          </span>
        </button>
      </div>
    </motion.section>
  );
}
