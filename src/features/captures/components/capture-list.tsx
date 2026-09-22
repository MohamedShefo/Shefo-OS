'use client';

import { useTransition } from 'react';
import { Capture, Project } from '@/types/database';
import { deleteCapture } from '../actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          {heading}
          <Badge variant="secondary">{initialCaptures.length}</Badge>
        </h2>
      </div>

      <div className="space-y-2">
        {initialCaptures.map((item) => (
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
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                    📁 {projectsMap[item.project_id]}
                  </span>
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
        ))}
      </div>
    </div>
  );
}
