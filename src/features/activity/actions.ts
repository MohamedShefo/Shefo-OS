'use server';

import { createClient } from '@/utils/supabase/server';
import type { WorkspaceActivity } from '@/types/database';

async function authedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return { supabase, user };
}

export interface RecordActivityInput {
  workspaceId: string | null;
  cityLabel?: string | null;
  deviceLabel?: string | null;
  shareLocation?: boolean;
}

/**
 * Workspace presence (NOT security): last-seen + optional approximate
 * location. No continuous tracking — callers invoke this at most once per
 * shell load, and location is only stored with explicit opt-in consent.
 */
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    if (!input.workspaceId) return;
    const ctx = await authedUser();
    if (!ctx) return;
    const share = input.shareLocation === true;
    await ctx.supabase.from('workspace_activity').upsert(
      {
        workspace_id: input.workspaceId,
        user_id: ctx.user.id,
        last_seen_at: new Date().toISOString(),
        city_label: share ? (input.cityLabel ?? null) : null,
        device_label: input.deviceLabel ?? null,
        share_location: share,
      },
      { onConflict: 'workspace_id,user_id' }
    );
  } catch (err) {
    console.error('Failed to record activity:', err);
  }
}

export interface MemberActivity extends WorkspaceActivity {
  displayName: string | null;
}

/** Roster activity — RLS restricts this to self + workspace owner/admin. */
export async function getWorkspaceActivity(workspaceId: string): Promise<MemberActivity[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    const { data, error } = await ctx.supabase
      .from('workspace_activity')
      .select('*, profiles(display_name)')
      .eq('workspace_id', workspaceId)
      .order('last_seen_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Error fetching workspace activity:', error.message || error);
      return [];
    }
    return (
      (
        data as Array<
          WorkspaceActivity & { profiles: { display_name: string | null } | null }
        >
      )?.map((a) => ({
        id: a.id,
        workspace_id: a.workspace_id,
        user_id: a.user_id,
        last_seen_at: a.last_seen_at,
        // Location is only exposed when the member opted in.
        city_label: a.share_location ? a.city_label : null,
        device_label: a.device_label,
        share_location: a.share_location,
        updated_at: a.updated_at,
        displayName: a.profiles?.display_name ?? null,
      })) || []
    );
  } catch (err) {
    console.error('Unexpected error in getWorkspaceActivity:', err);
    return [];
  }
}
