'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Capture, Project } from '@/types/database';
import { deleteCapture } from '../actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { SearchField } from '@/components/common/search-field';
import { matchesQuery } from '@/lib/search';

interface CaptureListProps {
  initialCaptures: Capture[];
  projects?: Project[];
  heading?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function CaptureList({
  initialCaptures,
  projects = [],
  heading = 'Unprocessed Inbox',
  emptyTitle = 'Your inbox is clear.',
  emptyDescription = 'Use the capture box above to offload thoughts instantly.',
}: CaptureListProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');

  const projectsMap: Record<string, string> = {};
  projects.forEach((p) => {
    projectsMap[p.id] = p.name;
  });

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteCapture(id);
    });
  };

  if (initialCaptures.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const visibleCaptures = initialCaptures.filter((item) => matchesQuery([item.raw_text], search));

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          {heading}
          <Badge variant="secondary">{initialCaptures.length}</Badge>
        </h2>
        <SearchField value={search} onChange={setSearch} placeholder="Search captures…" />
      </div>

      <div className="space-y-2">
        {visibleCaptures.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No captures match your search.
          </div>
        ) : (
          visibleCaptures.map((item) => (
          <div
            key={item.id}
            className="group flex items-start justify-between p-4 rounded-lg border border-border bg-card text-card-foreground shadow-xs hover:border-ring/30 transition-all"
          >
            <div className="space-y-1.5 flex-1 pr-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {item.raw_text}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>Captured {new Date(item.created_at).toLocaleString()}</span>
                {item.project_id && projectsMap[item.project_id] && (
                  <Link
                    href={`/projects/${item.project_id}`}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 hover:underline"
                  >
                    📁 {projectsMap[item.project_id]}
                  </Link>
                )}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(item.id)}
              disabled={isPending}
              className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-destructive transition-all h-8 px-2"
            >
              Archive
            </Button>
          </div>
          ))
        )}
      </div>
    </div>
  );
}
