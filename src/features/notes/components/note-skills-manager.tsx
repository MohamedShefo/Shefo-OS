'use client';

import { useState, useTransition } from 'react';
import { linkNoteSkill, unlinkNoteSkill } from '@/features/skills/actions';
import { Skill } from '@/types/database';
import { Button } from '@/components/ui/button';

interface NoteSkillsManagerProps {
  noteId: string;
  linkedSkills: Skill[];
  allSkills: Skill[];
}

export function NoteSkillsManager({ noteId, linkedSkills, allSkills }: NoteSkillsManagerProps) {
  const [selected, setSelected] = useState('');
  const [isPending, startTransition] = useTransition();
  const linkedIds = new Set(linkedSkills.map((s) => s.id));
  const unlinked = allSkills.filter((s) => !linkedIds.has(s.id));

  const attach = () => {
    if (!selected || isPending) return;
    const id = selected;
    setSelected('');
    startTransition(async () => {
      await linkNoteSkill(noteId, id);
    });
  };

  const detach = (id: string) => {
    startTransition(async () => {
      await unlinkNoteSkill(noteId, id);
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Skills ({linkedSkills.length})
      </h3>
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={isPending}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="">Link a skill…</option>
          {unlinked.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.category ? ` · ${s.category}` : ''}
            </option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={attach} disabled={!selected || isPending} className="h-8 text-xs">
          Link
        </Button>
      </div>
      {linkedSkills.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No skills linked to this note.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {linkedSkills.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground"
            >
              🧠 {s.name}
              <button
                onClick={() => detach(s.id)}
                disabled={isPending}
                aria-label={`Unlink ${s.name}`}
                className="text-muted-foreground hover:text-destructive"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
