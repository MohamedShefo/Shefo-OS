'use client';

import { useState, useTransition } from 'react';
import { addMilestone, deleteMilestone, toggleMilestone } from '../actions';
import type { GoalMilestone } from '@/types/database';
import { Button } from '@/components/ui/button';

export function MilestonesManager({
  goalId,
  initialMilestones,
}: {
  goalId: string;
  initialMilestones: GoalMilestone[];
}) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const done = initialMilestones.filter((m) => m.is_done).length;

  const handleAdd = () => {
    if (!title.trim() || isPending) return;
    const t = title;
    setTitle('');
    setError(null);
    startTransition(async () => {
      const res = await addMilestone(goalId, t);
      if (!res.success) setError(res.error || 'Failed to add milestone');
    });
  };

  const handleToggle = (id: string, next: boolean) => {
    startTransition(async () => {
      await toggleMilestone(goalId, id, next);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteMilestone(goalId, id);
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        Milestones ({done}/{initialMilestones.length})
      </h2>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add a milestone… (Enter)"
          disabled={isPending}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
        />
        <Button size="sm" onClick={handleAdd} disabled={!title.trim() || isPending} className="h-8">
          Add
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {initialMilestones.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No milestones yet.</p>
      ) : (
        <div className="space-y-1.5">
          {initialMilestones.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-border/60 p-2.5"
            >
              <input
                type="checkbox"
                checked={m.is_done}
                onChange={(e) => handleToggle(m.id, e.target.checked)}
                disabled={isPending}
                aria-label={`Mark ${m.title} ${m.is_done ? 'not done' : 'done'}`}
                className="h-4 w-4 rounded border-border text-primary focus:ring-ring/20 cursor-pointer shrink-0"
              />
              <span
                className={`flex-1 text-xs font-medium truncate ${
                  m.is_done ? 'line-through text-muted-foreground' : 'text-foreground'
                }`}
              >
                {m.title}
              </span>
              <button
                onClick={() => handleDelete(m.id)}
                disabled={isPending}
                aria-label={`Delete ${m.title}`}
                className="text-[11px] text-muted-foreground hover:text-destructive shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
