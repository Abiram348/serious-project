'use client';

import { Cpu } from 'lucide-react';

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  models?: string[];
  size?: 'sm' | 'md';
}

const DEFAULT_MODELS = [
  'llama4',
  'codellama',
  'kimi',
  'mistral-small',
  'gpt-oss',
];

export function ModelSelector({ value, onChange, models = DEFAULT_MODELS, size = 'md' }: ModelSelectorProps) {
  const sizeClasses = size === 'sm'
    ? 'text-[11px] px-2 py-1'
    : 'text-xs px-2.5 py-1.5';

  return (
    <div className="flex items-center gap-1.5">
      <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border border-border/60 bg-surface/80 ${sizeClasses} font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30 hover:bg-surface transition-colors cursor-pointer`}
      >
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
