'use client';

import { useState, useTransition, FormEvent } from 'react';
import Link from 'next/link';
import { createWorkspace } from '../actions';
import type { WorkspaceWithRole } from '../actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';

export function WorkspaceList({ initialWorkspaces }: { initialWorkspaces: WorkspaceWithRole[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await createWorkspace(name);
      if (res.success) {
        setName('');
        setIsOpen(false);
      } else {
        setError(res.error || 'Failed to create workspace');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          My Workspaces
          <Badge variant="secondary">{initialWorkspaces.length}</Badge>
        </h2>
        <Button size="sm" onClick={() => setIsOpen(true)} className="font-medium">
          + New Workspace
        </Button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-semibold tracking-tight">New Workspace</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Workspace Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Family, Startup…"
                  required
                  disabled={isPending}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!name.trim() || isPending}>
                  {isPending ? 'Creating…' : 'Create Workspace'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {initialWorkspaces.length === 0 ? (
        <EmptyState
          title="No workspaces yet."
          description="Your personal workspace is created automatically on sign-in."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {initialWorkspaces.map((w) => (
            <Link
              key={w.id}
              href={`/workspaces/${w.id}`}
              className="rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-ring/40"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm text-foreground truncate">
                  {w.type === 'personal' ? '👤' : '🏢'} {w.name}
                </p>
                <Badge variant="secondary" className="capitalize shrink-0">
                  {w.role}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground capitalize">
                {w.type} workspace
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
