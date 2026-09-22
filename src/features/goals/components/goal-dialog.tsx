'use client';

import { useState, useTransition, FormEvent } from 'react';
import { createGoal, updateGoal } from '../actions';
import type { Goal, GoalStatus } from '@/types/database';
import { Button } from '@/components/ui/button';

interface GoalDialogProps {
  goal?: Goal | null;
  buttonLabel?: string;
  dialogTitle?: string;
  onSuccess?: () => void;
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20';

const STATUSES: GoalStatus[] = ['active', 'paused', 'completed', 'archived'];

export function GoalDialog({ goal = null, buttonLabel, dialogTitle, onSuccess }: GoalDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? 'active');
  const [startDate, setStartDate] = useState(goal?.start_date ?? '');
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? '');
  const [targetValue, setTargetValue] = useState(
    goal?.target_value !== null && goal?.target_value !== undefined ? String(goal.target_value) : ''
  );
  const [currentValue, setCurrentValue] = useState(
    goal?.current_value !== null && goal?.current_value !== undefined ? String(goal.current_value) : '0'
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isPending) return;
    setError(null);

    const parsedTarget = targetValue.trim() === '' ? null : Number(targetValue);
    const parsedCurrent = currentValue.trim() === '' ? 0 : Number(currentValue);
    if (parsedTarget !== null && (!Number.isFinite(parsedTarget) || parsedTarget <= 0)) {
      setError('Target must be a positive number, or left empty');
      return;
    }
    if (!Number.isFinite(parsedCurrent) || parsedCurrent < 0) {
      setError('Current value must be a non-negative number');
      return;
    }

    const payload = {
      title,
      description: description || null,
      status,
      start_date: startDate || null,
      target_date: targetDate || null,
      target_value: parsedTarget,
      current_value: parsedCurrent,
    };

    startTransition(async () => {
      const res = goal ? await updateGoal(goal.id, payload) : await createGoal(payload);
      if (res.success) {
        if (!goal) {
          setTitle('');
          setDescription('');
          setStatus('active');
          setStartDate('');
          setTargetDate('');
          setTargetValue('');
          setCurrentValue('0');
        }
        setIsOpen(false);
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Failed to save goal');
      }
    });
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="font-medium">
        {buttonLabel ?? '+ New Goal'}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-lg font-semibold tracking-tight">
            {dialogTitle ?? (goal ? 'Edit Goal' : 'New Goal')}
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
            <label className="text-xs font-medium text-muted-foreground">Goal Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Read 12 books this year…"
              required
              disabled={isPending}
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={isPending}
              className={`${inputClass} resize-y`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as GoalStatus)}
                disabled={isPending}
                className={`${inputClass} text-xs capitalize`}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isPending}
                className={`${inputClass} text-xs`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                disabled={isPending}
                className={`${inputClass} text-xs`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Target Value (Optional)
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g. 12"
                disabled={isPending}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Current Value</label>
              <input
                type="number"
                min={0}
                step="any"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                disabled={isPending}
                className={inputClass}
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isPending}>
              {isPending ? 'Saving…' : goal ? 'Save Changes' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
