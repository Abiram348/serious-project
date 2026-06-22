'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';

interface PreviewStatus {
  status: 'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR';
  previewUrl: string | null;
  sandboxId: string | null;
  message?: string;
}

interface PreviewFrameProps {
  projectId: string;
}

export function PreviewFrame({ projectId }: PreviewFrameProps) {
  const [status, setStatus] = useState<PreviewStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiClient.get<PreviewStatus>(`/api/projects/${projectId}/preview`);
      setStatus(data);
      if (data.status !== 'ERROR') {
        setError(null);
      }
    } catch (e: any) {
      console.error('Failed to fetch preview status:', e);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStatus();
    // Poll every 5 seconds while starting or running
    const interval = setInterval(() => {
      setStatus((prev) => {
        if (prev?.status === 'STARTING' || prev?.status === 'RUNNING') {
          fetchStatus();
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleStart = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<PreviewStatus>(`/api/projects/${projectId}/preview/start`, {});
      setStatus(data);
    } catch (e: any) {
      setError(e.message || 'Failed to start preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.post<PreviewStatus>(`/api/projects/${projectId}/preview/stop`, {});
      setStatus(data);
    } catch (e: any) {
      setError(e.message || 'Failed to stop preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchStatus();
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Preview</CardTitle>
            {status && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  status.status === 'RUNNING'
                    ? 'bg-green-100 text-green-700'
                    : status.status === 'STARTING'
                      ? 'bg-yellow-100 text-yellow-700'
                      : status.status === 'ERROR'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                }`}
              >
                {status.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {status?.status === 'RUNNING' && (
              <Button type="button" size="sm" variant="outline" onClick={handleStop} disabled={isLoading}>
                Stop
              </Button>
            )}
            {status?.status === 'RUNNING' && (
              <Button type="button" size="sm" variant="outline" onClick={handleRefresh}>
                🔄
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="w-full h-full border rounded-md bg-white overflow-hidden">
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
              <div className="text-muted-foreground text-sm">
                {status?.status === 'STARTING' ? 'Starting preview sandbox...' : 'Loading...'}
              </div>
            </div>
          ) : error ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6">
              <div className="text-red-600 font-medium">Preview Error</div>
              <div className="text-muted-foreground text-sm text-center">{error}</div>
              <Button size="sm" onClick={handleStart}>
                Retry
              </Button>
            </div>
          ) : status?.status === 'RUNNING' && status.previewUrl ? (
            <iframe
              src={status.previewUrl}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="text-muted-foreground text-sm text-center max-w-xs">
                {status?.message
                  ? status.message
                  : 'Preview is not running. Start a preview to see your app in action.'}
              </div>
              <Button size="sm" onClick={handleStart} disabled={isLoading}>
                Start Preview
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
