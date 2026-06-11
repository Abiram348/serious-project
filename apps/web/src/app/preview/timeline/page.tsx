'use client';

/**
 * Preview — Radial Orbital Timeline (jatin-yadav05) used for the SwarmDev
 * home page hero. Five agents (Supervisor, Frontend, Backend, Database,
 * Security) orbit a central project orb. Click any node to focus it.
 *
 * Adapted from:
 *   https://21st.dev/community/components/jatin-yadav05/radial-orbital-timeline
 *
 * The component itself lives in @/components/ui/radial-orbital-timeline.
 */

import RadialOrbitalTimeline, { type TimelineItem } from '@/components/ui/radial-orbital-timeline';
import { Cpu, Code2, Wrench, Database, Lock } from 'lucide-react';

const agentsTimeline: TimelineItem[] = [
  {
    id: 1,
    title: 'Supervisor',
    date: '00:00',
    content:
      'Breaks the prompt into tasks, sequences dependencies, and dispatches work to the right agents in parallel.',
    category: 'Orchestrator',
    icon: Cpu,
    relatedIds: [2, 3, 4, 5],
    status: 'completed',
    energy: 100,
  },
  {
    id: 2,
    title: 'Frontend',
    date: '00:03',
    content:
      'Scaffolds the Next.js app shell, theme tokens, sidebar, and shared components from the design spec.',
    category: 'UI · Next.js',
    icon: Code2,
    relatedIds: [1, 3],
    status: 'completed',
    energy: 92,
  },
  {
    id: 3,
    title: 'Backend',
    date: '00:06',
    content:
      'Builds API routes, request validation, Clerk auth middleware, and Stripe webhooks. Currently running.',
    category: 'API · Express',
    icon: Wrench,
    relatedIds: [1, 4, 5],
    status: 'in-progress',
    energy: 64,
  },
  {
    id: 4,
    title: 'Database',
    date: '00:09',
    content:
      'Models the Postgres schema, writes Prisma migrations, and seeds fixtures for users, projects, and runs.',
    category: 'Postgres · Prisma',
    icon: Database,
    relatedIds: [3, 5],
    status: 'pending',
    energy: 30,
  },
  {
    id: 5,
    title: 'Security',
    date: '00:12',
    content:
      'Scans dependencies, audits route-level auth, and runs secret-leak detection on generated code.',
    category: 'Hardening',
    icon: Lock,
    relatedIds: [3, 4],
    status: 'pending',
    energy: 12,
  },
];

export default function TimelinePreview() {
  return (
    <main className="min-h-screen bg-background p-8">
      <header className="mx-auto mb-8 max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              SwarmDev pipeline —{' '}
              <span className="text-primary">Radial Orbital Timeline</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Adapted from{' '}
              <a
                className="underline"
                href="https://21st.dev/community/components/jatin-yadav05/radial-orbital-timeline"
                target="_blank"
                rel="noreferrer"
              >
                jatin-yadav05 / radial-orbital-timeline
              </a>
              . Five agents orbit a central project orb with a 3D perspective.
              Click any node to focus it (the orbit freezes and a side panel
              opens with details). The component is installed at{' '}
              <code className="rounded bg-muted px-1 text-xs">
                @/components/ui/radial-orbital-timeline
              </code>
              .
            </p>
          </div>
          <a
            href="/preview"
            className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
          >
            ← All variants
          </a>
        </div>
      </header>

      <RadialOrbitalTimeline timelineData={agentsTimeline} />
    </main>
  );
}
