'use client';

import { useState, useTransition } from 'react';
import { updateGoal } from '../actions';
import type { Goal } from '@/types/database';
import { Button } from '@/components/ui/button';

/** Quick manual progress stepping for measurable goals. */
export function GoalProgressEditor({
  goal,
  milestoneCount,
  milestoneTotal,
}: {
  goal: Goal;
  milestoneCount: number;
  milestoneTotal: number;
}) {
  const [current, setCurrent] = useState(String(goal.current_value ?? 0));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = current !== String(goal.current_value ?? 0);
  const measurable = goal.target_value !== null && goal.target_value !== undefined;

  const handleSave = () => {
    const value = Number(current);
    if (!Number.isFinite(value) || value < 0) {
      setError('Current value must be a non-negative number');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateGoal(goal.id, { current_value: value });
      if (res.success) {
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        setError(res.error || 'Could not save progress');
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {measurable ? (
        <>
          <label className="text-muted-foreground">
            Current{' '}
            <input
              type="number"
              min={0}
              step="any"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={isPending}
              className="w-24 rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring/20 tabular-nums"
            />{' '}
            / {goal.target_value}
          </label>
          <Button size="sm" variant="outline" onClick={handleSave} disabled={!dirty || isPending} className="h-7 text-[11px]">
            {isPending ? 'Saving…' : 'Update'}
          </Button>
        </>
      ) : (
        <p className="text-muted-foreground">
          {milestoneTotal > 0
            ? `${milestoneCount} of ${milestoneTotal} milestones done — progress follows milestones.`
            : 'No measurable target or milestones yet — progress follows status.'}
        </p>
      )}
      {error && <span className="text-destructive">{error}</span>}
      {savedAt && <span className="text-muted-foreground">✓ Saved at {savedAt}</span>}
    </div>
  );
}
