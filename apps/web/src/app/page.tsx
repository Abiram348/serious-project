'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  GitBranch,
  Terminal,
  Code2,
  Layers,
  Sparkles,
  ExternalLink,
  Check,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Animated background — grid + subtle radial gradient pulse         */
/* ------------------------------------------------------------------ */
function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid */}
      <div
        className="absolute inset-0 bg-grid"
        style={{ maskImage: 'radial-gradient(ellipse at 50% 0%, black 40%, transparent 72%)' }}
      />
      {/* Glow orbs */}
      <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute -top-20 right-1/4 h-[400px] w-[400px] rounded-full bg-secondary/10 blur-[100px]" />
      {/* Scan line */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)',
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'border-b border-border/50 bg-background/80 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Swarm<span className="text-primary">Dev</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How it Works
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero Section                                                       */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 pt-16">
      <HeroBackground />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
          <span className="status-dot status-dot-active" />
          Now powered by Ollama Cloud
        </div>

        {/* Headline */}
        <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          A full dev team
          <br />
          <span className="text-gradient">in your browser</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Describe your idea in plain English. Nine specialized AI agents collaborate in
          parallel — frontend, backend, database, tests, security — to build and deploy
          your application. No local setup, no single-agent bottleneck.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard/new"
            className="group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:glow-ring"
          >
            Start Building Free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-8 py-3.5 text-base font-medium text-foreground transition-all hover:bg-surface-elevated"
          >
            <Terminal className="h-4 w-4" />
            See how it works
          </Link>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex -space-x-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-surface-elevated text-xs font-medium"
              >
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          <span>
            Trusted by builders shipping <strong className="text-foreground">10x faster</strong>
          </span>
        </div>
      </div>

      {/* Floating agent mini-cards (decorative) */}
      <AgentSwarmPreview />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating agent swarm preview — decorative animated mini-cards      */
/* ------------------------------------------------------------------ */
const agents = [
  { type: 'Supervisor', icon: 'S', color: 'border-primary/40 bg-primary/5' },
  { type: 'Frontend', icon: 'F', color: 'border-accent/40 bg-accent/5' },
  { type: 'Backend', icon: 'B', color: 'border-secondary/40 bg-secondary/5' },
  { type: 'Database', icon: 'D', color: 'border-warning/40 bg-warning/5' },
  { type: 'Security', icon: '🔒', color: 'border-red-500/40 bg-red-500/5' },
];

function AgentSwarmPreview() {
  return (
    <div className="relative mt-16 hidden w-full max-w-3xl lg:block">
      {agents.map((agent, i) => {
        const positions = [
          'left-[10%] -top-4',
          'left-[30%] -top-2',
          'left-[50%] -top-6',
          'left-[68%] -top-2',
          'left-[85%] -top-4',
        ];
        return (
          <div
            key={agent.type}
            className={`absolute ${positions[i]} animate-fade-in rounded-lg border ${agent.color} px-3 py-2 text-xs backdrop-blur-sm`}
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            <div className="flex items-center gap-2">
              <span className="status-dot status-dot-active" />
              <span className="font-medium text-foreground">{agent.type}</span>
              <span className="text-muted-foreground">{i === 0 ? 'Planning...' : 'Ready'}</span>
            </div>
          </div>
        );
      })}

      {/* Central "project" card */}
      <div
        className="mx-auto w-80 rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur-md animate-slide-up"
        style={{ animationDelay: '0.6s' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium">my-saas-app</div>
            <div className="text-xs text-muted-foreground">5 agents active</div>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent shimmer"
            style={{ width: '60%' }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Features Grid                                                      */
/* ------------------------------------------------------------------ */
const features = [
  {
    icon: <Zap className="h-5 w-5" />,
    title: 'Parallel Agent Execution',
    description:
      'Nine specialized agents work simultaneously, not sequentially. Frontend, backend, database, and tests all build at once — like a real engineering team.',
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: 'Built-in Security Review',
    description:
      'Every project gets a dedicated Security Agent audit. OWASP Top 10 checks, dependency scanning, and secret detection before anything ships.',
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Live Observability',
    description:
      'Watch every agent action in real time. Streaming logs, file diffs, agent-to-agent communication, and build output — all visible as it happens.',
  },
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: 'Iterative Refinement',
    description:
      'Chat with the Supervisor agent to request changes. Agents adapt existing code instead of regenerating from scratch. Multi-turn conversations that actually work.',
  },
  {
    icon: <Terminal className="h-5 w-5" />,
    title: 'Cloud Sandbox Execution',
    description:
      'Everything runs in isolated E2B containers. Full shell access, npm/pip installs, and live preview URLs. Zero local setup required.',
  },
  {
    icon: <Code2 className="h-5 w-5" />,
    title: 'Full-Stack Generation',
    description:
      'Next.js frontends, Express APIs, Prisma schemas, Docker configs, GitHub Actions — the complete stack. Download as ZIP or push straight to GitHub.',
  },
];

function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            One prompt, <span className="text-gradient">nine agents</span>, a complete app
          </h2>
          <p className="mt-4 text-muted-foreground">
            SwarmDev is not a single AI assistant — it is a coordinated team of specialized
            agents, each owning their domain, collaborating in real time.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-primary/30 hover:bg-surface-elevated animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-base font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                       */
/* ------------------------------------------------------------------ */
const steps = [
  {
    step: '01',
    title: 'Describe your idea',
    description:
      'Type a project description in natural language. "Build a SaaS dashboard with user auth, Stripe billing, and an admin panel." The Supervisor agent breaks it into tasks.',
    code: '> Build a project management SaaS\n> with real-time collaboration...',
  },
  {
    step: '02',
    title: 'Agents swarm the problem',
    description:
      'Nine specialized agents fan out in parallel. Database designs the schema, Backend builds the API, Frontend scaffolds the UI — all simultaneously.',
    code: 'Supervisor   ● Planning phase\nFrontend     ● Generating components\nBackend      ● Building API routes\nDatabase     ● Writing schema...',
  },
  {
    step: '03',
    title: 'Review, refine, deploy',
    description:
      'QA writes and runs tests. Security audits every endpoint. Reviewer flags issues. You chat with agents to tweak anything, then deploy with one click.',
    code: '✓ 247 tests passing\n✓ Security audit: 0 critical\n✓ Live at my-saas.vercel.app',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 bg-surface/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From idea to deployed app in{' '}
            <span className="text-gradient">minutes</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Three steps. No local dev environment. No waiting for a single agent to finish
            before the next one starts.
          </p>
        </div>

        <div className="mt-16 space-y-12">
          {steps.map((step, i) => (
            <div
              key={step.step}
              className="grid items-center gap-8 lg:grid-cols-2 animate-fade-in"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {step.step}
                </div>
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
              <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
                <div className="rounded-xl border border-border/50 bg-card/80 p-5 font-mono text-xs leading-relaxed text-muted-foreground backdrop-blur">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-destructive/60" />
                    <div className="h-3 w-3 rounded-full bg-warning/60" />
                    <div className="h-3 w-3 rounded-full bg-accent/60" />
                    <span className="ml-2 text-[10px] uppercase tracking-wider">
                      swarmdev terminal
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap">{step.code}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */
const tiers = [
  {
    name: 'Free',
    price: '$0',
    description: 'Try it out. Build up to 3 projects.',
    features: [
      '3 projects',
      '100K tokens / month',
      'Supervisor + 2 agents',
      'Live preview URLs',
      'ZIP export',
      'Community support',
    ],
    cta: 'Start Free',
    href: '/auth/signup',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For indie builders shipping products.',
    features: [
      'Unlimited projects',
      '2M tokens / month',
      'All 9 agents in parallel',
      'GitHub integration',
      'One-click deploy',
      'Priority support',
    ],
    cta: 'Go Pro',
    href: '/auth/signup',
    featured: true,
  },
  {
    name: 'Team',
    price: '$99',
    period: '/month',
    description: 'For teams collaborating on bigger apps.',
    features: [
      'Everything in Pro',
      '10M tokens / month',
      'Multi-user collaboration',
      'Custom agent roles',
      'BYOK (bring your own keys)',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@swarmdev.io',
    featured: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, <span className="text-gradient">transparent</span> pricing
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free. Upgrade when you need parallel agents and more tokens.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier, i) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-8 transition-all animate-fade-in ${
                tier.featured
                  ? 'border-primary/40 bg-primary/5 glow-ring'
                  : 'border-border/50 bg-card hover:border-primary/20'
              }`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{tier.price}</span>
                {tier.period && (
                  <span className="text-sm text-muted-foreground">{tier.period}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
              <ul className="mt-6 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`mt-8 flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  tier.featured
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border bg-surface text-foreground hover:bg-surface-elevated'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="border-t border-border/50 bg-surface/30">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-semibold">
              Swarm<span className="text-primary">Dev</span>
            </span>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            A cloud-native AI software company in a browser. Built with Ollama Cloud,
            E2B sandboxes, and open-source agent orchestration.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              GitHub
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Docs
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SwarmDev. Built by developers, for developers.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Export                                                        */
/* ------------------------------------------------------------------ */
export default function Home() {
  return (
    <main className="relative overflow-x-hidden">
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Footer />
    </main>
  );
}
