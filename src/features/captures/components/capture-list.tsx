'use client';

import { useTransition } from 'react';
import { Capture } from '@/types/database';
import { deleteCapture } from '../actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';

interface CaptureListProps {
  initialCaptures: Capture[];
}

export function CaptureList({ initialCaptures }: CaptureListProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteCapture(id);
    });
  };

  if (initialCaptures.length === 0) {
    return (
      <EmptyState
        title="Your inbox is clear."
        description="Use the capture box above to offload thoughts instantly."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          Unprocessed Inbox
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
              <p className="text-[11px] text-muted-foreground">
                Captured {new Date(item.created_at).toLocaleString()}
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
