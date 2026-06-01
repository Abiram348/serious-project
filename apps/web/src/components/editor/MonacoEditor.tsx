'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

type MonacoEditorProps = {
  path: string;
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
};

const MonacoEditorInner = dynamic<ComponentProps<typeof import('@monaco-editor/react')['default']>>(
  () => import('@monaco-editor/react'),
  { ssr: false }
);

export function MonacoEditor({ path, value, onChange, language = 'typescript', readOnly = false }: MonacoEditorProps) {
  return (
    <div className="h-full w-full">
      <MonacoEditorInner
        height="100%"
        language={language}
        value={value}
        onChange={(newValue?: string) => onChange(newValue || '')}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 16 },
        }}
        path={path}
      />
    </div>
  );
}
