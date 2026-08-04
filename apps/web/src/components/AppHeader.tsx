'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

export function AppHeader() {
  const pathname = usePathname();

  // Dashboard and project pages have their own headers
  if (pathname === '/' || pathname?.startsWith('/dashboard') || pathname?.startsWith('/project')) {
    return null;
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative inline-block w-6 h-6">
            <span className="absolute left-0 top-0 w-2.5 h-2.5 rounded-[3px] bg-primary" />
            <span className="absolute right-0 top-1 w-2 h-2 rounded-[2.5px] bg-primary" />
            <span className="absolute left-1 bottom-0 w-3 h-3 rounded-[4px] bg-primary" />
          </span>
          <span className="text-[15px] font-bold tracking-tight">SwarmDev</span>
        </Link>
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
