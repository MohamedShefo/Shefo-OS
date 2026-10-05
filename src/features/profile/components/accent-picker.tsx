'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'shefo:accent';

const PRESETS = [
  { name: 'Default', value: null },
  { name: 'Blue', value: 'oklch(0.5 0.2 250)' },
  { name: 'Green', value: 'oklch(0.5 0.2 150)' },
  { name: 'Purple', value: 'oklch(0.5 0.2 300)' },
  { name: 'Orange', value: 'oklch(0.6 0.15 50)' },
  { name: 'Red', value: 'oklch(0.5 0.2 25)' },
] as const;

export function AccentPicker() {
  // Lazy init: restore saved accent before first paint (no effect needed).
  const [selected, setSelected] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        document.documentElement.style.setProperty('--primary', saved);
        return saved;
      }
    } catch {
      // storage unavailable
    }
    return null;
  });

  const apply = (value: string | null) => {
    try {
      if (value) {
        document.documentElement.style.setProperty('--primary', value);
        localStorage.setItem(STORAGE_KEY, value);
      } else {
        document.documentElement.style.removeProperty('--primary');
        localStorage.removeItem(STORAGE_KEY);
      }
      setSelected(value);
    } catch {
      // storage unavailable
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">Accent Color</h2>
      <div className="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label="Accent color">
        {PRESETS.map((p) => {
          const isActive = p.value === selected;
          return (
            <button
              key={p.name}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={p.name}
              title={p.name}
              onClick={() => apply(p.value)}
              className={cn(
                'h-8 w-8 rounded-full border-2 transition-all',
                isActive
                  ? 'border-foreground scale-110'
                  : 'border-border hover:border-muted-foreground'
              )}
              style={{
                backgroundColor: p.value ?? 'var(--primary)',
              }}
            />
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Applies to primary buttons, links, and highlights. Saved on this device.
      </p>
    </section>
  );
}
