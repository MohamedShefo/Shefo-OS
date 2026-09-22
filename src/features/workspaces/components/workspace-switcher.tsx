'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setCurrentWorkspace, type WorkspaceWithRole } from '@/features/workspaces/actions';

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceWithRole[];
  currentId: string | null;
}

export function WorkspaceSwitcher({ workspaces, currentId }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (workspaces.length === 0) return null;

  const handleChange = (id: string) => {
    startTransition(async () => {
      await setCurrentWorkspace(id === '__all__' ? null : id);
      router.refresh();
    });
  };

  return (
    <label className="block space-y-1">
      <span className="px-2 text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
        Workspace
      </span>
      <select
        value={currentId ?? '__all__'}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-medium outline-none cursor-pointer focus:ring-2 focus:ring-ring/20"
      >
        <option value="__all__">🌐 All workspaces</option>
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.type === 'personal' ? '👤' : '🏢'} {w.name} · {w.role}
          </option>
        ))}
      </select>
    </label>
  );
}
