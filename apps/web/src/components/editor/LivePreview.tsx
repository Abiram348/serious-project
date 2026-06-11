'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Square, ExternalLink, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface PreviewStatus {
  status: 'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR';
  previewUrl: string | null;
  sandboxId: string | null;
  message?: string;
}

interface LivePreviewProps {
  projectId: string;
}

export function LivePreview({ projectId }: LivePreviewProps) {
  const [status, setStatus] = useState<PreviewStatus>({
    status: 'STOPPED',
    previewUrl: null,
    sandboxId: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiClient.get<PreviewStatus>(`/api/projects/${projectId}/preview`);
      setStatus(data);
      setError(null);
      return data;
    } catch (e: any) {
      setError(e.message || 'Failed to fetch preview status');
      return null;
    }
  }, [projectId]);

  // Poll status every 3 seconds when starting or running
  useEffect(() => {
    if (status.status === 'STARTING' || status.status === 'RUNNING') {
      pollRef.current = setInterval(fetchStatus, 3000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status.status, fetchStatus]);

  // Initial status fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const startPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<PreviewStatus>(`/api/projects/${projectId}/preview/start`, {});
      setStatus(data);
    } catch (e: any) {
      setError(e.message || 'Failed to start preview');
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const stopPreview = async () => {
    setLoading(true);
    try {
      const data = await apiClient.post<PreviewStatus>(`/api/projects/${projectId}/preview/stop`, {});
      setStatus(data);
    } catch (e: any) {
      setError(e.message || 'Failed to stop preview');
    } finally {
      setLoading(false);
    }
  };

  const openInNewTab = () => {
    if (status.previewUrl) {
      window.open(status.previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const isStopped = status.status === 'STOPPED';
  const isStarting = status.status === 'STARTING';
  const isRunning = status.status === 'RUNNING';
  const isError = status.status === 'ERROR';

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-background">
        {isStopped && (
          <button
            onClick={startPreview}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Start Preview
              </>
            )}
          </button>
        )}

        {(isRunning || isStarting) && (
          <button
            onClick={stopPreview}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Stopping…
              </>
            ) : (
              <>
                <Square className="h-3.5 w-3.5" />
                Stop Preview
              </>
            )}
          </button>
        )}

        {isRunning && status.previewUrl && (
          <>
            <button
              onClick={fetchStatus}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
              title="Refresh status"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={openInNewTab}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in new tab
            </button>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 relative">
        {isStarting && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Starting preview sandbox…</p>
                <p className="text-xs text-muted-foreground">
                  Installing dependencies and starting dev server
                </p>
              </div>
            </div>
          </div>
        )}

        {isRunning && status.previewUrl && (
          <iframe
            src={status.previewUrl}
            className="w-full h-full border-0"
            title="Project Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}

        {isStopped && !loading && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <div className="text-center space-y-3">
              <ExternalLink className="mx-auto h-8 w-8 opacity-40" />
              <div className="space-y-1">
                <p>No preview running</p>
                <p className="text-xs max-w-xs mx-auto">
                  Start a preview to see your generated application live in a cloud sandbox.
                </p>
              </div>
            </div>
          </div>
        )}

        {isError && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <div className="text-center space-y-3">
              <AlertCircle className="mx-auto h-8 w-8 text-destructive opacity-80" />
              <div className="space-y-1">
                <p className="text-destructive font-medium">Preview failed to start</p>
                <p className="text-xs max-w-xs mx-auto">
                  {status.message || 'An error occurred while starting the preview sandbox.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute bottom-4 left-4 right-4 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
