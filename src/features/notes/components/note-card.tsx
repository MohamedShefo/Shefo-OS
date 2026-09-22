'use client';

import { useState, useTransition, FormEvent } from 'react';
import Link from 'next/link';
import { Note, Project, WorkExperience } from '@/types/database';
import { deleteNote, updateNote } from '../actions';
import { Button } from '@/components/ui/button';
import { normalizeTags } from '@/lib/utils';

export const NOTE_TYPES = ['note', 'concept', 'reference', 'meeting', 'idea'] as const;

interface NoteCardProps {
  note: Note;
  projectsMap: Record<string, string>; // project_id -> project_name
  projects: Project[];
  works?: WorkExperience[];
}

export function NoteCard({ note, projectsMap, projects, works = [] }: NoteCardProps) {
  const normalizedTags = normalizeTags(note.tags);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || '');
  const [tagsInput, setTagsInput] = useState(normalizedTags.join(', '));
  const [projectId, setProjectId] = useState(note.project_id || '');
  const [workId, setWorkId] = useState(note.work_experience_id || '');
  const [noteType, setNoteType] = useState(note.note_type || 'note');
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteNote(note.id);
    });
  };

  const handleUpdate = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isPending) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    startTransition(async () => {
      const res = await updateNote(note.id, {
        title,
        content,
        tags,
        project_id: projectId || null,
        work_experience_id: workId || null,
        note_type: noteType || null,
      });

      if (res.success) {
        setIsEditing(false);
      }
    });
  };

  const projectName = note.project_id ? projectsMap[note.project_id] : null;
  const worksMap: Record<string, string> = {};
  works.forEach((w) => {
    worksMap[w.id] = w.organization;
  });
  const workName = note.work_experience_id ? worksMap[note.work_experience_id] : null;

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs hover:border-ring/40 transition-all space-y-3">
      {isEditing ? (
        <form onSubmit={handleUpdate} className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring/20"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring/20 resize-y"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="tags"
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
            />
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
            >
              <option value="">No Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={workId}
              onChange={(e) => setWorkId(e.target.value)}
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
            >
              <option value="">No Workplace</option>
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.organization}
                  {w.role ? ` · ${w.role}` : ''}
                </option>
              ))}
            </select>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs capitalize"
            >
              {NOTE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="h-7 text-xs">
              Save
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/notes/${note.id}`}
                className="font-semibold text-base leading-tight tracking-tight text-foreground hover:underline underline-offset-4"
              >
                {note.title}
              </Link>
              <span className="flex shrink-0 items-center gap-1">
                {note.note_type && note.note_type !== 'note' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border capitalize">
                    {note.note_type}
                  </span>
                )}
                {workName && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                    💼 {workName}
                  </span>
                )}
                {projectName && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">
                    📁 {projectName}
                  </span>
                )}
              </span>
            </div>

            {note.content && (
              <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap line-clamp-4">
                {note.content}
              </p>
            )}

            {normalizedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {normalizedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/50 text-[11px] text-muted-foreground">
            <span>{new Date(note.created_at).toLocaleDateString()}</span>

            <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={isPending}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Edit
              </Button>
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
        </>
      )}
    </div>
  );
}
