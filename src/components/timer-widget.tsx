'use client';

import { useEffect, useState } from 'react';
import { formatTimer, useTimer } from '@/features/timer/use-timer';
import { Button } from '@/components/ui/button';

const PRESETS = [5, 15, 25, 50];

export function TimerWidget() {
  const { durationMs, remainingMs, phase, start, pause, resume, reset } = useTimer(25);
  const [open, setOpen] = useState(false);
  const [minutesInput, setMinutesInput] = useState('25');

  useEffect(() => {
    if (phase === 'running') {
      document.title = `⏱ ${formatTimer(remainingMs)} | Shefo OS`;
    } else {
      document.title = 'Shefo OS';
    }
    return () => {
      document.title = 'Shefo OS';
    };
  }, [phase, remainingMs]);

  const progress = durationMs > 0 ? 1 - remainingMs / durationMs : 0;
  const running = phase === 'running';

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open focus timer"
        title="Focus timer"
        suppressHydrationWarning
        className="fixed bottom-4 start-4 z-[60] flex h-11 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-xs font-medium text-muted-foreground shadow-md transition-all hover:text-foreground hover:shadow-lg"
      >
        <span aria-hidden="true">⏱</span>
        <span className="tabular-nums">{formatTimer(remainingMs)}</span>
        {running && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 start-4 z-[60] w-[calc(100vw-2rem)] max-w-[260px] rounded-xl border border-border bg-card p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
      suppressHydrationWarning
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Focus timer
        </p>
        <button
          onClick={() => setOpen(false)}
          aria-label="Minimize focus timer"
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <p
        className={`py-2 text-center text-3xl font-bold tabular-nums tracking-tight ${
          phase === 'done' ? 'text-primary' : 'text-foreground'
        }`}
        role="timer"
        aria-live="polite"
      >
        {phase === 'done' ? 'Done!' : formatTimer(remainingMs)}
      </p>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {PRESETS.map((m) => (
          <button
            key={m}
            onClick={() => {
              setMinutesInput(String(m));
              start(m);
            }}
            className="flex-1 rounded-md border border-border/60 px-1 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {m}m
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          max={480}
          value={minutesInput}
          onChange={(e) => setMinutesInput(e.target.value)}
          disabled={running}
          aria-label="Custom minutes"
          className="w-16 rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring/20"
        />
        <div className="flex flex-1 items-center gap-1.5">
          {phase === 'idle' || phase === 'done' ? (
            <Button
              size="sm"
              className="flex-1 h-7 text-[11px]"
              onClick={() => start(Number(minutesInput) || 25)}
            >
              Start
            </Button>
          ) : running ? (
            <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px]" onClick={pause}>
              Pause
            </Button>
          ) : (
            <Button size="sm" className="flex-1 h-7 text-[11px]" onClick={resume}>
              Resume
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px]"
            onClick={() => {
              reset();
              setMinutesInput(String(Math.round(durationMs / 60_000)));
            }}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
