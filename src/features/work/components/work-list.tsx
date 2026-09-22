'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { WorkExperience } from '@/types/database';
import { deleteWorkExperience } from '../actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { SearchField } from '@/components/common/search-field';
import { matchesQuery } from '@/lib/search';

interface WorkListProps {
  initialWork: WorkExperience[];
}

function dateRange(w: WorkExperience): string {
  const fmt = (d: string | null) =>
    d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : null;
  const start = fmt(w.start_date);
  const end = w.is_current ? 'Present' : (fmt(w.end_date) ?? '—');
  if (!start) return end;
  return `${start} → ${end}`;
}

export function WorkList({ initialWork }: WorkListProps) {
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();

  const visible = initialWork.filter((w) =>
    matchesQuery([w.organization, w.role, w.description], search)
  );

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteWorkExperience(id);
    });
  };

  if (initialWork.length === 0) {
    return (
      <EmptyState
        title="No work experience yet."
        description='Click "+ New Workplace" to record where you have worked.'
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2 px-1">
          Workplaces
          <Badge variant="secondary">{initialWork.length}</Badge>
        </h2>
        <SearchField value={search} onChange={setSearch} placeholder="Search workplaces…" />
      </div>

      {visible.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          No workplaces match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map((w) => (
            <div
              key={w.id}
              className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs hover:border-ring/40 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/work/${w.id}`}
                    className="font-semibold text-base leading-tight tracking-tight text-foreground hover:underline underline-offset-4"
                  >
                    {w.organization}
                  </Link>
                  {w.is_current ? (
                    <Badge variant="secondary">Current</Badge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground shrink-0">{dateRange(w)}</span>
                  )}
                </div>
                {w.role && <p className="text-sm font-medium text-foreground/80">{w.role}</p>}
                {!w.is_current && (
                  <p className="text-[11px] text-muted-foreground">{dateRange(w)}</p>
                )}
                {w.description && (
                  <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                    {w.description}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-end pt-4 mt-4 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(w.id)}
                  disabled={isPending}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                >
                  Archive
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
