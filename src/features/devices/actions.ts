'use server';

import { cookies, headers } from 'next/headers';
import { createHash, randomUUID } from 'crypto';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import type { TrustedDevice } from '@/types/database';
import { logSecurityEvent } from '@/features/security/events';

import { DEVICE_COOKIE } from '@/lib/cookies';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const LAST_SEEN_REFRESH_MS = 60 * 60 * 1000;

async function authedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return { supabase, user };
}

function fingerprint(deviceId: string, userId: string): string {
  // Store only a hash — never the raw cookie value or IP.
  return createHash('sha256').update(`${userId}:${deviceId}:shefo-v1`).digest('hex');
}

function deviceLabelFromUA(ua: string): string {
  const mobile = /android|iphone|ipad|mobile/i.test(ua);
  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  return `${mobile ? 'Mobile' : 'Desktop'} · ${browser}`;
}

export interface CurrentDevice {
  device: TrustedDevice | null;
  deviceId: string;
}

/**
 * Identify this browser (stable random cookie id) and register/refresh its
 * device row. New devices start UNTRUSTED — trust requires explicit user
 * confirmation (password re-entry), never IP matching.
 */
export async function ensureDevice(): Promise<CurrentDevice | null> {
  try {
    const ctx = await authedUser();
    if (!ctx) return null;
    const store = await cookies();
    let deviceId = store.get(DEVICE_COOKIE)?.value;
    if (!deviceId) {
      deviceId = randomUUID();
      store.set(DEVICE_COOKIE, deviceId, {
        path: '/',
        maxAge: ONE_YEAR_SECONDS,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
    const hash = fingerprint(deviceId, ctx.user.id);
    const ua = (await headers()).get('user-agent') ?? '';
    const label = deviceLabelFromUA(ua);

    const { data: existing } = await ctx.supabase
      .from('trusted_devices')
      .select('*')
      .eq('user_id', ctx.user.id)
      .eq('device_hash', hash)
      .maybeSingle();
    const row = existing as TrustedDevice | null;
    if (!row) {
      const { data: created } = await ctx.supabase
        .from('trusted_devices')
        .insert({ user_id: ctx.user.id, device_label: label, device_hash: hash, trusted: false })
        .select('*')
        .single();
      await logSecurityEvent('device.seen_new', { trusted: false });
      return { device: (created as TrustedDevice) ?? null, deviceId };
    }
    // Refresh last_seen at most hourly — no per-request write storms.
    if (Date.now() - new Date(row.last_seen_at).getTime() > LAST_SEEN_REFRESH_MS) {
      const stamped = new Date().toISOString();
      await ctx.supabase
        .from('trusted_devices')
        .update({ last_seen_at: stamped, device_label: label })
        .eq('id', row.id)
        .eq('user_id', ctx.user.id);
      return { device: { ...row, last_seen_at: stamped, device_label: label }, deviceId };
    }
    return { device: row, deviceId };
  } catch (err) {
    console.error('Unexpected error in ensureDevice:', err);
    return null;
  }
}

export async function getDevices(): Promise<TrustedDevice[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    const { data, error } = await ctx.supabase
      .from('trusted_devices')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('last_seen_at', { ascending: false });
    if (error) {
      console.error('Error fetching devices:', error.message || error);
      return [];
    }
    return (data as TrustedDevice[]) || [];
  } catch (err) {
    console.error('Unexpected error in getDevices:', err);
    return [];
  }
}

/**
 * Step-up: trust the current device only after the user re-enters their
 * password (native Supabase re-authentication — no custom OTP crypto).
 */
export async function trustCurrentDevice(
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const email = ctx.user.email;
    if (!email) return { success: false, error: 'No email on this account' };
    const { error: authError } = await ctx.supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      await logSecurityEvent('device.trust_failed', {});
      return { success: false, error: 'Password did not match — device not trusted' };
    }
    const current = await ensureDevice();
    if (!current?.device) return { success: false, error: 'Could not identify this device' };
    const { error } = await ctx.supabase
      .from('trusted_devices')
      .update({ trusted: true, last_seen_at: new Date().toISOString() })
      .eq('id', current.device.id)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error trusting device:', error);
      return { success: false, error: error.message };
    }
    await logSecurityEvent('device.trusted', {});
    revalidatePath('/security');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in trustCurrentDevice:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function revokeDevice(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase
      .from('trusted_devices')
      .delete()
      .eq('id', id)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error revoking device:', error);
      return { success: false, error: error.message };
    }
    await logSecurityEvent('device.revoked', {});
    revalidatePath('/security');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in revokeDevice:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
