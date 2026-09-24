'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import type { CalendarEvent } from '@/types/database';

async function authedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return { supabase, user };
}

export interface CreateEventPayload {
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  is_all_day?: boolean;
}

export type UpdateEventPayload = CreateEventPayload;

export async function getEvents(from: string, to: string, query?: string): Promise<CalendarEvent[]> {
  try {
    if (!/^\d{4}-\d{2}-\d{2}/.test(from) || !/^\d{4}-\d{2}-\d{2}/.test(to)) return [];
    const ctx = await authedUser();
    if (!ctx) return [];
    let q = ctx.supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null)
      .gte('starts_at', from)
      .lte('starts_at', to);
    const term = query?.trim();
    if (term) {
      const pattern = `%${term.replace(/[%_\\]/g, '\\$&').replace(/[,()]/g, '')}%`;
      q = q.or(`title.ilike.${pattern},description.ilike.${pattern}`);
    }
    const { data, error } = await q
      .order('starts_at', { ascending: true })
      .limit(200);
    if (error) {
      console.error('Error fetching events:', error.message || error);
      return [];
    }
    return (data as CalendarEvent[]) || [];
  } catch (err) {
    console.error('Unexpected error in getEvents:', err);
    return [];
  }
}

export async function getUpcomingEvents(days = 7, limit = 20): Promise<CalendarEvent[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    const now = new Date();
    const to = new Date(now);
    to.setDate(now.getDate() + Math.max(1, Math.min(60, days)));
    const { data, error } = await ctx.supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null)
      .gte('starts_at', now.toISOString())
      .lte('starts_at', to.toISOString())
      .order('starts_at', { ascending: true })
      .limit(limit);
    if (error) {
      console.error('Error fetching upcoming events:', error.message || error);
      return [];
    }
    return (data as CalendarEvent[]) || [];
  } catch (err) {
    console.error('Unexpected error in getUpcomingEvents:', err);
    return [];
  }
}

function validateEvent(payload: CreateEventPayload): string | null {
  if (!payload.title.trim()) return 'Event title is required';
  if (Number.isNaN(Date.parse(payload.starts_at))) return 'Invalid start date';
  if (payload.ends_at) {
    if (Number.isNaN(Date.parse(payload.ends_at))) return 'Invalid end date';
    if (Date.parse(payload.ends_at) < Date.parse(payload.starts_at)) {
      return 'End must be after start';
    }
  }
  return null;
}

export async function createEvent(
  payload: CreateEventPayload
): Promise<{ success: boolean; error?: string; data?: CalendarEvent }> {
  try {
    const invalid = validateEvent(payload);
    if (invalid) return { success: false, error: invalid };
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { data, error } = await ctx.supabase
      .from('calendar_events')
      .insert({
        user_id: ctx.user.id,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        starts_at: new Date(payload.starts_at).toISOString(),
        ends_at: payload.ends_at ? new Date(payload.ends_at).toISOString() : null,
        is_all_day: payload.is_all_day ?? false,
      })
      .select('*')
      .single();
    if (error) {
      console.error('Error creating event:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/calendar');
    revalidatePath('/today');
    return { success: true, data: data as CalendarEvent };
  } catch (err) {
    console.error('Unexpected error in createEvent:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateEvent(
  id: string,
  payload: UpdateEventPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const invalid = validateEvent(payload);
    if (invalid) return { success: false, error: invalid };
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase
      .from('calendar_events')
      .update({
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        starts_at: new Date(payload.starts_at).toISOString(),
        ends_at: payload.ends_at ? new Date(payload.ends_at).toISOString() : null,
        is_all_day: payload.is_all_day ?? false,
      })
      .eq('id', id)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error updating event:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/calendar');
    revalidatePath('/today');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in updateEvent:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteEvent(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase
      .from('calendar_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error soft-deleting event:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/calendar');
    revalidatePath('/today');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in deleteEvent:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Schedule a task on the calendar (Task → Calendar integration).
 * Uses the task's due date as the event start (+1h default end).
 * Requires an owned, non-deleted task with a due date.
 */
export async function createEventFromTask(
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'User is not authenticated' };
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, description, due_date')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();
    if (fetchError || !task) {
      return { success: false, error: 'Task not found' };
    }
    const row = task as { title: string; description: string | null; due_date: string | null };
    if (!row.due_date) {
      return { success: false, error: 'Set a due date first' };
    }
    const start = new Date(row.due_date);
    if (Number.isNaN(start.getTime())) {
      return { success: false, error: 'Task due date is invalid' };
    }
    const { error } = await supabase.from('calendar_events').insert({
      user_id: user.id,
      title: row.title,
      description: row.description,
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + 3600000).toISOString(),
      is_all_day: false,
    });
    if (error) {
      console.error('Error scheduling task event:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/calendar');
    revalidatePath('/today');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in createEventFromTask:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
