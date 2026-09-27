'use client';

import { useState, useTransition, FormEvent } from 'react';
import { createProject, updateProject } from '../actions';
import { Project, ProjectStatus } from '@/types/database';
import { Button } from '@/components/ui/button';

interface CreateProjectDialogProps {
  workspaceId?: string | null;
  project?: Project | null;
  buttonLabel?: string;
  dialogTitle?: string;
  onSuccess?: () => void;
}

export function CreateProjectDialog({ workspaceId = null, project = null, buttonLabel, dialogTitle, onSuccess }: CreateProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'active');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isPending) return;
    setError(null);

    const payload = {
      name,
      description,
      status,
      workspace_id: workspaceId,
    };

    startTransition(async () => {
      const res = project
        ? await updateProject(project.id, payload)
        : await createProject(payload);

      if (res.success) {
        if (!project) {
          setName('');
          setDescription('');
          setStatus('active');
        }
        setIsOpen(false);
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Failed to save project');
      }
    });
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="font-medium" size={project ? 'sm' : 'default'}>
        {buttonLabel ?? (project ? 'Edit' : '+ New Project')}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-lg font-semibold tracking-tight">
            {dialogTitle ?? (project ? 'Edit Project' : 'Create Project')}
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign, Fitness Tracker..."
              required
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview or desired outcome..."
              rows={3}
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending ? 'Saving…' : project ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
