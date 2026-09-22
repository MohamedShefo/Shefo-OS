'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Notification } from '@/types/database';

async function authedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return { supabase, user };
}

export async function getUnreadCount(): Promise<number> {
  try {
    const ctx = await authedUser();
    if (!ctx) return 0;
    const { count, error } = await ctx.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.user.id)
      .is('read_at', null)
      .is('deleted_at', null);
    if (error) {
      console.error('Error counting notifications:', error.message || error);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error('Unexpected error in getUnreadCount:', err);
    return 0;
  }
}

export async function getRecentNotifications(limit = 20): Promise<Notification[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    const { data, error } = await ctx.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('Error fetching notifications:', error.message || error);
      return [];
    }
    return (data as Notification[]) || [];
  } catch (err) {
    console.error('Unexpected error in getRecentNotifications:', err);
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<{ success: boolean }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false };
    await ctx.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', ctx.user.id);
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in markNotificationRead:', err);
    return { success: false };
  }
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false };
    await ctx.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', ctx.user.id)
      .is('read_at', null)
      .is('deleted_at', null);
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in markAllNotificationsRead:', err);
    return { success: false };
  }
}

/**
 * Explicit creation helper for future server-side producers
 * (reminders, shares, system notices). No automation calls this yet.
 */
export async function createNotification(input: {
  userId: string;
  type?: string;
  title: string;
  body?: string | null;
  linkHref?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const title = input.title.trim();
    if (!title) return { success: false, error: 'Title is required' };
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    // Users may only create notifications for themselves; cross-user
    // delivery stays a future, explicitly-authorized feature.
    if (input.userId !== ctx.user.id) {
      return { success: false, error: 'Cannot create notifications for other users' };
    }
    const { error } = await ctx.supabase.from('notifications').insert({
      user_id: ctx.user.id,
      type: input.type?.trim() || 'info',
      title,
      body: input.body?.trim() || null,
      link_href: input.linkHref?.trim() || null,
    });
    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in createNotification:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
