'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Profile } from '@/types/database';
import { logSecurityEvent } from '@/features/security/events';

async function authedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return { supabase, user };
}

export async function getProfile(): Promise<Profile | null> {
  try {
    const ctx = await authedUser();
    if (!ctx) return null;
    const { data, error } = await ctx.supabase
      .from('profiles')
      .select('*')
      .eq('id', ctx.user.id)
      .maybeSingle();
    if (error) {
      console.error('Error fetching profile:', error.message || error);
      return null;
    }
    return (data as Profile) || null;
  } catch (err) {
    console.error('Unexpected error in getProfile:', err);
    return null;
  }
}

export async function ensureProfile(): Promise<Profile | null> {
  try {
    const existing = await getProfile();
    if (existing) return existing;
    const ctx = await authedUser();
    if (!ctx) return null;
    const { data, error } = await ctx.supabase
      .from('profiles')
      .insert({ id: ctx.user.id })
      .select('*')
      .single();
    if (error) {
      console.error('Error creating profile:', error);
      return null;
    }
    return (data as Profile) || null;
  } catch (err) {
    console.error('Unexpected error in ensureProfile:', err);
    return null;
  }
}

export async function updateProfile(payload: {
  display_name?: string | null;
  username?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const updateData: Record<string, unknown> = {};
    if (payload.display_name !== undefined) {
      updateData.display_name = payload.display_name?.trim() || null;
    }
    if (payload.username !== undefined) {
      const raw = payload.username ?? '';
      const handle = raw.trim().toLowerCase().replace(/^@/, '');
      if (handle && !/^[a-z0-9_]{3,30}$/.test(handle)) {
        return {
          success: false,
          error: 'Username must be 3–30 characters: letters, numbers, underscores',
        };
      }
      updateData.username = handle || null;
    }
    if (Object.keys(updateData).length === 0) return { success: true };
    // Ensure a row exists first (first-run profiles).
    await ctx.supabase.from('profiles').upsert({ id: ctx.user.id }, { onConflict: 'id' });
    const { error } = await ctx.supabase
      .from('profiles')
      .update(updateData)
      .eq('id', ctx.user.id);
    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'That username is already taken' };
      }
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
    await logSecurityEvent('profile.updated', {});
    revalidatePath('/profile');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in updateProfile:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export async function uploadAvatar(
  formData: FormData
): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const file = formData.get('avatar');
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: 'Choose an image file first' };
    }
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      return { success: false, error: 'Only PNG, JPEG, WebP, or GIF images are allowed' };
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return { success: false, error: 'Image must be smaller than 2 MB' };
    }
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'gif';
    const path = `${ctx.user.id}/avatar.${ext}`;
    const { error: uploadError } = await ctx.supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return { success: false, error: uploadError.message };
    }
    const {
      data: { publicUrl },
    } = ctx.supabase.storage.from('avatars').getPublicUrl(path);
    const versioned = `${publicUrl}?v=${Date.now()}`;
    await ctx.supabase.from('profiles').upsert({ id: ctx.user.id, avatar_url: versioned }, { onConflict: 'id' });
    await logSecurityEvent('profile.avatar_changed', {});
    revalidatePath('/profile');
    return { success: true, url: versioned };
  } catch (err) {
    console.error('Unexpected error in uploadAvatar:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function removeAvatar(): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const profile = await getProfile();
    if (profile?.avatar_url) {
      const marker = `/avatars/${ctx.user.id}/`;
      const idx = profile.avatar_url.indexOf(marker);
      if (idx >= 0) {
        const objectPath = profile.avatar_url.slice(idx + marker.length).split('?')[0];
        await ctx.supabase.storage.from('avatars').remove([`${ctx.user.id}/${objectPath}`]);
      }
    }
    await ctx.supabase.from('profiles').update({ avatar_url: null }).eq('id', ctx.user.id);
    await logSecurityEvent('profile.avatar_removed', {});
    revalidatePath('/profile');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in removeAvatar:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
