'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { updateProjectGoal } from '@/features/projects/actions';
import { updateTaskGoal } from '@/features/tasks/actions';
import { updateNote } from '@/features/notes/actions';
import { updateHabitGoal } from '@/features/habits/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AttachRow {
  id: string;
  title: string;
  href: string;
}

interface GoalAttachProps {
  goalId: string;
  kind: 'project' | 'task' | 'note' | 'habit';
  linked: AttachRow[];
  candidates: AttachRow[];
}

async function attach(
  kind: GoalAttachProps['kind'],
  id: string,
  goalId: string
): Promise<{ success: boolean; error?: string }> {
  if (kind === 'project') return updateProjectGoal(id, goalId);
  if (kind === 'task') return updateTaskGoal(id, goalId);
  if (kind === 'habit') return updateHabitGoal(id, goalId);
  return updateNote(id, { goal_id: goalId });
}

async function detach(
  kind: GoalAttachProps['kind'],
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (kind === 'project') return updateProjectGoal(id, null);
  if (kind === 'task') return updateTaskGoal(id, null);
  if (kind === 'habit') return updateHabitGoal(id, null);
  return updateNote(id, { goal_id: null });
}

const KIND_LABEL: Record<GoalAttachProps['kind'], string> = {
  project: 'Projects',
  task: 'Tasks',
  note: 'Notes',
  habit: 'Habits',
};

export function GoalAttach({ goalId, kind, linked, candidates }: GoalAttachProps) {
  const [selected, setSelected] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAttach = () => {
    if (!selected || isPending) return;
    const id = selected;
    setSelected('');
    setError(null);
    startTransition(async () => {
      const res = await attach(kind, id, goalId);
      if (!res.success) setError(res.error || 'Could not attach');
    });
  };

  const handleDetach = (id: string) => {
    startTransition(async () => {
      const res = await detach(kind, id);
      if (!res.success) setError(res.error || 'Could not detach');
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
        Linked {KIND_LABEL[kind]}
        <Badge variant="secondary">{linked.length}</Badge>
      </h2>
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={isPending}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="">Attach…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={handleAttach} disabled={!selected || isPending} className="h-8 text-xs">
          Attach
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {linked.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Nothing linked yet.</p>
      ) : (
        <div className="space-y-1.5">
          {linked.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-2.5 text-xs"
            >
              <Link href={l.href} className="font-medium text-foreground truncate hover:underline">
                {l.title}
              </Link>
              <button
                onClick={() => handleDetach(l.id)}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                Unlink
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function toAttachRows<T extends { id: string; goal_id: string | null }>(
  items: T[],
  goalId: string,
  titleOf: (item: T) => string,
  hrefOf: (item: T) => string
): { linked: AttachRow[]; candidates: AttachRow[] } {
  const linked: AttachRow[] = [];
  const candidates: AttachRow[] = [];
  for (const item of items) {
    const row: AttachRow = { id: item.id, title: titleOf(item), href: hrefOf(item) };
    if (item.goal_id === goalId) linked.push(row);
    else if (!item.goal_id) candidates.push(row);
  }
  return { linked, candidates };
}
