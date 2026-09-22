'use client';

import { useState, useTransition, FormEvent } from 'react';
import { createSkill, deleteSkill } from '../actions';
import { Skill } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { SearchField } from '@/components/common/search-field';
import { matchesQuery } from '@/lib/search';

interface SkillListProps {
  initialSkills: Skill[];
  usageCounts: Record<string, { work: number; notes: number }>;
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20';

export function SkillList({ initialSkills, usageCounts }: SkillListProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = initialSkills.filter((s) =>
    matchesQuery([s.name, s.category, s.description], search)
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await createSkill({ name, category, description });
      if (res.success) {
        setName('');
        setCategory('');
        setDescription('');
        setIsOpen(false);
      } else {
        setError(res.error || 'Failed to create skill');
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteSkill(id);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2 px-1">
          Skills
          <Badge variant="secondary">{initialSkills.length}</Badge>
        </h2>
        <div className="flex items-center gap-2">
          <SearchField value={search} onChange={setSearch} placeholder="Search skills…" />
          <Button size="sm" onClick={() => setIsOpen(true)} className="font-medium shrink-0">
            + New Skill
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-semibold tracking-tight">New Skill</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Skill Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PostgreSQL, Technical Writing…"
                  required
                  disabled={isPending}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Category (Optional)
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Engineering, Language…"
                  disabled={isPending}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  disabled={isPending}
                  className={`${inputClass} resize-y`}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!name.trim() || isPending}>
                  {isPending ? 'Saving…' : 'Add Skill'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {initialSkills.length === 0 ? (
        <EmptyState
          title="No skills yet."
          description='Click "+ New Skill" to start your skill inventory.'
        />
      ) : visible.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          No skills match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visible.map((s) => {
            const usage = usageCounts[s.id] ?? { work: 0, notes: 0 };
            return (
              <div
                key={s.id}
                className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs hover:border-ring/40 transition-all"
              >
                <div className="space-y-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">🧠 {s.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {[s.category, usage.work > 0 ? `${usage.work} workplace${usage.work === 1 ? '' : 's'}` : null, usage.notes > 0 ? `${usage.notes} note${usage.notes === 1 ? '' : 's'}` : null]
                      .filter(Boolean)
                      .join(' · ') || 'Not linked yet'}
                  </p>
                  {s.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(s.id)}
                  disabled={isPending}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive shrink-0"
                >
                  Archive
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
