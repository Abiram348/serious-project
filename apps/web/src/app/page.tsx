'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */
const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

const fadeUpTransition = (delay = 0) => ({
  duration: 0.9,
  ease: [0.22, 1, 0.36, 1],
  delay,
});

/* ------------------------------------------------------------------ */
/*  Landing Page                                                       */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  return (
    <div className="bg-[#FAF6F0] text-[#1A1817] antialiased overflow-x-hidden font-sans">
      <Header />
      <Hero />
      <LogoMarquee />
      <MeetTheSwarm />
      <PlatformCards />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */
function Header() {
  const { isSignedIn, user } = useUser();

  return (
    <header className="max-w-[1400px] mx-auto px-8 py-5 flex items-center justify-between relative z-20">
      <div className="flex items-center gap-7">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative w-7 h-7 inline-block">
            <span className="absolute left-0 top-0 w-3 h-3 rounded-[4px] bg-[#F5500B]" />
            <span className="absolute right-0 top-1.5 w-2.5 h-2.5 rounded-[3.5px] bg-[#F5500B]" />
            <span className="absolute left-1.5 bottom-0 w-3.5 h-3.5 rounded-[5px] bg-[#F5500B]" />
          </span>
          <span className="text-[20px] font-bold tracking-tight">SwarmDev</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-1 text-[14px] font-medium">
          <a href="#features" className="px-3 py-2 rounded-full hover:bg-black/5 flex items-center gap-1 transition-colors">
            Products
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </a>
          <a href="#features" className="px-3 py-2 rounded-full hover:bg-black/5 transition-colors">Solutions</a>
          <a href="#pricing" className="px-3 py-2 rounded-full hover:bg-black/5 transition-colors">Resources</a>
          <a href="#features" className="px-3 py-2 rounded-full hover:bg-black/5 transition-colors">Security</a>
          <a href="#pricing" className="px-3 py-2 rounded-full hover:bg-black/5 transition-colors">Pricing</a>
          <Link
            href="/dashboard"
            className="ml-1 flex items-center gap-1.5 bg-[#F5500B] text-white pl-3.5 pr-1.5 py-1 rounded-full text-[13px] font-semibold hover:bg-[#d94609] transition-colors"
          >
            Swarm
            <span className="bg-white text-[#F5500B] w-6 h-6 rounded-full grid place-items-center text-[12px] font-bold">9</span>
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2 text-[14px] font-medium">
        <a href="mailto:sales@swarmdev.dev" className="px-3 py-2 rounded-full hover:bg-black/5 hidden md:block transition-colors">
          Contact sales
        </a>
        {isSignedIn ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-3 py-2 rounded-full hover:bg-black/5 transition-colors text-[#1A1817] font-medium"
            >
              Dashboard
            </Link>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  userButtonAvatarBox: 'w-9 h-9 rounded-full border border-[#EAE2DA]',
                },
              }}
            />
          </div>
        ) : (
          <>
            <SignInButton mode="modal">
              <button className="px-3 py-2 rounded-full hover:bg-black/5 transition-colors">Log in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="border border-[#F5500B] text-[#F5500B] px-5 py-2.5 rounded-full font-semibold hover:bg-[#F5500B] hover:text-white transition-colors">
                Create account
              </button>
            </SignUpButton>
          </>
        )}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */
const CATEGORIES = [
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /><circle cx="6" cy="6.5" r=".5" fill="currentColor" /></svg>, label: 'Web App' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 17l6-6-6-6M12 19h8" /></svg>, label: 'API' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></svg>, label: 'Database' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17.5 19a4.5 4.5 0 1 0-1.1-8.9 6 6 0 1 0-11.4 2.4A3.5 3.5 0 0 0 6.5 19h11Z" /></svg>, label: 'Infra' },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>, label: 'Docs' },
];

function Hero() {
  const [selectedCat, setSelectedCat] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const prevCat = () => setSelectedCat((i) => (i - 1 + CATEGORIES.length) % CATEGORIES.length);
  const nextCat = () => setSelectedCat((i) => (i + 1) % CATEGORIES.length);

  return (
    <section className="max-w-[1400px] mx-auto px-8 pt-28 pb-20 text-center">
      <motion.h1
        className="text-[72px] leading-[1.02] font-semibold tracking-[-0.03em]"
        initial={fadeUp.initial}
        animate={fadeUp.animate}
        transition={fadeUpTransition(0)}
      >
        What will your swarm build?
      </motion.h1>
      <motion.p
        className="mt-5 text-[16px] text-[#6B6661]"
        initial={fadeUp.initial}
        animate={fadeUp.animate}
        transition={fadeUpTransition(0.12)}
      >
        Describe your idea — 9 AI agents design, code, and ship it in minutes. No coordination needed.
      </motion.p>

      <motion.div
        className="relative max-w-[640px] mx-auto mt-10"
        initial={fadeUp.initial}
        animate={fadeUp.animate}
        transition={fadeUpTransition(0.24)}
      >
        <div className="absolute -inset-6 rounded-[40px] bg-[radial-gradient(ellipse_at_center,rgba(245,80,11,0.18),rgba(255,161,128,0.10)_55%,transparent_75%)] blur-md" />
        <div className="relative bg-white rounded-2xl border border-[#F5500B]/40 shadow-[0_8px_40px_-12px_rgba(245,80,11,0.25)] px-5 pt-5 pb-4 text-left">
          <div className="text-[15px] text-[#9B948D]">
            Describe your app, the swarm brings it to life…
            <span className="inline-block w-px h-4 bg-[#1A1817] align-middle ml-0.5 animate-blink" />
          </div>
          <div className="mt-7 flex items-center justify-between">
            <button
              className="w-8 h-8 rounded-full grid place-items-center text-[#6B6661] hover:bg-black/5 cursor-pointer"
              aria-label="Attach"
              onClick={() => fileRef.current?.click()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  console.log('Attached file:', e.target.files[0].name);
                }
              }}
            />
            <Link href="/dashboard">
              <button
                className="w-9 h-9 rounded-full bg-[#F5500B] grid place-items-center text-white shadow-[0_2px_10px_rgba(245,80,11,0.4)] hover:bg-[#d94609] cursor-pointer"
                aria-label="Submit"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </Link>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="mt-9 flex items-center justify-center gap-4"
        initial={fadeUp.initial}
        animate={fadeUp.animate}
        transition={fadeUpTransition(0.36)}
      >
        <button
          className="w-9 h-9 rounded-full grid place-items-center text-[#6B6661] hover:bg-black/5 cursor-pointer"
          aria-label="Previous"
          onClick={prevCat}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex items-start gap-5">
          {CATEGORIES.map((cat, i) => (
            <Link href="/dashboard" key={cat.label}>
              <div className="flex flex-col items-center gap-2">
                <span
                  className={`w-14 h-14 rounded-xl bg-white border grid place-items-center cursor-pointer transition-colors ${
                    i === selectedCat ? 'border-[#F5500B]' : 'border-black/10 hover:border-[#F5500B]/50'
                  }`}
                >
                  {cat.icon}
                </span>
                <span className={`text-[12px] font-medium transition-colors ${i === selectedCat ? 'text-[#F5500B]' : ''}`}>{cat.label}</span>
              </div>
            </Link>
          ))}
        </div>
        <button
          className="w-9 h-9 rounded-full grid place-items-center text-[#6B6661] hover:bg-black/5 cursor-pointer"
          aria-label="Next"
          onClick={nextCat}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </motion.div>

      <motion.div initial={fadeUp.initial} animate={fadeUp.animate} transition={fadeUpTransition(0.48)}>
        <div className="mt-10 text-[13px] text-[#6B6661] flex items-center justify-center gap-1.5">
          Try an example prompt
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" />
          </svg>
        </div>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link href="/dashboard">
            <button className="bg-white border border-black/10 px-4 py-2 rounded-full text-[13px] font-medium hover:border-[#F5500B]/50 transition-colors cursor-pointer">SaaS KPI dashboard</button>
          </Link>
          <Link href="/dashboard">
            <button className="bg-white border border-black/10 px-4 py-2 rounded-full text-[13px] font-medium hover:border-[#F5500B]/50 transition-colors cursor-pointer">AI support chatbot</button>
          </Link>
          <Link href="/dashboard">
            <button className="bg-white border border-black/10 px-4 py-2 rounded-full text-[13px] font-medium hover:border-[#F5500B]/50 transition-colors cursor-pointer">Marketplace MVP</button>
          </Link>
        </div>

        <div className="mt-14 flex items-center justify-center gap-3 text-[#6B6661]">
          <svg width="26" height="34" viewBox="0 0 26 34" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M22 3C14 8 10 16 11 31" />
            <path d="M20 8c-3 .5-6-1-7-4 3-1 6 .5 7 4ZM16.5 14c-3 0-5.5-2-6-5 3-.5 5.8 1.5 6 5ZM14 20.5c-2.8-.6-4.8-3-4.7-6 3 .1 5.2 2.7 4.7 6ZM12.7 27c-2.6-1.2-4-3.8-3.4-6.8 2.9.8 4.4 3.7 3.4 6.8Z" />
          </svg>
          <div className="text-center">
            <div className="text-[17px] font-bold text-[#1A1817] tracking-tight">120k+ apps shipped</div>
            <div className="text-[12px]">by swarms worldwide</div>
          </div>
          <svg width="26" height="34" viewBox="0 0 26 34" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ transform: 'scaleX(-1)' }}>
            <path d="M22 3C14 8 10 16 11 31" />
            <path d="M20 8c-3 .5-6-1-7-4 3-1 6 .5 7 4ZM16.5 14c-3 0-5.5-2-6-5 3-.5 5.8 1.5 6 5ZM14 20.5c-2.8-.6-4.8-3-4.7-6 3 .1 5.2 2.7 4.7 6ZM12.7 27c-2.6-1.2-4-3.8-3.4-6.8 2.9.8 4.4 3.7 3.4 6.8Z" />
          </svg>
        </div>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Logo Marquee                                                       */
/* ------------------------------------------------------------------ */
function LogoMarquee() {
  const logos = [
    '▲ Vercel', 'stripe', 'Notion', 'Linear', '⚡ supabase', 'DATADOG', 'Figma', 'slack',
  ];
  return (
    <section className="py-16 overflow-hidden relative">
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#FAF6F0] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#FAF6F0] to-transparent z-10 pointer-events-none" />
      <div className="animate-marquee flex items-center whitespace-nowrap text-[#1A1817]/35 select-none">
        {[...logos, ...logos].map((logo, i) => (
          <span key={i} className="text-[24px] font-extrabold tracking-tight px-10">{logo}</span>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Meet the Swarm                                                     */
/* ------------------------------------------------------------------ */
function MeetTheSwarm() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-[1200px] mx-auto px-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <h2 className="text-center text-[52px] font-semibold tracking-[-0.03em]">
            Meet the <span className="text-[#F5500B]">Swarm</span>
          </h2>
          <p className="text-center text-[18px] text-[#6B6661] mt-2">Nine agents. One conversation.</p>
        </motion.div>

        <div className="mt-14 grid grid-cols-12 gap-5">
          <motion.div
            className="col-span-7 bg-[#FFA180] rounded-[160px] px-16 py-16 min-h-[380px] flex flex-col justify-center relative overflow-hidden"
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            <div
              className="absolute inset-y-10 right-10 w-[44%] opacity-50"
              style={{
                backgroundImage: 'radial-gradient(rgba(245,80,11,0.45) 1.2px, transparent 1.2px)',
                backgroundSize: '14px 14px',
              }}
            />
            <div className="relative">
              <div className="font-mono text-[12px] text-[#1A1817]/70 mb-3">Supervisor Agent</div>
              <h3 className="text-[44px] leading-[1.05] font-semibold tracking-[-0.02em]">Orchestrate<br />Freely</h3>
              <p className="mt-5 text-[15px] leading-relaxed text-[#1A1817]/75 max-w-[330px]">
                One brief becomes a coordinated plan. The Supervisor decomposes, assigns, and sequences work across the swarm.
              </p>
            </div>
          </motion.div>

          <motion.div
            className="col-span-5 bg-[#D8D0CA] rounded-3xl px-12 py-14 flex flex-col justify-end"
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
          >
            <div className="font-mono text-[12px] text-[#1A1817]/70 mb-3">Parallel Agents</div>
            <h3 className="text-[40px] font-semibold tracking-[-0.02em]">Move faster</h3>
            <p className="mt-4 text-[15px] leading-relaxed text-[#1A1817]/75">
              Backend, frontend, database and infra are built simultaneously — progress streams live to your editor.
            </p>
          </motion.div>

          <motion.div
            className="col-span-5 bg-[#211F1E] rounded-3xl px-10 py-10 text-white"
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
          >
            <div className="flex gap-3 mb-10">
              <div className="w-[64px] h-[110px] border border-white/60 rounded-xl relative shrink-0">
                <span className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-1 rounded-full bg-white/60" />
              </div>
              <div className="w-[130px] h-[110px] border border-white/60 rounded-lg grid place-items-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.3">
                  <rect x="2" y="3" width="20" height="13" rx="1.5" /><path d="M8 21h8M12 16v5" />
                </svg>
              </div>
              <div className="flex-1 h-[110px] border border-white/60 rounded-lg relative overflow-hidden">
                <div className="border-b border-white/60 h-7 flex items-center gap-1.5 px-3">
                  <span className="w-1.5 h-1.5 rounded-full border border-white/70" />
                  <span className="w-1.5 h-1.5 rounded-full border border-white/70" />
                  <span className="w-1.5 h-1.5 rounded-full border border-white/70" />
                </div>
                <div className="grid place-items-center h-[80px]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.3">
                    <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="font-mono text-[12px] text-white/60 mb-3">Full-Stack Output</div>
            <h3 className="text-[40px] font-semibold tracking-[-0.02em]">Ship Anything</h3>
            <p className="mt-4 text-[15px] leading-relaxed text-white/65">
              Next.js frontends, Express APIs, Prisma schemas, Docker &amp; Terraform — one project, production-ready.
            </p>
          </motion.div>

          <motion.div
            className="col-span-7 bg-[#F5500B] rounded-[160px] px-16 py-16 min-h-[380px] flex flex-col justify-center text-white"
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
          >
            <div className="font-mono text-[12px] text-white/75 mb-3">Built for Teams</div>
            <h3 className="text-[44px] leading-[1.05] font-semibold tracking-[-0.02em]">Build together</h3>
            <p className="mt-5 text-[15px] leading-relaxed text-white/80 max-w-[350px]">
              Submit requests in any order. The swarm sequences them intelligently while your team stays focused on the product.
            </p>
          </motion.div>
        </div>

        <motion.div
          className="mt-12 flex items-center justify-center gap-8"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <Link
            href="/dashboard"
            className="border border-[#F5500B] text-[#F5500B] px-6 py-3 rounded-full text-[14px] font-semibold flex items-center gap-2 hover:bg-[#F5500B] hover:text-white transition-colors"
          >
            Deep dive into the Swarm
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <a href="#features" className="text-[14px] font-medium underline underline-offset-4 decoration-[#1A1817]/40 hover:decoration-[#1A1817]">
            Read the documentation
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Platform Cards                                                     */
/* ------------------------------------------------------------------ */
function PlatformCards() {
  return (
    <section className="py-24">
      <div className="max-w-[1200px] mx-auto px-8">
        <motion.h2
          className="text-center text-[44px] font-semibold tracking-[-0.03em]"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          Powered by the SwarmDev platform
        </motion.h2>
        <div className="mt-14 grid grid-cols-4 gap-5 items-stretch">
          <PlatformCard
            label="Agent Chat"
            title={<>Describe It.<br />Ship It.</>}
            visual={
              <div className="relative h-[230px] my-6">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 230" fill="none">
                  <circle cx="120" cy="118" r="82" stroke="#F5500B" strokeWidth="1" strokeDasharray="3 5" opacity="0.7" />
                  <path d="M196 100 l6 8 -10 1z" fill="#F5500B" opacity="0.7" />
                </svg>
                <div className="absolute top-3 left-3 bg-white border border-[#1A1817]/70 rounded-lg px-3 py-2 text-[10.5px]">
                  Make my idea real <span className="inline-block w-px h-2.5 bg-[#1A1817] align-middle" />
                </div>
                <div className="absolute top-[44%] right-0 bg-[#F5500B] text-white rounded-lg px-3 py-2 text-[10.5px] font-medium flex items-center gap-1.5 shadow-sm">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                  </svg>
                  Publish
                </div>
                <div className="absolute bottom-4 left-4 bg-white border border-[#1A1817]/70 rounded-lg px-3 py-2 text-[10.5px] flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" /><path d="M5 21c1-4 4-6 7-6s6 2 7 6" />
                  </svg>
                  Agent
                </div>
              </div>
            }
            description="Describe and publish your project. The swarm writes production-ready code, evolves it, and stays out of your way."
          />

          <PlatformCard
            bg="bg-[#D8D0CA]"
            label="Full Stack Infrastructure"
            title={<>Build &amp; Scale Your Apps Easily.</>}
            visual={
              <div className="my-6 h-[230px] grid place-items-center">
                <div className="border-[1.5px] border-[#F5500B] rounded-2xl p-4 flex flex-col gap-3.5 w-[162px]">
                  {['Authentication', 'Database', 'Hosting', 'Monitoring'].map((t) => (
                    <div key={t} className="border border-[#1A1817]/70 rounded-full px-3 py-1.5 text-center text-[10.5px] bg-[#D8D0CA]">{t}</div>
                  ))}
                </div>
              </div>
            }
            description="Built-in services with zero setup — auth, database, hosting and monitoring, secure and scalable from day one."
          />

          <PlatformCard
            bg="bg-[#FFA180]"
            label="Integrations"
            title={<>Connect To AI &amp; Services.</>}
            visual={
              <div className="relative my-6 h-[230px]">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 230" fill="none" stroke="#1A1817" strokeWidth="1" strokeDasharray="3 4" opacity="0.6">
                  <path d="M66 74 C 90 78, 92 100, 102 106" />
                  <path d="M174 62 C 152 66, 150 92, 140 100" />
                  <path d="M172 164 C 152 160, 150 140, 140 132" />
                </svg>
                <div className="absolute top-[52px] left-7 w-10 h-10 bg-white rounded-xl grid place-items-center text-[15px] font-bold shadow-sm">S</div>
                <div className="absolute top-10 right-9 w-10 h-10 bg-white rounded-xl grid place-items-center shadow-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1817" strokeWidth="2">
                    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
                  </svg>
                </div>
                <div className="absolute bottom-10 right-8 w-10 h-10 bg-white rounded-xl grid place-items-center text-[15px] font-bold shadow-sm">N</div>
                <div className="absolute top-[96px] left-[100px] w-12 h-12 bg-[#F5500B] rounded-xl grid place-items-center shadow-md">
                  <span className="relative w-5 h-5 inline-block">
                    <span className="absolute left-0 top-0 w-2 h-2 rounded-[2.5px] bg-white" />
                    <span className="absolute right-0 top-1 w-1.5 h-1.5 rounded-[2px] bg-white" />
                    <span className="absolute left-1 bottom-0 w-2.5 h-2.5 rounded-[3px] bg-white" />
                  </span>
                </div>
              </div>
            }
            description="Enhance your apps with AI and 100+ integrations — OpenAI, Stripe, Notion, Slack and more in minutes."
          />

          <PlatformCard
            bg="bg-[#F5500B] text-white"
            labelClass="text-white/70"
            descClass="text-white/80"
            label="Enterprise Control"
            title={<>Secure Your Apps As They Scale.</>}
            visual={
              <div className="my-6 h-[230px] grid place-items-center">
                <svg width="130" height="150" viewBox="0 0 130 150" fill="none" stroke="white" strokeWidth="1.2">
                  <path d="M65 8 117 26v40c0 36-22 60-52 72C35 126 13 102 13 66V26L65 8Z" opacity="0.9" />
                  <path d="M65 22 105 36v30c0 28-17 47-40 57-23-10-40-29-40-57V36L65 22Z" opacity="0.6" />
                  <path d="M65 36 93 46v21c0 20-12 33-28 41-16-8-28-21-28-41V46L65 36Z" opacity="0.35" />
                  <path d="M50 74l11 11 20-22" strokeWidth="1.8" />
                </svg>
              </div>
            }
            description="Security controls: SSO/SAML, SOC 2, isolated sandboxes and admin policies keep every build safe."
          />
        </div>
      </div>
    </section>
  );
}

function PlatformCard({
  bg = 'bg-white',
  labelClass = 'text-[#6B6661]',
  descClass = 'text-[#6B6661]',
  label,
  title,
  visual,
  description,
}: {
  bg?: string;
  labelClass?: string;
  descClass?: string;
  label: string;
  title: React.ReactNode;
  visual: React.ReactNode;
  description: string;
}) {
  return (
    <motion.div
      className={`${bg} rounded-3xl p-7 flex flex-col border border-black/5`}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
    >
      <div className={`font-mono text-[11px] ${labelClass}`}>{label}</div>
      <h3 className="mt-2 text-[25px] leading-[1.15] font-semibold tracking-[-0.01em]">{title}</h3>
      {visual}
      <p className={`mt-auto text-[12.5px] leading-relaxed ${descClass}`}>{description}</p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Testimonials                                                       */
/* ------------------------------------------------------------------ */
const TESTIMONIALS = [
  {
    quote: 'SwarmDev compressed our two-week MVP cycle into an afternoon. The agents coordinate better than most teams I have managed.',
    name: 'Maya Chen',
    title: 'CTO',
    company: 'Northwind Labs',
  },
  {
    quote: 'Nine agents, zero standups, one shipped product. I describe the idea and the swarm builds it while I sleep.',
    name: 'Diego Ferraro',
    title: 'Founder',
    company: 'Streamline AI',
  },
  {
    quote: 'We went from zero to production in two hours. The infrastructure it generated was cleaner than what our senior engineers wrote.',
    name: 'Sarah Kim',
    title: 'VP Engineering',
    company: 'Atlas Data',
  },
];

function Testimonials() {
  const [current, setCurrent] = useState(0);
  const t = TESTIMONIALS[current];
  const peekNext = TESTIMONIALS[(current + 1) % TESTIMONIALS.length];

  const next = () => setCurrent((i) => (i + 1) % TESTIMONIALS.length);
  const prev = () => setCurrent((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);

  return (
    <section className="py-24">
      <div className="max-w-[1400px] mx-auto px-8">
        <motion.div
          className="flex gap-6 items-stretch"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <div className="w-[210px] shrink-0 border border-black/10 rounded-3xl p-6 self-start">
            <div className="text-[24px] font-semibold leading-tight tracking-[-0.01em]">Trusted by builders</div>
            <div className="mt-2 text-[12.5px] text-[#6B6661]">Endorsed by shippers</div>
          </div>

          <div className="flex-1 bg-white rounded-3xl p-10 flex flex-col min-h-[420px]">
            <div className="text-[48px] leading-none text-[#FFA180] font-bold">“</div>
            <p className="mt-4 text-[26px] leading-[1.35] font-medium tracking-[-0.01em] max-w-[560px]">
              {t.quote}
            </p>
            <div className="mt-auto pt-10">
              <div className="text-[16px] font-semibold">{t.name}</div>
              <div className="text-[13px] text-[#6B6661]">{t.title}</div>
              <div className="text-[13px] text-[#6B6661]">{t.company}</div>
            </div>
          </div>

          <div className="w-[300px] shrink-0 relative self-center h-[380px]">
            <button
              onClick={next}
              className="absolute top-0 left-[90px] w-[210px] h-[190px] bg-[#FFA180] rounded-[44px] rounded-bl-none flex items-center justify-between px-7 text-left hover:bg-[#ff8d63] transition-colors cursor-pointer"
            >
              <span className="text-[14px] font-medium leading-snug">Next<br />Testimonial</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5500B" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
            <button
              onClick={prev}
              className="absolute bottom-0 left-0 w-[210px] h-[190px] bg-[#FFC9B5] rounded-[44px] rounded-tr-none flex items-center justify-between px-7 text-left hover:bg-[#ffb89d] transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5500B" strokeWidth="2">
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
              <span className="text-[14px] font-medium leading-snug text-right">Previous<br />Testimonial</span>
            </button>
          </div>

          <div className="w-[200px] shrink-0 bg-white rounded-l-3xl p-8 -mr-16 min-h-[420px] flex flex-col">
            <div className="text-[48px] leading-none text-[#FFA180] font-bold">“</div>
            <p className="mt-4 text-[22px] leading-[1.35] font-medium">{peekNext.quote.slice(0, 50)}…</p>
            <div className="mt-auto pt-10">
              <div className="text-[16px] font-semibold">{peekNext.name}</div>
              <div className="text-[13px] text-[#6B6661]">{peekNext.title}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */
function Pricing() {
  const [period, setPeriod] = useState('monthly');
  return (
    <section id="pricing" className="py-12">
      <div className="max-w-[1200px] mx-auto px-8">
        <motion.div
          className="bg-white rounded-[2rem] p-10 lg:p-12"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div>
              <h2 className="text-[40px] font-semibold tracking-[-0.02em]">Start Small. Scale Fast.</h2>
              <p className="text-[13px] text-[#6B6661] mt-1">Designed for every stage</p>
            </div>
            <div className="flex items-center bg-[#FAF6F0] border border-black/10 rounded-full p-1 text-[13px] font-medium">
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-4 py-1.5 rounded-full transition-colors ${period === 'monthly' ? 'bg-white shadow-sm' : 'text-[#6B6661]'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPeriod('yearly')}
                className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-colors ${period === 'yearly' ? 'bg-white shadow-sm' : 'text-[#6B6661]'}`}
              >
                Yearly
                <span className="flex items-center gap-1 text-[#F5500B]">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#F5500B">
                    <path d="M12 2 2 12l10 10 10-10L12 2Z" />
                  </svg>
                  Save $24
                </span>
              </button>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-4">
            <PricingTier
              name="Free"
              price="$0"
              sub="Try the swarm"
              features={['3 builds per month', 'Core agents (3 of 9)', 'Public projects', 'Community support']}
              cta="Start free"
              variant="outline"
              period={period}
            />
            <PricingTier
              name="Pro"
              price="$20"
              per="/mo"
              sub="For serious builders"
              popular
              features={['Unlimited builds', 'All 9 agents', 'Priority queue', 'Private projects', 'Custom domains']}
              cta="Go Pro"
              variant="primary"
              period={period}
            />
            <PricingTier
              name="Team"
              price="$40"
              per="/user/mo"
              sub="Ship as a squad"
              features={['Everything in Pro', 'Shared workspaces', 'Role-based access', 'Usage analytics']}
              cta="Start a team"
              variant="outline"
              period={period}
            />
            <PricingTier
              name="Enterprise"
              price="Custom"
              sub="Swarms at scale"
              borderLeft
              features={['SSO / SAML', 'SOC 2 Type II', 'Dedicated VPC', 'Audit logs']}
              cta="Contact sales"
              variant="outline"
              period={period}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PricingTier({
  name,
  price,
  per,
  sub,
  features,
  cta,
  variant,
  popular,
  borderLeft,
  period,
}: {
  name: string;
  price: string;
  per?: string;
  sub: string;
  features: string[];
  cta: string;
  variant: 'primary' | 'outline';
  popular?: boolean;
  borderLeft?: boolean;
  period?: string;
}) {
  const isYearly = period === 'yearly';
  const displayPrice =
    price === '$0' || price === 'Custom'
      ? price
      : isYearly
        ? price.replace('$', '$') // Keep same dollar sign, just show note below
        : price;
  return (
    <div className={`pr-7 flex flex-col ${borderLeft ? 'pl-7 border-l border-black/10' : ''}`}>
      <div className="flex items-center gap-2">
        <div className="text-[15px] font-semibold">{name}</div>
        {popular && (
          <span className="bg-[#F5500B] text-white text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full">Popular</span>
        )}
      </div>
      <div className="mt-3 flex items-end gap-1">
        <span className="text-[40px] font-semibold tracking-tight leading-none">{displayPrice}</span>
        {per && <span className="text-[12.5px] text-[#6B6661] mb-1">{isYearly ? '/mo (billed yearly)' : per}</span>}
      </div>
      <div className="text-[12.5px] text-[#6B6661] mt-1">{sub}</div>
      <ul className="mt-6 space-y-3 text-[13px] text-[#1A1817]/85">
        {features.map((f) => (
          <li key={f} className="flex gap-2.5">
            <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5500B" strokeWidth="2.4">
              <path d="M4 12.5 9.5 18 20 6.5" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-8">
        <Link
          href="/dashboard"
          className={`block w-full rounded-full py-2.5 text-[13.5px] font-semibold text-center transition-colors ${
            variant === 'primary'
              ? 'bg-[#F5500B] text-white hover:bg-[#d94609]'
              : 'border border-[#1A1817]/25 hover:border-[#1A1817]'
          }`}
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA                                                                */
/* ------------------------------------------------------------------ */
function CTA() {
  return (
    <section className="py-32 text-center">
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        <h2 className="text-[44px] font-semibold tracking-[-0.02em]">What are you waiting for?</h2>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center mt-9 h-[56px] px-12 bg-[#F5500B] text-white text-[16px] font-semibold rounded-full hover:bg-[#d94609] transition-colors"
        >
          Get started free
        </Link>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="border-t border-black/10">
      <div className="max-w-[1200px] mx-auto px-8 py-16 grid grid-cols-12 gap-10">
        <div className="col-span-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative w-7 h-7 inline-block">
              <span className="absolute left-0 top-0 w-3 h-3 rounded-[4px] bg-[#F5500B]" />
              <span className="absolute right-0 top-1.5 w-2.5 h-2.5 rounded-[3.5px] bg-[#F5500B]" />
              <span className="absolute left-1.5 bottom-0 w-3.5 h-3.5 rounded-[5px] bg-[#F5500B]" />
            </span>
            <span className="text-[22px] font-bold tracking-tight">SwarmDev</span>
          </Link>
          <div className="mt-10 flex items-center gap-4">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#6B6661" strokeWidth="0.9">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18M5 7h14M5 17h14" />
            </svg>
            <div className="border border-black/15 rounded-xl px-3 py-2 text-center">
              <div className="font-mono text-[9px] text-[#6B6661]">UTC</div>
              <div className="text-[12px] font-semibold">05:23</div>
              <div className="font-mono text-[9px] text-[#6B6661]">73°F</div>
            </div>
            <div className="text-[13px] text-[#6B6661] border-y border-black/10 py-2">Made for builders everywhere.</div>
          </div>
          <div className="mt-6 text-[12.5px] text-[#6B6661]">All rights reserved. © 2026 SwarmDev, Inc.</div>
        </div>

        <div className="col-span-7 grid grid-cols-4 gap-6 text-[13.5px]">
          <FooterColumn
            title="HANDY LINKS"
            links={[
              { label: 'Swarm 101', href: '/dashboard' },
              { label: 'How-to guides', href: '/dashboard' },
              { label: 'Import from GitHub', href: '/dashboard' },
              { label: 'Help', href: '/dashboard' },
              { label: 'Status', href: '/dashboard' },
            ]}
          />
          <FooterColumn
            title="COMPANY"
            links={[
              { label: 'About', href: '/dashboard' },
              { label: 'Brand', href: '/dashboard' },
              { label: 'Careers', href: '/dashboard' },
              { label: 'Partnerships', href: '/dashboard' },
              { label: 'Startups', href: '/dashboard' },
            ]}
          />
          <FooterColumn
            title="LEGAL"
            links={[
              { label: 'Terms', href: '/dashboard' },
              { label: 'Privacy', href: '/dashboard' },
              { label: 'DPA', href: '/dashboard' },
              { label: 'Subprocessors', href: '/dashboard' },
            ]}
          />
          <FooterColumn
            title="CONNECT"
            links={[
              { label: 'X / Twitter', href: 'https://twitter.com' },
              { label: 'GitHub', href: 'https://github.com' },
              { label: 'Discord', href: 'https://discord.com' },
              { label: 'LinkedIn', href: 'https://linkedin.com' },
            ]}
          />
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="font-mono text-[10.5px] text-[#6B6661] tracking-wider mb-4">{title}</div>
      <ul className="space-y-2.5 text-[#3F3B37]">
        {links.map(({ label, href }) => (
          <li key={label}>
            {href.startsWith('http') ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-[#F5500B] transition-colors">
                {label}
              </a>
            ) : (
              <Link href={href} className="hover:text-[#F5500B] transition-colors">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
