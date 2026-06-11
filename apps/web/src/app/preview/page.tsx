'use client';

import Link from 'next/link';

const variants = [
  {
    href: '/preview/timeline',
    label: 'Pipeline · Radial Orbital Timeline',
    author: 'jatin-yadav05',
    desc: 'A clean horizontal pipeline: 5 agents along a connecting line, each with a status dot above and a status card below. The active agent has a rotating ring + glow. Simple, scannable, on-brand.',
    accent: 'from-cyan-400/30 to-violet-500/30',
  },
];

export default function PreviewIndex() {
  return (
    <main className="min-h-screen bg-background p-8">
      <header className="mx-auto mb-10 max-w-6xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          Home page hero — design previews
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Candidate for the SwarmDev home page hero, built from a 21st.dev community component. Open the preview to see how it looks, then tell me to apply it to the real home page.
        </p>
        <a href="/" className="mt-3 inline-block text-sm text-muted-foreground hover:text-foreground">
          ← Back to real home page
        </a>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
        {variants.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/60 p-6 transition-colors hover:border-primary/40"
          >
            <div
              className={`pointer-events-none absolute -inset-1 -z-10 bg-gradient-to-br ${v.accent} opacity-50 blur-2xl`}
            />
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{v.label}</h2>
                <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  inspired by {v.author}
                </p>
              </div>
              <span className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[10px] text-muted-foreground group-hover:text-foreground">
                Open preview →
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{v.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
