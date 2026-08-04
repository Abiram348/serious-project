'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

type UsageData = {
  projects: { used: number; limit: number | null };
  tokens: { used: number; limit: number | null };
  agents: { used: number; limit: number | null };
};

const DEFAULT_USAGE: UsageData = {
  projects: { used: 0, limit: 3 },
  tokens: { used: 0, limit: 100000 },
  agents: { used: 0, limit: 2 },
};

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageData>(DEFAULT_USAGE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/billing/usage');
        if (res.ok) {
          const data = await res.json();
          setUsage({
            projects: {
              used: data.projects?.used ?? 0,
              limit: data.projects?.limit ?? null,
            },
            tokens: {
              used: data.tokens?.used ?? 0,
              limit: data.tokens?.limit ?? null,
            },
            agents: {
              used: data.agents?.used ?? 0,
              limit: data.agents?.limit ?? null,
            },
          });
        }
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const percentage = (used: number, limit: number | null) => {
    if (limit === null || limit <= 0) return 0;
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  const formatLimit = (limit: number | null) => (limit === null ? '∞' : String(limit));

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Usage</h1>
        <p className="text-muted-foreground">
          {loading ? 'Loading usage data…' : 'Monitor your resource consumption'}
        </p>
      </div>

      <Separator />

      <div className="grid gap-6">
        {/* Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Number of active projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {usage.projects.used} / {formatLimit(usage.projects.limit)}
              </span>
              {usage.projects.limit !== null && (
                <span className="text-sm text-muted-foreground">
                  {percentage(usage.projects.used, usage.projects.limit)}% used
                </span>
              )}
            </div>
            {usage.projects.limit !== null && (
              <Progress value={percentage(usage.projects.used, usage.projects.limit)} />
            )}
            {usage.projects.limit !== null && usage.projects.used >= usage.projects.limit && (
              <p className="text-sm text-amber-600">
                Project limit reached. Upgrade your plan to create more projects.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tokens */}
        <Card>
          <CardHeader>
            <CardTitle>Tokens</CardTitle>
            <CardDescription>LLM token usage this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {(usage.tokens.used / 1000).toFixed(0)}K /{' '}
                {usage.tokens.limit === null ? '∞' : `${(usage.tokens.limit / 1000).toFixed(0)}K`}
              </span>
              {usage.tokens.limit !== null && (
                <span className="text-sm text-muted-foreground">
                  {percentage(usage.tokens.used, usage.tokens.limit)}% used
                </span>
              )}
            </div>
            {usage.tokens.limit !== null && (
              <Progress value={percentage(usage.tokens.used, usage.tokens.limit)} />
            )}
            {usage.tokens.limit !== null && usage.tokens.used >= usage.tokens.limit * 0.9 && (
              <p className="text-sm text-amber-600">
                Approaching token limit. Consider upgrading your plan.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Parallel Agents */}
        <Card>
          <CardHeader>
            <CardTitle>Parallel Agents</CardTitle>
            <CardDescription>Currently running agents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {usage.agents.used} / {formatLimit(usage.agents.limit)}
              </span>
              {usage.agents.limit !== null && (
                <span className="text-sm text-muted-foreground">
                  {percentage(usage.agents.used, usage.agents.limit)}% used
                </span>
              )}
            </div>
            {usage.agents.limit !== null && (
              <Progress value={percentage(usage.agents.used, usage.agents.limit)} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
