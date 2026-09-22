'use client';

import { useState, useTransition, FormEvent } from 'react';
import { createNote } from '../actions';
import { Project, WorkExperience } from '@/types/database';
import { Button } from '@/components/ui/button';
import { NOTE_TYPES } from './note-card';

interface CreateNoteDialogProps {
  projects: Project[];
  works?: WorkExperience[];
  onSuccess?: () => void;
}

export function CreateNoteDialog({ projects, works = [], onSuccess }: CreateNoteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [workId, setWorkId] = useState<string>('');
  const [noteType, setNoteType] = useState<string>('note');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isPending) return;
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    startTransition(async () => {
      const res = await createNote({
        title,
        content,
        tags,
        project_id: projectId || null,
        work_experience_id: workId || null,
        note_type: noteType || null,
      });

      if (res.success) {
        setTitle('');
        setContent('');
        setTagsInput('');
        setProjectId('');
        setWorkId('');
        setNoteType('note');
        setIsOpen(false);
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Failed to create note');
      }
    });
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="font-medium">
        + New Note
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-lg font-semibold tracking-tight">Create Note / Knowledge Item</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. System Architecture Principles..."
              required
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Content (Markdown supported)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note or concept details..."
              rows={5}
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tags (comma separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="architecture, database, frontend"
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Link to Project (Optional)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">No Project Linked</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Workplace (Optional)</label>
              <select
                value={workId}
                onChange={(e) => setWorkId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">No Workplace Linked</option>
                {works.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.organization}
                    {w.role ? ` · ${w.role}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20 capitalize"
              >
                {NOTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
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
            <Button type="submit" disabled={!title.trim() || isPending}>
              {isPending ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
