'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { Sparkles } from 'lucide-react';

export function AppHeader() {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  if (isLanding) return null;

  return (
    <>
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Swarm<span className="text-primary">Dev</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>
      {/* spacer so content doesn't hide behind the fixed header */}
      <div className="pt-14" />
    </>
  );
}
