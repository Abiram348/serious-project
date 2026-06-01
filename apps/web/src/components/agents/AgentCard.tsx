'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AgentCardProps {
  agentType: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  description: string;
  lastActivity?: string;
}

const agentIcons: Record<string, string> = {
  SUPERVISOR: '🎯',
  FRONTEND: '🎨',
  BACKEND: '⚙️',
  DATABASE: '🗄️',
  DEVOPS: '🚀',
  QA: '✅',
  REVIEWER: '🔍',
  SECURITY: '🔒',
  DOCUMENTATION: '📝',
};

const statusColors: Record<string, string> = {
  idle: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800 animate-pulse',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export function AgentCard({ agentType, status, description, lastActivity }: AgentCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{agentIcons[agentType] || '🤖'}</span>
            <CardTitle className="text-lg">{agentType.replace(/_/g, ' ')}</CardTitle>
          </div>
          <Badge className={statusColors[status]}>{status}</Badge>
        </div>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      {lastActivity && (
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Last activity: {new Date(lastActivity).toLocaleTimeString()}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
