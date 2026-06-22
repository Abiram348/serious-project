'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import socket from '../socket';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface AgentEvent {
  agent: string;
  status: string;
  summary?: string;
}

/* ------------------------------------------------------------------ */
/*  Sidebar (matches dashboard exactly)                                */
/* ------------------------------------------------------------------ */
function Sidebar({ firstName }: { firstName: string }) {
  const navItems = [
    { label: 'Home', href: '/dashboard', active: false, icon: HomeIcon },
    { label: 'Projects', href: '/dashboard', active: false, icon: ProjectsIcon },
    { label: 'Agents', href: '/agents', active: true, icon: AgentsIcon },
    { label: 'Deployments', href: '/dashboard', active: false, icon: DeployIcon },
    { label: 'Usage', href: '/dashboard', active: false, icon: UsageIcon },
    { label: 'Settings', href: '/settings', active: false, icon: SettingsIcon },
  ];

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
          <div className="h-full w-[58%] rounded-full bg-[#F5500B]" />
        </div>
        <p className="mt-2 text-[11px] font-mono text-[#6B6661]">Builds: 14/∞</p>
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
            <p className="text-[13px] font-semibold leading-tight truncate">{firstName} M.</p>
            <span className="inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-px rounded-full bg-[#FFC9B5]/60 text-[#C2410C]">Pro plan</span>
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
    <svg className={`${className} ${active ? 'text-[#F5500B]' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
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
/*  Agent roster data                                                  */
/* ------------------------------------------------------------------ */
const AGENT_ROSTER = [
  { name: 'supervisor', role: 'Orchestrator', desc: 'DAG dispatch & task routing', color: '#F5500B', status: 'active' },
  { name: 'backend', role: 'API Engineer', desc: 'Routes, services, auth', color: '#F5500B', status: 'active' },
  { name: 'database', role: 'Schema Designer', desc: 'Prisma, migrations, queries', color: '#FFA180', status: 'active' },
  { name: 'frontend', role: 'UI Developer', desc: 'React, Tailwind, components', color: '#F5500B', status: 'active' },
  { name: 'devops', role: 'Infra Engineer', desc: 'Docker, K8s, Terraform', color: '#FFA180', status: 'active' },
  { name: 'qa', role: 'Test Engineer', desc: 'Unit, e2e, coverage', color: '#1F9D55', status: 'idle' },
  { name: 'reviewer', role: 'Code Reviewer', desc: 'Quality & best practices', color: '#D8D0CA', status: 'idle' },
  { name: 'security', role: 'Security Scan', desc: 'CVE audit, dependency scan', color: '#FFA180', status: 'active' },
  { name: 'documentation', role: 'Tech Writer', desc: 'README, API docs, guides', color: '#D8D0CA', status: 'idle' },
];

/* ------------------------------------------------------------------ */
/*  Agents Page                                                        */
/* ------------------------------------------------------------------ */
export default function AgentsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [workflowResult, setWorkflowResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    socket.on('agent_done', (data: AgentEvent) => {
      setEvents((prev) => [...prev, data]);
    });
    return () => {
      socket.off('agent_done');
    };
  }, []);

  const startProject = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'demo-project',
          description: 'Auto-generated demo project from the Agents page',
          techStack: { frontend: 'nextjs', backend: 'nodejs' },
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      await fetch(`/api/projects/${data.id}/start`, { method: 'POST' });
      setWorkflowResult(data);
      router.push(`/project/${data.id}`);
    } catch (e) {
      console.error('Error starting project', e);
    } finally {
      setLoading(false);
    }
  };

  const firstName = user?.firstName || 'Abiram';
  const activeCount = AGENT_ROSTER.filter((a) => a.status === 'active').length;

  return (
    <div className="bg-[#FAF6F0] text-[#1A1817] min-h-screen flex antialiased font-sans">
      <div className="hidden lg:block">
        <Sidebar firstName={firstName} />
      </div>

      <main className="flex-1 min-w-0 px-4 md:px-8 pt-7 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Agents</h1>
              <p className="text-[12px] font-mono text-[#9A938C] mt-0.5">
                {activeCount}/9 agents active · streaming live
              </p>
            </div>
            <button
              onClick={startProject}
              disabled={loading}
              className="flex items-center gap-1.5 bg-[#F5500B] text-white text-[13.5px] font-semibold rounded-full pl-3.5 pr-4 py-2.5 hover:bg-[#DD4607] transition-colors disabled:opacity-50"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round">
                  <path d="M5 12h14" /><path d="M12 5v14" />
                </svg>
              )}
              {loading ? 'Starting…' : 'Start Demo'}
            </button>
          </div>

          {/* Agent Roster */}
          <section className="mt-8">
            <h2 className="text-[17px] font-semibold tracking-tight mb-4">Swarm roster</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {AGENT_ROSTER.map((agent) => (
                <div
                  key={agent.name}
                  className="bg-white border border-[#EAE2DA] rounded-2xl p-5 flex items-start gap-3 hover:shadow-[0_12px_28px_-16px_rgba(33,31,30,0.18)] transition-shadow"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${agent.status === 'active' ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: agent.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-semibold capitalize">{agent.name}</span>
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                        agent.status === 'active'
                          ? 'bg-[#FFC9B5]/60 text-[#C2410C]'
                          : 'bg-[#F1EAE2] text-[#9A938C]'
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-[#6B6661] mt-0.5">{agent.role}</p>
                    <p className="text-[11.5px] text-[#9A938C] mt-1 truncate">{agent.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Live Events */}
          <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border border-[#EAE2DA] rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[17px] font-semibold tracking-tight">Live events</h2>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1F9D55] bg-[#1F9D55]/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F9D55]" />
                  connected
                </span>
              </div>
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#F1EAE2] grid place-items-center mb-3">
                    <svg className="w-6 h-6 text-[#A39A90]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-[#1A1817]">No events yet</p>
                  <p className="text-[12.5px] text-[#9A938C] mt-1">Start a build to see real-time agent activity.</p>
                </div>
              ) : (
                <ul className="space-y-1 max-h-[360px] overflow-auto pr-1">
                  {events.map((e, idx) => (
                    <li key={idx} className="flex items-center gap-3 py-2.5 border-b border-[#F1EAE2] last:border-0">
                      <span className="w-2 h-2 rounded-full shrink-0 bg-[#F5500B]" />
                      <span className="text-[12px] font-mono w-[110px] shrink-0 text-[#6B6661]">{e.agent}</span>
                      <span className="text-[13px] text-[#1A1817] flex-1 truncate">{e.status}</span>
                      {e.summary && (
                        <span className="text-[11px] text-[#9A938C] shrink-0 max-w-[140px] truncate">{e.summary}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-[#211F1E] text-white rounded-3xl p-6 flex flex-col">
              <h2 className="text-[17px] font-semibold tracking-tight mb-4">System health</h2>
              <div className="flex-1 space-y-3">
                {[
                  { label: 'Orchestrator', value: 'healthy', color: '#1F9D55' },
                  { label: 'API latency', value: '42ms', color: '#1F9D55' },
                  { label: 'Queue depth', value: '0 jobs', color: '#1F9D55' },
                  { label: 'Error rate', value: '0.02%', color: '#FFA180' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                    <span className="text-[13px] text-white/80">{row.label}</span>
                    <span className="text-[12.5px] font-mono font-semibold" style={{ color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#F5500B] animate-pulse" />
                  <span className="text-[11.5px] font-mono text-white/60">us-east-1 · cluster active</span>
                </div>
              </div>
            </div>
          </section>

          {workflowResult && (
            <div className="mt-5 bg-white border border-[#EAE2DA] rounded-3xl p-6">
              <h2 className="text-[17px] font-semibold tracking-tight mb-3">Last workflow result</h2>
              <pre className="bg-[#FAF6F0] border border-[#EAE2DA] rounded-xl p-4 text-[12px] font-mono text-[#6B6661] overflow-auto max-h-[200px]">
                {JSON.stringify(workflowResult, null, 2)}
              </pre>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
