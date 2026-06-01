'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, ArrowRight, ArrowLeft, Layers, Loader2 } from 'lucide-react';

interface NewProjectWizardProps {
  onSubmit: (data: { name: string; description: string; techStack: Record<string, string> }) => Promise<void>;
  onCancel: () => void;
}

const popularStacks = [
  { id: 'nextjs', name: 'Next.js + Express', frontend: 'nextjs', backend: 'nodejs' },
  { id: 'react-node', name: 'React + Node.js', frontend: 'react', backend: 'nodejs' },
  { id: 'vue-express', name: 'Vue + Express', frontend: 'vue', backend: 'express' },
  { id: 'django-react', name: 'Django + React', frontend: 'react', backend: 'django' },
  { id: 'flask-react', name: 'Flask + React', frontend: 'react', backend: 'flask' },
  { id: 'custom', name: 'Custom Stack', frontend: 'custom', backend: 'custom' },
];

export function NewProjectWizard({ onSubmit, onCancel }: NewProjectWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedStack, setSelectedStack] = useState('nextjs');
  const [customFrontend, setCustomFrontend] = useState('');
  const [customBackend, setCustomBackend] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const stack = popularStacks.find((s) => s.id === selectedStack);
      await onSubmit({
        name,
        description,
        techStack: {
          frontend: stack?.frontend === 'custom' ? customFrontend : stack?.frontend || 'nextjs',
          backend: stack?.backend === 'custom' ? customBackend : stack?.backend || 'nodejs',
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = name.trim().length > 0 && description.trim().length > 0;

  return (
    <Card className="w-full max-w-2xl border-border/50 bg-card">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-xl">Create New Project</CardTitle>
        <CardDescription>
          Step {step} of 2 &mdash; {step === 1 ? 'Describe your idea' : 'Choose your stack'}
        </CardDescription>
        {/* Progress indicator */}
        <div className="mt-4 flex items-center gap-2">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-surface'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-surface'}`} />
        </div>
      </CardHeader>

      {step === 1 && (
        <>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-saas-app"
                autoFocus
                className="bg-surface border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">
                What do you want to build?
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your application in plain English. The Supervisor agent will break this into tasks for the team..."
                rows={5}
                className="bg-surface border-border resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                Be specific about features, user roles, and integrations. The more detail, the
                better the result.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border/50 pt-4">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={() => setStep(2)} disabled={!canProceed} className="gap-2">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </>
      )}

      {step === 2 && (
        <>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="stack">Technology Stack</Label>
              <Select value={selectedStack} onValueChange={setSelectedStack}>
                <SelectTrigger id="stack" className="bg-surface border-border">
                  <SelectValue placeholder="Select a stack" />
                </SelectTrigger>
                <SelectContent>
                  {popularStacks.map((stack) => (
                    <SelectItem key={stack.id} value={stack.id}>
                      {stack.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                This tells the agents which frameworks to use. You can always change it later.
              </p>
            </div>

            {selectedStack === 'custom' && (
              <div className="space-y-4 rounded-lg border border-border/50 bg-surface/50 p-4">
                <div className="space-y-2">
                  <Label htmlFor="customFrontend">Frontend Framework</Label>
                  <Input
                    id="customFrontend"
                    value={customFrontend}
                    onChange={(e) => setCustomFrontend(e.target.value)}
                    placeholder="e.g., react, vue, svelte, angular"
                    className="bg-surface border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customBackend">Backend Framework</Label>
                  <Input
                    id="customBackend"
                    value={customBackend}
                    onChange={(e) => setCustomBackend(e.target.value)}
                    placeholder="e.g., express, django, flask, fastapi"
                    className="bg-surface border-border"
                  />
                </div>
              </div>
            )}

            {/* Summary card */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-primary">Project Summary</p>
              </div>
              <p className="text-sm font-semibold text-foreground">{name}</p>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{description}</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border/50 pt-4">
            <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Create Project
                </>
              )}
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
