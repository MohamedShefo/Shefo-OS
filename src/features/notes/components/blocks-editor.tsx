'use client';

import { useState, useTransition } from 'react';
import { saveNoteBlocks, type NoteBlockInput } from '../actions';
import { NoteBlock } from '@/types/database';
import { Button } from '@/components/ui/button';

interface BlocksEditorProps {
  noteId: string;
  initialBlocks: NoteBlock[];
}

let clientSeq = 0;
function toInputs(blocks: NoteBlock[]): NoteBlockInput[] {
  return blocks.map((b) => ({ id: b.id, block_type: b.block_type, content: b.content ?? '' }));
}

export function BlocksEditor({ noteId, initialBlocks }: BlocksEditorProps) {
  const [blocks, setBlocks] = useState<NoteBlockInput[]>(() => toInputs(initialBlocks));
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = (index: number, patch: Partial<NoteBlockInput>) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
    setSavedAt(null);
  };

  const add = (block_type: string) => {
    clientSeq += 1;
    setBlocks((prev) => [...prev, { id: `new-${clientSeq}`, block_type, content: '' }]);
    setSavedAt(null);
  };

  const remove = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
    setSavedAt(null);
  };

  const move = (index: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
    setSavedAt(null);
  };

  const handleSave = () => {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await saveNoteBlocks(noteId, blocks);
      if (res.success) {
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        setError(res.error || 'Failed to save blocks');
      }
    });
  };

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No blocks yet. Add a heading, text, or list block below.
        </p>
      )}
      {blocks.map((b, i) => (
        <div key={b.id ?? `idx-${i}`} className="rounded-lg border border-border bg-background p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <select
              value={b.block_type}
              onChange={(e) => update(i, { block_type: e.target.value })}
              disabled={isPending}
              aria-label="Block type"
              className="rounded bg-muted px-2 py-1 text-[11px] font-medium outline-none cursor-pointer border border-border/50 capitalize"
            >
              <option value="text">Text</option>
              <option value="heading">Heading</option>
              <option value="list">List item</option>
            </select>
            <span className="flex-1" />
            <button
              onClick={() => move(i, -1)}
              disabled={isPending || i === 0}
              aria-label="Move block up"
              className="px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              ↑
            </button>
            <button
              onClick={() => move(i, 1)}
              disabled={isPending || i === blocks.length - 1}
              aria-label="Move block down"
              className="px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              ↓
            </button>
            <button
              onClick={() => remove(i)}
              disabled={isPending}
              aria-label="Delete block"
              className="px-1.5 py-0.5 text-xs text-muted-foreground hover:text-destructive"
            >
              ✕
            </button>
          </div>
          {b.block_type === 'heading' ? (
            <input
              type="text"
              value={b.content}
              onChange={(e) => update(i, { content: e.target.value })}
              placeholder="Heading…"
              disabled={isPending}
              className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground/60"
            />
          ) : (
            <textarea
              value={b.content}
              onChange={(e) => update(i, { content: e.target.value })}
              placeholder={b.block_type === 'list' ? '• List item…' : 'Write… (prefix lines with "• " for lists)'}
              rows={b.block_type === 'list' ? 2 : 3}
              disabled={isPending}
              className="w-full resize-y bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60"
            />
          )}
        </div>
      ))}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => add('heading')} disabled={isPending} className="h-7 text-[11px]">
          + Heading
        </Button>
        <Button size="sm" variant="outline" onClick={() => add('text')} disabled={isPending} className="h-7 text-[11px]">
          + Text
        </Button>
        <Button size="sm" variant="outline" onClick={() => add('list')} disabled={isPending} className="h-7 text-[11px]">
          + List item
        </Button>
        <span className="flex-1" />
        {savedAt && <span className="text-[11px] text-muted-foreground">✓ Saved at {savedAt}</span>}
        <Button size="sm" onClick={handleSave} disabled={isPending} className="h-7 text-[11px]">
          {isPending ? 'Saving…' : 'Save Blocks'}
        </Button>
      </div>
    </div>
  );
}
