'use client';

import { ChatWindow } from '@/components/chat/ChatWindow';

interface ChatPageProps {
  params: { id: string };
}

export default function ProjectChatPage({ params }: ChatPageProps) {
  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4">
        <h1 className="text-xl font-semibold">Project Chat</h1>
        <p className="text-sm text-muted-foreground">
          Collaborate with AI agents on your project
        </p>
      </header>
      <main className="flex-1 min-h-0">
        <ChatWindow projectId={params.id} />
      </main>
    </div>
  );
}
