'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { linkNotes, unlinkNotes } from '../actions';
import type { LinkedNote } from '../actions';
import { Note } from '@/types/database';
import { Button } from '@/components/ui/button';

interface NoteLinksManagerProps {
  noteId: string;
  outgoing: LinkedNote[];
  incoming: LinkedNote[];
  allNotes: Note[];
}

export function NoteLinksManager({ noteId, outgoing, incoming, allNotes }: NoteLinksManagerProps) {
  const [selected, setSelected] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const linkedIds = new Set([
    noteId,
    ...outgoing.map((l) => l.note.id),
    ...incoming.map((l) => l.note.id),
  ]);
  const candidates = allNotes.filter((n) => !linkedIds.has(n.id));

  const handleLink = () => {
    if (!selected || isPending) return;
    const id = selected;
    setSelected('');
    setError(null);
    startTransition(async () => {
      const res = await linkNotes(noteId, id);
      if (!res.success) setError(res.error || 'Failed to link notes');
    });
  };

  const handleUnlink = (linkId: string) => {
    startTransition(async () => {
      await unlinkNotes(linkId);
    });
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={isPending}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="">Link another note…</option>
          {candidates.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title}
            </option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={handleLink} disabled={!selected || isPending} className="h-8 text-xs">
          Link
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Links out ({outgoing.length})
          </h4>
          {outgoing.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No outgoing links.</p>
          ) : (
            outgoing.map((l) => (
              <div
                key={l.linkId}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5 text-xs"
              >
                <Link href={`/notes/${l.note.id}`} className="font-medium text-foreground truncate hover:underline">
                  📝 {l.note.title}
                </Link>
                <button
                  onClick={() => handleUnlink(l.linkId)}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  Unlink
                </button>
              </div>
            ))
          )}
        </div>
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Linked from ({incoming.length})
          </h4>
          {incoming.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No incoming links.</p>
          ) : (
            incoming.map((l) => (
              <div
                key={l.linkId}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5 text-xs"
              >
                <Link href={`/notes/${l.note.id}`} className="font-medium text-foreground truncate hover:underline">
                  📝 {l.note.title}
                </Link>
                <button
                  onClick={() => handleUnlink(l.linkId)}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  Unlink
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
