'use client';

import { SignUp } from '@clerk/nextjs';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background bg-grid p-4">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <span className="text-lg font-semibold tracking-tight">
          Swarm<span className="text-primary">Dev</span>
        </span>
      </Link>
      <SignUp
        routing="hash"
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md',
            card: 'bg-card border border-border/50 shadow-xl rounded-xl',
            headerTitle: 'text-foreground',
            headerSubtitle: 'text-muted-foreground',
            socialButtonsBlockButton: 'bg-surface border border-border/50 text-foreground hover:bg-surface-elevated',
            dividerLine: 'bg-border',
            dividerText: 'text-muted-foreground',
            formFieldLabel: 'text-foreground',
            formFieldInput: 'bg-surface border-border text-foreground',
            formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
            footerActionLink: 'text-primary hover:text-primary/80',
          },
        }}
      />
    </div>
  );
}
