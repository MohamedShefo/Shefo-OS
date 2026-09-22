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
  latitude?: number | null;
  longitude?: number | null;
  precision?: 'approximate' | 'exact' | null;
}

/**
 * Workspace presence (NOT security): last-seen + optional location.
 * Location is stored only with explicit opt-in consent; turning sharing off
 * clears stored coordinates. Consent timestamp is recorded on first share.
 */
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    if (!input.workspaceId) return;
    const ctx = await authedUser();
    if (!ctx) return;
    const share = input.shareLocation === true;
    const now = new Date().toISOString();

    const { data: existing } = await ctx.supabase
      .from('workspace_activity')
      .select('location_consent_at')
      .eq('workspace_id', input.workspaceId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    const prior = existing as { location_consent_at: string | null } | null;

    await ctx.supabase.from('workspace_activity').upsert(
      {
        workspace_id: input.workspaceId,
        user_id: ctx.user.id,
        last_seen_at: now,
        city_label: share ? (input.cityLabel ?? null) : null,
        device_label: input.deviceLabel ?? null,
        share_location: share,
        latitude: share ? (input.latitude ?? null) : null,
        longitude: share ? (input.longitude ?? null) : null,
        location_precision: share ? (input.precision ?? 'approximate') : null,
        location_consent_at: share ? (prior?.location_consent_at ?? now) : (prior?.location_consent_at ?? null),
        location_updated_at: share ? now : null,
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
        latitude: a.share_location ? a.latitude : null,
        longitude: a.share_location ? a.longitude : null,
        location_precision: a.share_location ? a.location_precision : null,
        location_consent_at: a.location_consent_at,
        location_updated_at: a.share_location ? a.location_updated_at : null,
        updated_at: a.updated_at,
        displayName: a.profiles?.display_name ?? null,
      })) || []
    );
  } catch (err) {
    console.error('Unexpected error in getWorkspaceActivity:', err);
    return [];
  }
}
