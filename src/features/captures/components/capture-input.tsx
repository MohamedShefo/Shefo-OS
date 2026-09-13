'use client';

import { useState, useTransition, KeyboardEvent } from 'react';
import { createCapture } from '../actions';
import { Button } from '@/components/ui/button';

export function CaptureInput() {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!text.trim() || isPending) return;
    setError(null);

    const textToSubmit = text;
    setText(''); // Instant optimistic clear

    startTransition(async () => {
      const res = await createCapture(textToSubmit);
      if (!res.success) {
        setText(textToSubmit); // Restore text on error
        setError(res.error || 'Failed to save capture');
      }
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Press Enter (without Shift) to submit fast capture
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="relative rounded-xl border border-border bg-card p-4 shadow-sm transition-all focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          placeholder="Capture a thought, task, or note... (Press Enter to submit)"
          className="w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground min-h-[90px]"
          rows={3}
          autoFocus
        />

        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Enter ↵</kbd>
            <span>Fast capture</span>
            <span className="text-muted-foreground/60">•</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Shift + Enter</kbd>
            <span>New line</span>
          </span>

          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || isPending}
            size="sm"
            className="h-8 px-4 font-medium transition-all"
          >
            {isPending ? 'Capturing...' : 'Capture'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive px-1">{error}</p>
      )}
    </div>
  );
}
