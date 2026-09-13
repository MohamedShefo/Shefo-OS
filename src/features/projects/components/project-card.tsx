'use client';

import { useTransition } from 'react';
import { Project, ProjectStatus } from '@/types/database';
import { updateProjectStatus, deleteProject } from '../actions';
import { Button } from '@/components/ui/button';

interface ProjectCardProps {
  project: Project;
}

const statusColors: Record<ProjectStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  paused: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  archived: 'bg-muted text-muted-foreground border-border',
};

export function ProjectCard({ project }: ProjectCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: ProjectStatus) => {
    startTransition(async () => {
      await updateProjectStatus(project.id, newStatus);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteProject(project.id);
    });
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs hover:border-ring/40 transition-all">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-base leading-tight tracking-tight text-foreground">
            {project.name}
          </h3>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
              statusColors[project.status]
            }`}
          >
            {project.status}
          </span>
        </div>

        {project.description && (
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
            {project.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50 text-xs text-muted-foreground">
        <span>Created {new Date(project.created_at).toLocaleDateString()}</span>

        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
          <select
            value={project.status}
            onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
            disabled={isPending}
            className="rounded bg-muted px-2 py-1 text-[11px] font-medium outline-none cursor-pointer border border-border/50"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
          >
            Archive
          </Button>
        </div>
      </div>
    </div>
  );
}
