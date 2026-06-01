'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PreviewFrameProps {
  projectId: string;
  initialUrl?: string;
}

export function PreviewFrame({ projectId, initialUrl = '/preview' }: PreviewFrameProps) {
  const [url, setUrl] = useState(initialUrl);
  const [iframeUrl, setIframeUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIframeUrl(url);
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeUrl(url);
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Preview</CardTitle>
          <form onSubmit={handleNavigate} className="flex-1 flex gap-2">
            <Input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL..."
              className="flex-1 text-sm"
            />
            <Button type="submit" size="sm" variant="outline">
              Go
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleRefresh}>
              🔄
            </Button>
          </form>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="w-full h-full border rounded-md bg-white overflow-hidden">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <iframe
              src={iframeUrl}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
