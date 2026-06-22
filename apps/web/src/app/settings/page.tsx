'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type NavItem = { label: string; href: string; active: boolean; icon: React.FC<{ active?: boolean; className?: string }> };

/* ------------------------------------------------------------------ */
/*  Sidebar (matches dashboard exactly)                                */
/* ------------------------------------------------------------------ */
function Sidebar({ firstName }: { firstName: string }) {
  const navItems: NavItem[] = [
    { label: 'Home', href: '/dashboard', active: false, icon: HomeIcon },
    { label: 'Projects', href: '/dashboard', active: false, icon: ProjectsIcon },
    { label: 'Agents', href: '/agents', active: false, icon: AgentsIcon },
    { label: 'Deployments', href: '/dashboard', active: false, icon: DeployIcon },
    { label: 'Usage', href: '/dashboard', active: false, icon: UsageIcon },
    { label: 'Settings', href: '/settings', active: true, icon: SettingsIcon },
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
    <svg className={`${className} ${active ? 'text-[#F5500B]' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings Page                                                      */
/* ------------------------------------------------------------------ */
export default function SettingsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [billingEmail, setBillingEmail] = useState('');

  useEffect(() => {
    if (user) {
      const n = user.fullName || user.firstName || '';
      const e = user.primaryEmailAddress?.emailAddress || '';
      setName(n);
      setEmail(e);
      setBillingEmail(e);
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save profile');
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const firstName = user?.firstName || 'Abiram';

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
              <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Settings</h1>
              <p className="text-[12px] font-mono text-[#9A938C] mt-0.5">Manage your account and preferences</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#6B6661] bg-white border border-[#EAE2DA] rounded-full px-4 py-2 hover:text-[#1A1817] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back to dashboard
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Profile Card */}
            <div className="md:col-span-2 bg-white border border-[#EAE2DA] rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-[#F5500B]/10 grid place-items-center">
                  <svg className="w-4 h-4 text-[#F5500B]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h2 className="text-[17px] font-semibold tracking-tight">Profile</h2>
              </div>

              {saveError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#FFF0ED] border border-[#F8C9AE] px-4 py-3 text-[13px] text-[#C2410C]">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#F2F9F3] border border-[#A7D5B5] px-4 py-3 text-[13px] text-[#1F6A3C]">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Profile saved successfully.
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#1A1817] mb-1.5">Full Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-[#FAF6F0] border border-[#EAE2DA] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#F5500B]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#1A1817] mb-1.5">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="your@email.com"
                    className="w-full bg-[#FAF6F0] border border-[#EAE2DA] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#F5500B]/50 transition-colors"
                  />
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 bg-[#F5500B] text-white text-[13.5px] font-semibold rounded-full pl-4 pr-5 py-2.5 hover:bg-[#DD4607] transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                    {isSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>

            {/* Plan Card */}
            <div className="bg-[#211F1E] text-white rounded-3xl p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-white/10 grid place-items-center">
                  <svg className="w-4 h-4 text-[#FFA180]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <h2 className="text-[17px] font-semibold tracking-tight">Plan</h2>
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F5500B] px-3 py-1 text-[12.5px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  Pro plan
                </div>
                <ul className="mt-5 space-y-3 text-[13px] text-white/80">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#1F9D55] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Unlimited builds
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#1F9D55] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    9-agent swarm
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#1F9D55] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Real-time IDE
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#1F9D55] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Deploy to staging
                  </li>
                </ul>
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-5 w-full text-center text-[12.5px] font-semibold bg-white/10 hover:bg-white/15 transition-colors rounded-full py-2.5"
              >
                Manage billing
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className="mt-5 bg-white border border-[#EAE2DA] rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full bg-[#F5500B]/10 grid place-items-center">
                <svg className="w-4 h-4 text-[#F5500B]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                </svg>
              </div>
              <h2 className="text-[17px] font-semibold tracking-tight">Preferences</h2>
            </div>

            <div className="space-y-4 max-w-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold">Email Notifications</p>
                  <p className="text-[12.5px] text-[#9A938C] mt-0.5">Receive updates about your projects and swarm activity</p>
                </div>
                <button
                  onClick={() => setEmailNotifs((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailNotifs ? 'bg-[#F5500B]' : 'bg-[#D8D0CA]'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailNotifs ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="h-px bg-[#F1EAE2]" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold">Dark Mode</p>
                  <p className="text-[12.5px] text-[#9A938C] mt-0.5">Toggle dark theme across the workspace</p>
                </div>
                <button
                  onClick={() => setDarkMode((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? 'bg-[#F5500B]' : 'bg-[#D8D0CA]'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Billing */}
          <div className="mt-5 bg-white border border-[#EAE2DA] rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full bg-[#F5500B]/10 grid place-items-center">
                <svg className="w-4 h-4 text-[#F5500B]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
                </svg>
              </div>
              <h2 className="text-[17px] font-semibold tracking-tight">Billing</h2>
            </div>
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-[12.5px] font-semibold text-[#1A1817] mb-1.5">Billing email</label>
                <input
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  type="email"
                  placeholder="billing@company.com"
                  className="w-full bg-[#FAF6F0] border border-[#EAE2DA] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#F5500B]/50 transition-colors"
                />
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-[#FAF6F0] border border-[#EAE2DA] px-4 py-3">
                <div className="w-8 h-5 rounded bg-[#6B6661]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold">•••• 4242</p>
                  <p className="text-[11px] text-[#9A938C]">Expires 12/26</p>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F2F9F3] text-[#1F6A3C]">Default</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
