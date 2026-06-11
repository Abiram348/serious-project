'use client';

import { useEffect, useState } from 'react';
import { useModelStore } from '@/store/modelStore';
import { Cpu, RotateCcw, Save, X, Sparkles, Code, Wrench, Database, Cloud, ClipboardCheck, Shield, FileText } from 'lucide-react';

interface ModelPreferencesPanelProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

const AGENT_ROWS = [
  { id: 'SUPERVISOR', label: 'Supervisor', icon: Sparkles, desc: 'Planning & coordination', color: 'text-amber-500' },
  { id: 'FRONTEND', label: 'Frontend', icon: Code, desc: 'UI/UX components', color: 'text-blue-500' },
  { id: 'BACKEND', label: 'Backend', icon: Wrench, desc: 'API & business logic', color: 'text-emerald-500' },
  { id: 'DATABASE', label: 'Database', icon: Database, desc: 'Schema & queries', color: 'text-violet-500' },
  { id: 'DEVOPS', label: 'DevOps', icon: Cloud, desc: 'Docker & CI/CD', color: 'text-cyan-500' },
  { id: 'QA', label: 'QA', icon: ClipboardCheck, desc: 'Tests & validation', color: 'text-orange-500' },
  { id: 'REVIEWER', label: 'Reviewer', icon: Shield, desc: 'Code review', color: 'text-rose-500' },
  { id: 'SECURITY', label: 'Security', icon: Shield, desc: 'Security audits', color: 'text-red-500' },
  { id: 'DOCUMENTATION', label: 'Documentation', icon: FileText, desc: 'Docs & README', color: 'text-slate-500' },
];

const MODELS = ['llama4', 'codellama', 'kimi', 'mistral-small', 'gpt-oss'];

export function ModelPreferencesPanel({ projectId, open, onClose }: ModelPreferencesPanelProps) {
  const { preferences, recommended, isCustom, loading, fetchPreferences, updatePreferences, resetToDefaults } = useModelStore();
  const [localPrefs, setLocalPrefs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPreferences(projectId);
    }
  }, [open, projectId, fetchPreferences]);

  useEffect(() => {
    setLocalPrefs({ ...preferences });
  }, [preferences]);

  if (!open) return null;

  const handleChange = (agentId: string, model: string) => {
    setLocalPrefs((prev) => ({ ...prev, [agentId]: model }));
  };

  const handleSave = async () => {
    setSaving(true);
    await updatePreferences(projectId, localPrefs);
    setSaving(false);
  };

  const handleReset = async () => {
    await resetToDefaults(projectId);
  };

  const hasChanges = JSON.stringify(localPrefs) !== JSON.stringify(preferences);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-surface-elevated shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div>
            <h2 className="text-lg font-bold text-foreground">Model Preferences</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose which LLM model each agent uses
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-hover transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Table */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-2">
              {AGENT_ROWS.map((agent) => {
                const Icon = agent.icon;
                const current = localPrefs[agent.id] || recommended[agent.id] || 'codellama';
                const rec = recommended[agent.id];
                const isDefault = current === rec;

                return (
                  <div key={agent.id} className="flex items-center gap-3 rounded-xl border border-border/40 bg-surface/50 p-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-surface-elevated ${agent.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{agent.label}</span>
                        {!isDefault && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{agent.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={current}
                        onChange={(e) => handleChange(agent.id, e.target.value)}
                        className="rounded-lg border border-border/60 bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                      >
                        {MODELS.map((m) => (
                          <option key={m} value={m}>
                            {m} {m === rec ? '(recommended)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border/40 bg-surface/30">
          <button
            onClick={handleReset}
            disabled={loading || saving}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-hover transition-colors disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Recommended
          </button>
          <div className="flex items-center gap-2">
            {isCustom && (
              <span className="text-[11px] text-muted-foreground">Custom settings active</span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
