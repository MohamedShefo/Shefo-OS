'use client';

import { useState, useTransition, FormEvent } from 'react';
import {
  addWorkspaceMember,
  changeMemberRole,
  removeWorkspaceMember,
  updateWorkspace,
} from '../actions';
import type { WorkspaceMember } from '../actions';
import type { WorkspaceRole } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MemberManagerProps {
  workspaceId: string;
  members: WorkspaceMember[];
  myRole: string;
  myUserId: string;
}

/** Roster management — destructive/privileged actions stay owner/admin-gated server-side. */
export function MemberManager({ workspaceId, members, myRole, myUserId }: MemberManagerProps) {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('member');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canManage = myRole === 'owner' || myRole === 'admin';

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await addWorkspaceMember(workspaceId, userId.trim(), role);
      if (res.success) {
        setUserId('');
      } else {
        setError(res.error || 'Could not add member');
      }
    });
  };

  const handleRole = (uid: string, next: WorkspaceRole) => {
    startTransition(async () => {
      const res = await changeMemberRole(workspaceId, uid, next);
      if (!res.success) setError(res.error || 'Could not change role');
    });
  };

  const handleRemove = (uid: string) => {
    startTransition(async () => {
      const res = await removeWorkspaceMember(workspaceId, uid);
      if (!res.success) setError(res.error || 'Could not remove member');
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
      <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
        Members
        <Badge variant="secondary">{members.length}</Badge>
      </h2>

      {canManage && (
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Member user ID…"
            disabled={isPending}
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as WorkspaceRole)}
            disabled={isPending}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <Button type="submit" size="sm" disabled={!userId.trim() || isPending} className="h-8">
            Add
          </Button>
        </form>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-3 text-xs"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">
                {m.displayName || 'Member'}
                {m.user_id === myUserId && (
                  <span className="text-muted-foreground font-normal"> (you)</span>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono truncate">{m.user_id}</p>
            </div>
            <span className="flex items-center gap-1.5 shrink-0">
              {canManage && m.user_id !== myUserId ? (
                <select
                  value={m.role}
                  onChange={(e) => handleRole(m.user_id, e.target.value as WorkspaceRole)}
                  disabled={isPending}
                  aria-label={`Role for ${m.displayName || m.user_id}`}
                  className="rounded bg-muted px-2 py-1 text-[11px] font-medium outline-none cursor-pointer border border-border/50 capitalize"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner" disabled>
                    Owner
                  </option>
                </select>
              ) : (
                <Badge variant="secondary" className="capitalize">
                  {m.role}
                </Badge>
              )}
              {(canManage || m.user_id === myUserId) && m.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(m.user_id)}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive"
                >
                  {m.user_id === myUserId ? 'Leave' : 'Remove'}
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface WorkspaceSettingsProps {
  workspaceId: string;
  name: string;
  isOwner: boolean;
}

export function WorkspaceSettings({ workspaceId, name, isOwner }: WorkspaceSettingsProps) {
  const [editName, setEditName] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOwner) return null;

  const handleSave = () => {
    if (!editName.trim() || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await updateWorkspace(workspaceId, { name: editName });
      if (res.success) {
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        setError(res.error || 'Could not save settings');
      }
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">Settings</h2>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          disabled={isPending}
          aria-label="Workspace name"
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
        />
        <Button size="sm" onClick={handleSave} disabled={isPending || !editName.trim()} className="h-8">
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {savedAt && <p className="text-[11px] text-muted-foreground">✓ Saved at {savedAt}</p>}
      <p className="text-[11px] text-muted-foreground">
        Only the workspace owner can change settings. Ownership transfer is not
        self-service in this phase.
      </p>
    </div>
  );
}
