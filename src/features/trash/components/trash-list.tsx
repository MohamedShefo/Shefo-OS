'use client';

import { useTransition } from 'react';
import { useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import {
  permanentlyDeleteItem,
  restoreItem,
  type TrashedItem,
  type TrashEntityType,
} from '../actions';

interface TrashListProps {
  initialItems: TrashedItem[];
}

const ENTITY_LABELS: Record<TrashEntityType, string> = {
  capture: 'Capture',
  note: 'Note',
  project: 'Project',
  task: 'Task',
};

function getItemTitle(entry: TrashedItem): string {
  switch (entry.entityType) {
    case 'capture':
      return entry.item.raw_text.length > 80
        ? `${entry.item.raw_text.slice(0, 80)}…`
        : entry.item.raw_text;
    case 'note':
      return entry.item.title;
    case 'project':
      return entry.item.name;
    case 'task':
      return entry.item.title;
  }
}

export function TrashList({ initialItems }: TrashListProps) {
  const [filter, setFilter] = useState<'all' | TrashEntityType>('all');
  const [isPending, startTransition] = useTransition();

  const filteredItems = initialItems.filter((entry) => {
    if (filter === 'all') return true;
    return entry.entityType === filter;
  });

  const handleRestore = (entityType: TrashEntityType, id: string) => {
    startTransition(async () => {
      await restoreItem(entityType, id);
    });
  };

  const handlePermanentDelete = (entityType: TrashEntityType, id: string) => {
    startTransition(async () => {
      await permanentlyDeleteItem(entityType, id);
    });
  };

  if (initialItems.length === 0) {
    return (
      <EmptyState
        title="Trash is empty."
        description="Soft-deleted captures, notes, projects, and tasks will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-3">
        {(['all', 'capture', 'note', 'project', 'task'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${
              filter === tab
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {tab === 'all' ? 'All' : ENTITY_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* List */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          No trashed items match the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((entry) => (
            <div
              key={`${entry.entityType}-${entry.item.id}`}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-base leading-tight tracking-tight text-foreground line-clamp-2">
                    {getItemTitle(entry)}
                  </h3>
                  <span className="inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize bg-muted text-muted-foreground border-border">
                    {ENTITY_LABELS[entry.entityType]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deleted{' '}
                  {entry.item.deleted_at
                    ? new Date(entry.item.deleted_at).toLocaleDateString()
                    : '—'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-1 pt-4 mt-4 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(entry.entityType, entry.item.id)}
                  disabled={isPending}
                  className="h-7 px-2 text-[11px]"
                >
                  Restore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePermanentDelete(entry.entityType, entry.item.id)}
                  disabled={isPending}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                >
                  Delete forever
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
