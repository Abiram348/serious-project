'use client';

import { PreviewFrame } from '@/components/project/PreviewFrame';

export default function ProjectPreviewPage({ params }: { params: { id: string } }) {
  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4">
        <h1 className="text-xl font-semibold">Preview</h1>
        <p className="text-sm text-muted-foreground">
          View your project in action
        </p>
      </header>
      <main className="flex-1 min-h-0 p-4">
        <PreviewFrame projectId={params.id} />
      </main>
    </div>
  );
}
