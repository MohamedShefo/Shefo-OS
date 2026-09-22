'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { logSecurityEvent } from './events';

export async function changePassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'User is not authenticated' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { success: false, error: error.message };
    }
    await logSecurityEvent('security.password_changed', {});
    revalidatePath('/security');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in changePassword:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export interface SessionInfo {
  expiresAt: number | null;
  assurance: string | null;
}

/** Read-only view of the current session for the security page. */
export async function getSessionInfo(): Promise<SessionInfo | null> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;
    let assurance: string | null = null;
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      assurance = data?.currentLevel ?? null;
    } catch {
      // MFA status unavailable — session info still useful
    }
    return { expiresAt: session.expires_at ?? null, assurance };
  } catch (err) {
    console.error('Unexpected error in getSessionInfo:', err);
    return null;
  }
}
