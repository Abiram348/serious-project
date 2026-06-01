'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ProjectCardProps {
  id: string;
  name: string;
  description: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'REVIEWING' | 'COMPLETED' | 'FAILED';
  techStack?: string[];
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  PLANNING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 animate-pulse',
  REVIEWING: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

export function ProjectCard({ id, name, description, status, techStack, createdAt }: ProjectCardProps) {
  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{name}</CardTitle>
          <Badge className={statusColors[status]}>{status}</Badge>
        </div>
        <CardDescription className="text-sm line-clamp-2">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {techStack && techStack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {techStack.map((tech) => (
              <Badge key={tech} variant="secondary" className="text-xs">
                {tech}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          Created {new Date(createdAt).toLocaleDateString()}
        </span>
        <Link href={`/project/${id}`}>
          <Button size="sm" variant="outline">
            Open Project
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
