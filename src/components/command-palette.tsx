'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NAV_ITEMS } from '@/config/navigation';
import { globalSearch, type SearchResult } from '@/features/search/actions';
import { createCapture } from '@/features/captures/actions';

export const PALETTE_EVENT = 'shefo:palette';

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT));
}

const ENTITY_ICON: Record<SearchResult['entityType'], string> = {
  capture: '📥',
  note: '📝',
  project: '📁',
  task: '✅',
  work: '💼',
  skill: '🧠',
  journal: '📔',
  habit: '🔁',
};

const ENTITY_LABEL: Record<SearchResult['entityType'], string> = {
  capture: 'Capture',
  note: 'Note',
  project: 'Project',
  task: 'Task',
  work: 'Work',
  skill: 'Skill',
  journal: 'Journal',
  habit: 'Habit',
};

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  run: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);
  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setSearchError(false);
    setActiveIndex(0);
    setCaptured(false);
  }, []);

  useEffect(() => {
    const onEvent = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener(PALETTE_EVENT, onEvent);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(PALETTE_EVENT, onEvent);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open ]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const id = ++requestId.current;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await globalSearch(q);
        if (requestId.current === id) {
          setResults(res);
          setSearchError(false);
        }
      } catch {
        if (requestId.current === id) setSearchError(true);
      } finally {
        if (requestId.current === id) setSearching(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const queryActive = query.trim().length >= 2;
  const visibleResults = queryActive ? results : [];
  const showSearching = searching && queryActive;

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  const quickCapture = useCallback(async () => {
    const text = query.trim();
    if (!text || capturing) return;
    setCapturing(true);
    try {
      const res = await createCapture(text);
      if (res.success) {
        setCaptured(true);
        setQuery('');
        setResults([]);
        setTimeout(close, 700);
      }
    } finally {
      setCapturing(false);
    }
  }, [query, capturing, close]);

  const navCommands: CommandItem[] = NAV_ITEMS.map((item) => ({
    id: `nav-${item.id}`,
    label: `Go to ${item.label}`,
    hint: item.href,
    icon: item.icon,
    run: () => go(item.href),
  }));

  const createCommands: CommandItem[] = [
    { id: 'new-capture', label: 'New Capture', hint: '/capture', icon: '⚡', run: () => go('/capture') },
    { id: 'new-project', label: 'New Project', hint: '/projects', icon: '📁', run: () => go('/projects') },
    { id: 'new-note', label: 'New Note', hint: '/notes', icon: '📝', run: () => go('/notes') },
    { id: 'new-task', label: 'New Task', hint: '/tasks', icon: '✅', run: () => go('/tasks') },
    { id: 'new-work', label: 'New Workplace', hint: '/work', icon: '💼', run: () => go('/work') },
    { id: 'new-skill', label: 'New Skill', hint: '/skills', icon: '🧠', run: () => go('/skills') },
    { id: 'new-journal', label: "Today's Journal", hint: '/journal', icon: '📔', run: () => go('/journal') },
    { id: 'new-habit', label: 'New Habit', hint: '/habits', icon: '🔁', run: () => go('/habits') },
  ];

  const q = query.trim().toLowerCase();
  const matchedCommands = [...createCommands, ...navCommands].filter(
    (c) => !q || c.label.toLowerCase().includes(q)
  );

  type Row =
    | { kind: 'capture'; label: string }
    | { kind: 'command'; command: CommandItem }
    | { kind: 'result'; result: SearchResult };

  const rows: Row[] = [];
  if (query.trim()) {
    rows.push({ kind: 'capture', label: `Capture "${query.trim().slice(0, 60)}"` });
  }
  for (const c of matchedCommands.slice(0, query.trim() ? 4 : 8)) {
    rows.push({ kind: 'command', command: c });
  }
  for (const r of visibleResults) {
    rows.push({ kind: 'result', result: r });
  }

  const clampedIndex = rows.length === 0 ? 0 : Math.min(activeIndex, rows.length - 1);

  const activate = (row: Row) => {
    if (row.kind === 'capture') void quickCapture();
    else if (row.kind === 'command') row.command.run();
    else go(row.result.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (rows.length === 0 ? 0 : (i + 1) % rows.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (rows.length === 0 ? 0 : (i - 1 + rows.length) % rows.length));
    } else if (e.key === 'Enter') {
      const row = rows[clampedIndex];
      if (row) activate(row);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 pt-[12vh] animate-in fade-in duration-150"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-lg animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <span className="text-sm text-muted-foreground" aria-hidden="true">
            ⌘
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setResults([]);
              setSearching(false);
              setSearchError(false);
              setActiveIndex(0);
              setCaptured(false);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search everything, or type to capture…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search or command"
          />
          {showSearching && (
            <span className="text-[11px] text-muted-foreground animate-pulse">Searching…</span>
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2" role="listbox" aria-label="Results">
          {captured && (
            <p className="px-3 py-2 text-xs text-muted-foreground">✓ Captured to inbox.</p>
          )}
          {searchError && (
            <p className="px-3 py-2 text-xs text-destructive">
              Search failed. Check your connection and try again.
            </p>
          )}
          {rows.length === 0 && !showSearching && !searchError && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {query.trim()
                ? 'No matches. Press Enter to capture this thought.'
                : 'Type to search captures, notes, projects, and tasks.'}
            </p>
          )}
          {rows.map((row, i) => {
            const key =
              row.kind === 'capture'
                ? 'quick-capture'
                : row.kind === 'command'
                  ? row.command.id
                  : `${row.result.entityType}-${row.result.id}`;
            const active = i === clampedIndex;
            return (
              <button
                key={key}
                role="option"
                aria-selected={active}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => activate(row)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-xs transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
                }`}
              >
                <span className="text-sm shrink-0" aria-hidden="true">
                  {row.kind === 'capture'
                    ? '⚡'
                    : row.kind === 'command'
                      ? row.command.icon
                      : ENTITY_ICON[row.result.entityType]}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-medium">
                    {row.kind === 'capture'
                      ? row.label
                      : row.kind === 'command'
                        ? row.command.label
                        : row.result.title}
                  </span>
                  {(row.kind === 'command' || row.kind === 'result') && (
                    <span
                      className={`block truncate text-[11px] ${
                        active ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {row.kind === 'command'
                        ? row.command.hint
                        : `${ENTITY_LABEL[row.result.entityType]} · ${row.result.snippet ?? 'recently updated'}`}
                    </span>
                  )}
                </span>
                {row.kind === 'result' && (
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                      active
                        ? 'border-primary-foreground/30 text-primary-foreground'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {ENTITY_LABEL[row.result.entityType]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          <span>
            <kbd className="rounded bg-muted px-1 font-mono">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="rounded bg-muted px-1 font-mono">↵</kbd> open
          </span>
          <span>
            <kbd className="rounded bg-muted px-1 font-mono">esc</kbd> close
          </span>
          <span className="ms-auto">
            <kbd className="rounded bg-muted px-1 font-mono">⌘K</kbd> toggle
          </span>
        </div>
      </div>
    </div>
  );
}
