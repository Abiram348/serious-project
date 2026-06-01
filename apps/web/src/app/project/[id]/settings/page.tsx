'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ProjectSettingsPage({ params }: { params: { id: string } }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [techStack, setTechStack] = useState({ frontend: '', backend: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/projects/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, techStack }),
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await fetch(`/api/projects/${params.id}`, { method: 'DELETE' });
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Project Settings</h1>
        <p className="text-muted-foreground">Manage your project configuration</p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Update your project information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frontend">Frontend Framework</Label>
              <Select value={techStack.frontend} onValueChange={(v) => setTechStack({ ...techStack, frontend: v })}>
                <SelectTrigger id="frontend">
                  <SelectValue placeholder="Select frontend" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nextjs">Next.js</SelectItem>
                  <SelectItem value="react">React</SelectItem>
                  <SelectItem value="vue">Vue</SelectItem>
                  <SelectItem value="svelte">Svelte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="backend">Backend Framework</Label>
              <Select value={techStack.backend} onValueChange={(v) => setTechStack({ ...techStack, backend: v })}>
                <SelectTrigger id="backend">
                  <SelectValue placeholder="Select backend" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nodejs">Node.js</SelectItem>
                  <SelectItem value="express">Express</SelectItem>
                  <SelectItem value="django">Django</SelectItem>
                  <SelectItem value="flask">Flask</SelectItem>
                  <SelectItem value="fastapi">FastAPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting the project will remove all files, chat history, and agent runs.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="destructive" onClick={handleDelete}>
            Delete Project
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
