'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type TimerPhase = 'idle' | 'running' | 'paused' | 'done';

export interface TimerState {
  durationMs: number;
  remainingMs: number;
  phase: TimerPhase;
}

interface PersistedTimer {
  durationMs: number;
  endsAt: number | null;
  remainingMs: number;
  phase: TimerPhase;
}

const STORAGE_KEY = 'shefo:timer';

/**
 * Reusable countdown engine. Time is derived from wall-clock timestamps
 * (not tick counting) so it stays accurate when tabs throttle timers.
 * Future connections (task deadlines, calendar events, reminders) can drive
 * `durationMs`/completion without changing this hook.
 */
export function useTimer(defaultMinutes = 25) {
  const [state, setState] = useState<TimerState>(() => {
    const fallback: TimerState = {
      durationMs: defaultMinutes * 60_000,
      remainingMs: defaultMinutes * 60_000,
      phase: 'idle',
    };
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const saved = JSON.parse(raw) as PersistedTimer;
      if (typeof saved.durationMs !== 'number' || saved.durationMs <= 0) return fallback;
      if (saved.phase === 'running' && typeof saved.endsAt === 'number') {
        const remaining = Math.max(0, saved.endsAt - Date.now());
        return {
          durationMs: saved.durationMs,
          remainingMs: remaining,
          phase: remaining > 0 ? 'running' : 'done',
        };
      }
      if (saved.phase === 'paused') {
        return { durationMs: saved.durationMs, remainingMs: saved.remainingMs, phase: 'paused' };
      }
      return fallback;
    } catch {
      return fallback;
    }
  });
  const endsAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const persist = useCallback((durationMs: number, remainingMs: number, phase: TimerPhase) => {
    try {
      const payload: PersistedTimer = {
        durationMs,
        remainingMs,
        phase,
        endsAt: phase === 'running' ? endsAtRef.current : null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // storage unavailable — timer still works in memory
    }
  }, []);

  const stopTicking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (endsAtRef.current === null) return;
    const remaining = Math.max(0, endsAtRef.current - Date.now());
    setState((s) => {
      const next = { ...s, remainingMs: remaining, phase: (remaining === 0 ? 'done' : s.phase) as TimerPhase };
      if (remaining === 0) {
        endsAtRef.current = null;
        stopTicking();
      }
      return next;
    });
  }, [stopTicking]);

  const startTicking = useCallback(() => {
    stopTicking();
    intervalRef.current = setInterval(tick, 250);
  }, [stopTicking, tick]);

  const start = useCallback(
    (minutes?: number) => {
      const durationMs = Math.max(1000, Math.round((minutes ?? state.durationMs / 60_000) * 60_000));
      endsAtRef.current = Date.now() + durationMs;
      setState({ durationMs, remainingMs: durationMs, phase: 'running' });
      persist(durationMs, durationMs, 'running');
      startTicking();
    },
    [state.durationMs, persist, startTicking]
  );

  const pause = useCallback(() => {
    if (endsAtRef.current === null) return;
    const remaining = Math.max(0, endsAtRef.current - Date.now());
    endsAtRef.current = null;
    stopTicking();
    setState((s) => {
      persist(s.durationMs, remaining, 'paused');
      return { ...s, remainingMs: remaining, phase: 'paused' };
    });
  }, [persist, stopTicking]);

  const resume = useCallback(() => {
    setState((s) => {
      if (s.phase !== 'paused') return s;
      endsAtRef.current = Date.now() + s.remainingMs;
      persist(s.durationMs, s.remainingMs, 'running');
      startTicking();
      return { ...s, phase: 'running' };
    });
  }, [persist, startTicking]);

  const reset = useCallback(() => {
    endsAtRef.current = null;
    stopTicking();
    setState((s) => {
      persist(s.durationMs, s.durationMs, 'idle');
      return { durationMs: s.durationMs, remainingMs: s.durationMs, phase: 'idle' };
    });
  }, [persist, stopTicking]);

  // Resume ticking for a timer restored as running (refs/interval only — no setState).
  useEffect(() => {
    if (state.phase !== 'running') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as PersistedTimer;
      if (typeof saved.endsAt === 'number' && saved.endsAt > Date.now()) {
        endsAtRef.current = saved.endsAt;
        startTicking();
      } else {
        endsAtRef.current = null;
      }
    } catch {
      endsAtRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, start, pause, resume, reset };
}

export function formatTimer(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes % 60)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}
