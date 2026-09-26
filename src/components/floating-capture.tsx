'use client';

import { useState, useTransition, KeyboardEvent } from 'react';
import { createCapture } from '@/features/captures/actions';
import { Button } from '@/components/ui/button';

const VISIBILITY_KEY = 'shefo:floating-capture-visible';

export function FloatingCapture() {
  const [open, setOpen] = useState(false);
  // Lazy init keeps this SSR-safe (no localStorage on the server).
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem(VISIBILITY_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const toggleVisible = () => {
    setVisible((v) => {
      const next = !v;
      try {
        localStorage.setItem(VISIBILITY_KEY, next ? '1' : '0');
      } catch {
        // ignore storage failures
      }
      if (!next) setOpen(false);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!text.trim() || isPending) return;
    setError(null);
    const textToSubmit = text;
    setText('');
    startTransition(async () => {
      const res = await createCapture(textToSubmit);
      if (res.success) {
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          setOpen(false);
        }, 800);
      } else {
        setText(textToSubmit);
        setError(res.error || 'Failed to save capture');
      }
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') setOpen(false);
  };

  if (!visible) {
    return (
      <button
        onClick={toggleVisible}
        aria-label="Show quick capture"
        title="Show quick capture"
        suppressHydrationWarning
        className="pointer-events-auto fixed bottom-4 end-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-xs text-muted-foreground shadow-md transition-all hover:text-foreground hover:shadow-lg"
      >
        ⚡
      </button>
    );
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 end-4 z-40 flex flex-col items-end gap-2"
      suppressHydrationWarning
    >
      <div
        className={`w-[calc(100vw-2rem)] max-w-xs origin-bottom-end overflow-hidden rounded-xl border border-border bg-card shadow-lg transition-all duration-200 ${
          open ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
        aria-hidden={!open}
      >
        <div className="space-y-2 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Quick capture
            </p>
            <button
              onClick={toggleVisible}
              aria-label="Hide quick capture"
              title="Hide quick capture"
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Hide
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            placeholder="Capture a thought… (Enter to save)"
            rows={3}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20"
          />
          {error && <p className="text-[11px] text-destructive">{error}</p>}
          {saved && <p className="text-[11px] text-muted-foreground">✓ Captured to inbox.</p>}
          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || isPending}
            size="sm"
            className="w-full"
          >
            {isPending ? 'Capturing…' : 'Capture'}
          </Button>
        </div>
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close quick capture' : 'Open quick capture'}
        aria-expanded={open}
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
      >
        {open ? '✕' : '⚡'}
      </button>
    </div>
  );
}
