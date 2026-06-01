'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NewProjectWizard } from '@/components/project/NewProjectWizard';
import { AlertCircle } from 'lucide-react';

export default function NewProjectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: {
    name: string;
    description: string;
    techStack: Record<string, string>;
  }) => {
    setError(null);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let message = 'Failed to create project';
        try {
          const err = await response.json();
          message = err.error || message;
        } catch {
          const text = await response.text();
          message = text || `Server error (${response.status})`;
        }
        throw new Error(message);
      }

      const project = await response.json();

      try {
        await fetch(`/api/projects/${project.id}/start`, { method: 'POST' });
      } catch {
        // Pipeline start is best-effort
      }

      router.push(`/project/${project.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setError(message);
      throw err;
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 bg-grid">
      {error && (
        <div className="mb-4 flex w-full max-w-2xl items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <NewProjectWizard
        onSubmit={handleSubmit}
        onCancel={() => router.push('/dashboard')}
      />
    </div>
  );
}
