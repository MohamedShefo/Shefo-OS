'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Membership, Workspace, WorkspaceRole } from '@/types/database';
import { logSecurityEvent } from '@/features/security/events';

import { WORKSPACE_COOKIE } from '@/lib/cookies';

async function authedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return { supabase, user };
}

export interface WorkspaceWithRole extends Workspace {
  role: string;
}

/** Workspaces the user belongs to (membership-gated server-side). */
export async function getMyWorkspaces(): Promise<WorkspaceWithRole[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    const { data, error } = await ctx.supabase
      .from('memberships')
      .select('role, workspaces(*)')
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error fetching workspaces:', error.message || error);
      return [];
    }
    const out: WorkspaceWithRole[] = [];
    for (const row of (data as Array<{ role: string; workspaces: Workspace | Workspace[] | null }>) || []) {
      const w = Array.isArray(row.workspaces) ? (row.workspaces[0] ?? null) : row.workspaces;
      if (w && !w.deleted_at && w.is_active) out.push({ ...w, role: row.role });
    }
    return out;
  } catch (err) {
    console.error('Unexpected error in getMyWorkspaces:', err);
    return [];
  }
}

export async function getCurrentWorkspaceId(): Promise<string | null> {
  const store = await cookies();
  return store.get(WORKSPACE_COOKIE)?.value ?? null;
}

export async function setCurrentWorkspace(id: string | null): Promise<void> {
  const store = await cookies();
  if (!id) {
    store.delete(WORKSPACE_COOKIE);
    return;
  }
  // Only allow switching to a workspace the user actually belongs to.
  const mine = await getMyWorkspaces();
  if (mine.some((w) => w.id === id)) {
    store.set(WORKSPACE_COOKIE, id, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  }
}

/** Ensure the user has a personal workspace (idempotent read-first). */
export async function ensurePersonalWorkspace(): Promise<string | null> {
  try {
    const ctx = await authedUser();
    if (!ctx) return null;
    const { data: existing } = await ctx.supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', ctx.user.id)
      .eq('type', 'personal')
      .is('deleted_at', null)
      .limit(1);
    if (existing && existing.length > 0) return (existing[0] as { id: string }).id;

    const { data: created, error: createError } = await ctx.supabase
      .from('workspaces')
      .insert({ owner_id: ctx.user.id, name: 'Personal', type: 'personal' })
      .select('id')
      .single();
    if (createError || !created) {
      console.error('Error creating personal workspace:', createError);
      return null;
    }
    const wid = (created as { id: string }).id;
    await ctx.supabase.from('memberships').insert({
      workspace_id: wid,
      user_id: ctx.user.id,
      role: 'owner',
    });
    return wid;
  } catch (err) {
    console.error('Unexpected error in ensurePersonalWorkspace:', err);
    return null;
  }
}

export async function createWorkspace(
  name: string
): Promise<{ success: boolean; error?: string; data?: Workspace }> {
  try {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: 'Workspace name is required' };
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { data, error } = await ctx.supabase
      .from('workspaces')
      .insert({ owner_id: ctx.user.id, name: trimmed, type: 'shared' })
      .select('*')
      .single();
    if (error || !data) {
      console.error('Error creating workspace:', error);
      return { success: false, error: error?.message ?? 'Failed to create workspace' };
    }
    const ws = data as Workspace;
    await ctx.supabase.from('memberships').insert({
      workspace_id: ws.id,
      user_id: ctx.user.id,
      role: 'owner',
    });
    await logSecurityEvent('workspace.created', { workspace_id: ws.id, name: trimmed });
    revalidatePath('/workspaces');
    return { success: true, data: ws };
  } catch (err) {
    console.error('Unexpected error in createWorkspace:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getWorkspaceById(id: string): Promise<WorkspaceWithRole | null> {
  try {
    const ctx = await authedUser();
    if (!ctx) return null;
    const { data: ws, error } = await ctx.supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error || !ws) return null;
    const w = ws as Workspace;
    // Membership/ownership enforced by RLS; resolve the caller's role explicitly.
    const { data: mem } = await ctx.supabase
      .from('memberships')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    const role = (mem as { role: string } | null)?.role ?? (w.owner_id === ctx.user.id ? 'owner' : null);
    if (!role) return null;
    return { ...w, role };
  } catch (err) {
    console.error('Unexpected error in getWorkspaceById:', err);
    return null;
  }
}

export interface WorkspaceMember extends Membership {
  displayName: string | null;
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    // NOTE: no FK exists between memberships.user_id and profiles.id (profiles
    // are app-provisioned lazily), so PostgREST cannot embed profiles here.
    // Display names resolve via a second owner-scoped query instead.
    const { data, error } = await ctx.supabase
      .from('memberships')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('joined_at', { ascending: true });
    if (error) {
      console.error('Error fetching members:', error.message || error);
      return [];
    }
    const rows = (data as Membership[]) || [];
    const ids = [...new Set(rows.map((m) => m.user_id))];
    let names: Record<string, string | null> = {};
    if (ids.length > 0) {
      const { data: profiles } = await ctx.supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', ids);
      names = Object.fromEntries(
        ((profiles as Array<{ id: string; display_name: string | null }>) || []).map((p) => [
          p.id,
          p.display_name,
        ])
      );
    }
    return rows.map((m) => ({
      id: m.id,
      workspace_id: m.workspace_id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      displayName: names[m.user_id] ?? null,
    }));
  } catch (err) {
    console.error('Unexpected error in getWorkspaceMembers:', err);
    return [];
  }
}

async function callerRole(workspaceId: string, userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();
  return (data as { role: string } | null)?.role ?? null;
}

export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole = 'member'
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const mine = await callerRole(workspaceId, ctx.user.id);
    if (mine !== 'owner' && mine !== 'admin') {
      return { success: false, error: 'Only owners or admins can add members' };
    }
    if (!['admin', 'member'].includes(role)) {
      return { success: false, error: 'Only admin or member roles can be granted' };
    }
    const { error } = await ctx.supabase.from('memberships').insert({
      workspace_id: workspaceId,
      user_id: userId,
      role,
    });
    if (error) {
      console.error('Error adding member:', error);
      return { success: false, error: error.message };
    }
    await logSecurityEvent('workspace.member_added', { workspace_id: workspaceId, role });
    revalidatePath(`/workspaces/${workspaceId}`);
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in addWorkspaceMember:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function changeMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const mine = await callerRole(workspaceId, ctx.user.id);
    if (mine !== 'owner' && mine !== 'admin') {
      return { success: false, error: 'Only owners or admins can change roles' };
    }
    if (role !== 'member' && role !== 'admin') {
      return { success: false, error: 'Role must be admin or member' };
    }
    // Never strand a workspace without an owner.
    const { data: owners } = await ctx.supabase
      .from('memberships')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner');
    const ownerIds = ((owners as Array<{ user_id: string }>) || []).map((o) => o.user_id);
    if (ownerIds.includes(userId) && ownerIds.length <= 1) {
      return { success: false, error: 'A workspace must keep at least one owner' };
    }
    const { error } = await ctx.supabase
      .from('memberships')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);
    if (error) {
      console.error('Error changing role:', error);
      return { success: false, error: error.message };
    }
    await logSecurityEvent('workspace.role_changed', { workspace_id: workspaceId, role });
    revalidatePath(`/workspaces/${workspaceId}`);
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in changeMemberRole:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const mine = await callerRole(workspaceId, ctx.user.id);
    const selfLeave = userId === ctx.user.id;
    if (!selfLeave && mine !== 'owner' && mine !== 'admin') {
      return { success: false, error: 'Only owners or admins can remove members' };
    }
    // Owners cannot remove themselves while they are the last owner.
    const { data: owners } = await ctx.supabase
      .from('memberships')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner');
    const ownerIds = ((owners as Array<{ user_id: string }>) || []).map((o) => o.user_id);
    if (selfLeave && mine === 'owner' && ownerIds.length <= 1) {
      // Leaving deletes nothing else, but a workspace needs its owner record path:
      // allow leave only if another owner exists.
      return { success: false, error: 'Transfer ownership before leaving' };
    }
    const { error } = await ctx.supabase
      .from('memberships')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);
    if (error) {
      console.error('Error removing member:', error);
      return { success: false, error: error.message };
    }
    await logSecurityEvent('workspace.member_removed', { workspace_id: workspaceId });
    revalidatePath(`/workspaces/${workspaceId}`);
    revalidatePath('/workspaces');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in removeWorkspaceMember:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateWorkspace(
  id: string,
  payload: { name?: string; is_active?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const updateData: Record<string, unknown> = {};
    if (payload.name !== undefined) {
      if (!payload.name.trim()) return { success: false, error: 'Name is required' };
      updateData.name = payload.name.trim();
    }
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;
    if (Object.keys(updateData).length === 0) return { success: true };
    // Owner-only enforced by RLS; role pre-check gives a clear error.
    const mine = await callerRole(id, ctx.user.id);
    if (mine !== 'owner') {
      return { success: false, error: 'Only the workspace owner can change settings' };
    }
    const { error } = await ctx.supabase.from('workspaces').update(updateData).eq('id', id);
    if (error) {
      console.error('Error updating workspace:', error);
      return { success: false, error: error.message };
    }
    revalidatePath(`/workspaces/${id}`);
    revalidatePath('/workspaces');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in updateWorkspace:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
