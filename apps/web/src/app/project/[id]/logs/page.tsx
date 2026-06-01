'use client';

import { useState, useEffect } from 'react';
import { Terminal } from '@/components/editor/Terminal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface AgentLog {
  id: string;
  agentType: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  timestamp: string;
}

export default function ProjectLogsPage({ params }: { params: { id: string } }) {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!params.id) return;

    const eventSource = new EventSource(`/api/projects/${params.id}/agents/logs`);

    eventSource.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);
        if (log.type === 'heartbeat') return;
        setLogs((prev) => {
          const exists = prev.some((l) => l.id === log.id);
          if (exists) return prev;
          return [
            ...prev,
            {
              id: log.id,
              agentType: log.agentRun?.agentType || 'UNKNOWN',
              level: log.level || 'INFO',
              message: log.message || '',
              timestamp: log.timestamp,
            },
          ];
        });
      } catch {
        // ignore parse errors on malformed events
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [params.id]);

  const filteredLogs = filter === 'all' ? logs : logs.filter((log) => log.level === filter);

  const levelColors: Record<string, string> = {
    INFO: 'bg-blue-100 text-blue-800',
    WARN: 'bg-yellow-100 text-yellow-800',
    ERROR: 'bg-red-100 text-red-800',
    DEBUG: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Agent Logs</h1>
          <p className="text-sm text-muted-foreground">
            Real-time logs from all agents
          </p>
        </div>
        <div className="flex gap-2">
          {['all', 'INFO', 'WARN', 'ERROR'].map((level) => (
            <Badge
              key={level}
              variant={filter === level ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter(level)}
            >
              {level}
            </Badge>
          ))}
        </div>
      </header>
      <main className="flex-1 min-h-0 p-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-sm">Terminal Output</CardTitle>
          </CardHeader>
          <CardContent className="h-full">
            <div className="h-full overflow-auto font-mono text-sm space-y-1">
              {filteredLogs.length === 0 ? (
                <p className="text-muted-foreground">No logs yet</p>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-muted-foreground">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <Badge className={levelColors[log.level]} variant="secondary">
                      {log.level}
                    </Badge>
                    <span className="text-purple-600 font-medium">[{log.agentType}]</span>
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
