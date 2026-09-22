'use server';

import { createClient } from '@/utils/supabase/server';
import type { SecurityEvent } from '@/types/database';

/**
 * Append-only security log. Fire-and-forget: logging must never break the
 * action that triggered it, and there are no UPDATE/DELETE policies by design.
 */
export async function logSecurityEvent(
  eventType: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('security_events').insert({
      user_id: user.id,
      event_type: eventType,
      metadata,
    });
  } catch (err) {
    console.error('Failed to log security event:', err);
  }
}

export async function getSecurityEvents(limit = 50): Promise<SecurityEvent[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return [];
    const { data, error } = await supabase
      .from('security_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('Error fetching security events:', error.message || error);
      return [];
    }
    return (data as SecurityEvent[]) || [];
  } catch (err) {
    console.error('Unexpected error in getSecurityEvents:', err);
    return [];
  }
}
