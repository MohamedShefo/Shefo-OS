'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { deleteGoal } from '../actions';
import type { Goal } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { SearchField } from '@/components/common/search-field';
import { matchesQuery } from '@/lib/search';
import { ProgressBar } from '../progress';

interface GoalListProps {
  initialGoals: Goal[];
  progressByGoal: Record<string, number>;
}

const STATUS_TABS = ['all', 'active', 'paused', 'completed', 'archived'] as const;

export function GoalList({ initialGoals, progressByGoal }: GoalListProps) {
  const [filter, setFilter] = useState<(typeof STATUS_TABS)[number]>('all');
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();

  const visible = initialGoals.filter((g) => {
    if (filter !== 'all' && g.status !== filter) return false;
    return matchesQuery([g.title, g.description], search);
  });

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteGoal(id);
    });
  };

  if (initialGoals.length === 0) {
    return (
      <EmptyState
        title="No goals yet."
        description='Click "+ New Goal" to define an outcome and track it manually.'
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${
                filter === tab
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <SearchField value={search} onChange={setSearch} placeholder="Search goals…" />
      </div>

      {visible.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          No goals match the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map((g) => {
            const pct = progressByGoal[g.id] ?? 0;
            return (
              <div
                key={g.id}
                className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs hover:border-ring/40 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/goals/${g.id}`}
                      className="font-semibold text-base leading-tight tracking-tight text-foreground hover:underline underline-offset-4"
                    >
                      {g.title}
                    </Link>
                    <Badge variant="secondary" className="capitalize shrink-0">
                      {g.status}
                    </Badge>
                  </div>
                  {g.description && (
                    <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {g.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1">
                      <ProgressBar value={pct} label={`Goal progress ${pct} percent`} />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                      {pct}%
                    </span>
                  </div>
                  {g.target_date && (
                    <p className="text-[11px] text-muted-foreground">
                      🎯 Target {new Date(`${g.target_date}T00:00:00`).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-end pt-4 mt-4 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(g.id)}
                    disabled={isPending}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                  >
                    Archive
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
