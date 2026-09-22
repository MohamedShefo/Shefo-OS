'use client';

import { useState, useTransition, FormEvent } from 'react';
import { createHabit, deleteHabit, setHabitActive, toggleHabitToday } from '../actions';
import type { HabitWithProgress } from '../actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20';

function last7Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const WEEK = last7Days();

export function HabitList({ initialHabits }: { initialHabits: HabitWithProgress[] }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await createHabit({ name, description });
      if (res.success) {
        setName('');
        setDescription('');
        setIsOpen(false);
      } else {
        setError(res.error || 'Failed to create habit');
      }
    });
  };

  const toggle = (id: string, done: boolean) => {
    startTransition(async () => {
      await toggleHabitToday(id, done);
    });
  };

  const setActive = (id: string, active: boolean) => {
    startTransition(async () => {
      await setHabitActive(id, active);
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      await deleteHabit(id);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          Habits
          <Badge variant="secondary">{initialHabits.length}</Badge>
        </h2>
        <Button size="sm" onClick={() => setIsOpen(true)} className="font-medium">
          + New Habit
        </Button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-semibold tracking-tight">New Habit</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Habit *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Read 20 pages, Morning run…"
                  required
                  disabled={isPending}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPending}
                  className={inputClass}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!name.trim() || isPending}>
                  {isPending ? 'Saving…' : 'Add Habit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {initialHabits.length === 0 ? (
        <EmptyState
          title="No habits yet."
          description='Click "+ New Habit" to start tracking something daily.'
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {initialHabits.map((h) => {
            const doneSet = new Set(h.doneDates);
            return (
              <div
                key={h.id}
                className={`rounded-xl border border-border bg-card p-4 shadow-xs space-y-3 transition-all ${
                  h.is_active ? '' : 'opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={h.doneToday}
                      onChange={(e) => toggle(h.id, e.target.checked)}
                      disabled={isPending || !h.is_active}
                      aria-label={`Mark ${h.name} done today`}
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-ring/20 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <p
                        className={`font-semibold text-sm text-foreground truncate ${
                          h.doneToday ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {h.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {h.streak > 0 ? `🔥 ${h.streak}-day streak` : 'No streak yet'}
                        {!h.is_active && ' · Paused'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setActive(h.id, !h.is_active)}
                      disabled={isPending}
                      className="text-[11px] text-muted-foreground hover:text-foreground px-1"
                    >
                      {h.is_active ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => remove(h.id)}
                      disabled={isPending}
                      className="text-[11px] text-muted-foreground hover:text-destructive px-1"
                    >
                      Archive
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5" aria-label="Last 7 days">
                  {WEEK.map((day) => (
                    <div
                      key={day}
                      title={day}
                      className={`h-2 flex-1 rounded-full ${
                        doneSet.has(day) ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
