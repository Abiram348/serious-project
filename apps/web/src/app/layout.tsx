import './globals.css';
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ClerkProvider } from '@clerk/nextjs';
import { AppHeader } from '@/components/AppHeader';

export const metadata: Metadata = {
  title: 'SwarmDev — Multi-Agent Cloud Development',
  description:
    'Describe your idea and watch a team of AI agents build it. Frontend, backend, database, tests, security — all in parallel, all in the cloud.',
  openGraph: {
    title: 'SwarmDev — Multi-Agent Cloud Development',
    description: 'AI agents collaborate like a real dev team to build your application.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/auth/login"
      signUpUrl="/auth/signup"
      clerkJSUrl="https://glowing-fly-11.clerk.accounts.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
    >
      <html
        lang="en"
        className={`${GeistSans.variable} ${GeistMono.variable} dark`}
      >
        <body className="min-h-screen bg-background font-sans text-foreground antialiased">
          <AppHeader />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
