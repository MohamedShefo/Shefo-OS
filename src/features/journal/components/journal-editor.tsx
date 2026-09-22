'use client';

import { useState, useTransition, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { deleteJournalEntry, saveJournalEntry } from '../actions';
import { JournalEntry } from '@/types/database';
import { Button } from '@/components/ui/button';

interface JournalEditorProps {
  entryDate: string;
  entry: JournalEntry | null;
}

export function JournalEditor({ entryDate, entry }: JournalEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(entry?.title ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty =
    title !== (entry?.title ?? '') || content !== (entry?.content ?? '');

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await saveJournalEntry(entryDate, { title, content });
      if (res.success) {
        setSavedAt(new Date().toLocaleTimeString());
        router.refresh();
      } else {
        setError(res.error || 'Failed to save entry');
      }
    });
  };

  const handleDelete = () => {
    if (!entry || isPending) return;
    startTransition(async () => {
      const res = await deleteJournalEntry(entryDate);
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error || 'Failed to delete entry');
      }
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-xs">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Entry title (optional)…"
        disabled={isPending}
        className="w-full bg-transparent text-lg font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`What happened on ${entryDate}? What did you work on? Any important events?`}
        rows={12}
        disabled={isPending}
        className="w-full resize-y bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60 min-h-[240px]"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-between border-t border-border/50 pt-3">
        <p className="text-[11px] text-muted-foreground">
          {savedAt ? `✓ Saved at ${savedAt}` : dirty ? 'Unsaved changes' : 'All changes saved'}
        </p>
        <div className="flex items-center gap-2">
          {entry && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
              className="h-8 text-xs text-muted-foreground hover:text-destructive"
            >
              Delete
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isPending || !dirty} className="h-8">
            {isPending ? 'Saving…' : 'Save Entry'}
          </Button>
        </div>
      </div>
    </form>
  );
}
