'use client';

import { useState, useTransition } from 'react';
import { updateNote } from '../actions';
import { Note, Project, WorkExperience } from '@/types/database';
import { NOTE_TYPES } from './note-card';
import { Button } from '@/components/ui/button';

interface NoteMetaEditorProps {
  note: Note;
  projects: Project[];
  works: WorkExperience[];
  projectsMap: Record<string, string>;
  worksMap: Record<string, string>;
}

export function NoteMetaEditor({ note, projects, works, projectsMap, worksMap }: NoteMetaEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [tagsInput, setTagsInput] = useState((note.tags ?? []).join(', '));
  const [projectId, setProjectId] = useState(note.project_id || '');
  const [workId, setWorkId] = useState(note.work_experience_id || '');
  const [noteType, setNoteType] = useState(note.note_type || 'note');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty =
    title !== note.title ||
    tagsInput !== (note.tags ?? []).join(', ') ||
    projectId !== (note.project_id || '') ||
    workId !== (note.work_experience_id || '') ||
    noteType !== (note.note_type || 'note');

  const handleSave = () => {
    if (!title.trim() || !dirty || isPending) return;
    setError(null);
    startTransition(async () => {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const res = await updateNote(note.id, {
        title: title.trim(),
        tags,
        project_id: projectId || null,
        work_experience_id: workId || null,
        note_type: noteType || null,
      });
      if (res.success) {
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        setError(res.error || 'Failed to save note');
      }
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Details & Classification
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-ring/20"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Tags (comma separated)</span>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="architecture, ideas"
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
          />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Type</span>
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value)}
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs capitalize outline-none focus:ring-2 focus:ring-ring/20"
          >
            {NOTE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Project</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="">No Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Workplace</span>
          <select
            value={workId}
            onChange={(e) => setWorkId(e.target.value)}
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="">No Workplace</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.organization}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          {error ? <span className="text-destructive">{error}</span> : savedAt ? `✓ Saved at ${savedAt}` : ' '}
        </p>
        <Button size="sm" onClick={handleSave} disabled={!dirty || !title.trim() || isPending} className="h-7 text-[11px]">
          {isPending ? 'Saving…' : 'Save Details'}
        </Button>
      </div>
      {(note.project_id || note.work_experience_id) && (
        <p className="text-[11px] text-muted-foreground">
          Linked to{' '}
          {[note.project_id && projectsMap[note.project_id], note.work_experience_id && worksMap[note.work_experience_id]]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </div>
  );
}
