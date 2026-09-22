'use client';

import { useState, useTransition } from 'react';
import { Project, Skill } from '@/types/database';
import { updateProjectWork } from '@/features/projects/actions';
import { linkWorkSkill, unlinkWorkSkill } from '../actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WorkProjectManagerProps {
  workId: string;
  linkedProjects: Project[];
  allProjects: Project[];
}

export function WorkProjectManager({ workId, linkedProjects, allProjects }: WorkProjectManagerProps) {
  const [selected, setSelected] = useState('');
  const [isPending, startTransition] = useTransition();
  const unlinked = allProjects.filter((p) => p.work_experience_id !== workId);

  const attach = () => {
    if (!selected || isPending) return;
    const id = selected;
    setSelected('');
    startTransition(async () => {
      await updateProjectWork(id, workId);
    });
  };

  const detach = (id: string) => {
    startTransition(async () => {
      await updateProjectWork(id, null);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={isPending}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="">Attach a project…</option>
          {unlinked.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={attach} disabled={!selected || isPending} className="h-8 text-xs">
          Attach
        </Button>
      </div>
      {linkedProjects.length === 0 ? (
        <p className="text-xs text-muted-foreground">No linked projects yet.</p>
      ) : (
        <div className="space-y-2">
          {linkedProjects.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 text-xs"
            >
              <span className="font-medium text-foreground truncate">{p.name}</span>
              <span className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="capitalize">
                  {p.status}
                </Badge>
                <button
                  onClick={() => detach(p.id)}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Unlink
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface WorkSkillManagerProps {
  workId: string;
  linkedSkills: Skill[];
  allSkills: Skill[];
}

export function WorkSkillManager({ workId, linkedSkills, allSkills }: WorkSkillManagerProps) {
  const [selected, setSelected] = useState('');
  const [isPending, startTransition] = useTransition();
  const linkedIds = new Set(linkedSkills.map((s) => s.id));
  const unlinked = allSkills.filter((s) => !linkedIds.has(s.id));

  const attach = () => {
    if (!selected || isPending) return;
    const id = selected;
    setSelected('');
    startTransition(async () => {
      await linkWorkSkill(workId, id);
    });
  };

  const detach = (id: string) => {
    startTransition(async () => {
      await unlinkWorkSkill(workId, id);
    });
  };

  return (
    <div className="space-y-3">
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
        <p className="text-xs text-muted-foreground">No linked skills yet.</p>
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
