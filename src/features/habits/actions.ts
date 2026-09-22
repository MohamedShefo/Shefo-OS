'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { todayISO } from '@/lib/date';
import { Habit, HabitCompletion } from '@/types/database';

async function authedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return { supabase, user };
}

export interface HabitWithProgress extends Habit {
  doneDates: string[];
  streak: number;
  doneToday: boolean;
}

function computeStreak(doneSet: Set<string>, today: string): number {
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00Z`);
  // Streak counts back from today (or yesterday if today is not done yet).
  if (!doneSet.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (doneSet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function getHabits(): Promise<HabitWithProgress[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    const today = todayISO();
    const [habitsRes, completionsRes] = await Promise.all([
      ctx.supabase
        .from('habits')
        .select('*')
        .eq('user_id', ctx.user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      ctx.supabase
        .from('habit_completions')
        .select('habit_id, completion_date')
        .eq('user_id', ctx.user.id)
        .order('completion_date', { ascending: false })
        .limit(500),
    ]);
    if (habitsRes.error) {
      console.error('Error fetching habits:', habitsRes.error.message || habitsRes.error);
      return [];
    }
    const byHabit = new Map<string, string[]>();
    for (const c of (completionsRes.data as HabitCompletion[]) || []) {
      const list = byHabit.get(c.habit_id) ?? [];
      list.push(c.completion_date);
      byHabit.set(c.habit_id, list);
    }
    return ((habitsRes.data as Habit[]) || []).map((h) => {
      const doneDates = byHabit.get(h.id) ?? [];
      const doneSet = new Set(doneDates);
      return {
        ...h,
        doneDates: doneDates.slice(0, 14),
        streak: computeStreak(doneSet, today),
        doneToday: doneSet.has(today),
      };
    });
  } catch (err) {
    console.error('Unexpected error in getHabits:', err);
    return [];
  }
}

export async function createHabit(payload: {
  name: string;
  description?: string | null;
  frequency?: string | null;
}): Promise<{ success: boolean; error?: string; data?: Habit }> {
  try {
    const name = payload.name.trim();
    if (!name) return { success: false, error: 'Habit name is required' };
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { data, error } = await ctx.supabase
      .from('habits')
      .insert({
        user_id: ctx.user.id,
        name,
        description: payload.description?.trim() || null,
        frequency: payload.frequency?.trim() || 'daily',
      })
      .select('*')
      .single();
    if (error) {
      console.error('Error creating habit:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/habits');
    return { success: true, data: data as Habit };
  } catch (err) {
    console.error('Unexpected error in createHabit:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function setHabitActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase
      .from('habits')
      .update({ is_active: isActive })
      .eq('id', id)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error updating habit:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/habits');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in setHabitActive:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteHabit(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase
      .from('habits')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error soft-deleting habit:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/habits');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in deleteHabit:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/** Toggle today's completion (idempotent insert / delete). */
export async function toggleHabitToday(
  habitId: string,
  done: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const today = todayISO();
    if (done) {
      const { error } = await ctx.supabase.from('habit_completions').upsert(
        { user_id: ctx.user.id, habit_id: habitId, completion_date: today },
        { onConflict: 'habit_id,completion_date' }
      );
      if (error) {
        console.error('Error completing habit:', error);
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await ctx.supabase
        .from('habit_completions')
        .delete()
        .eq('user_id', ctx.user.id)
        .eq('habit_id', habitId)
        .eq('completion_date', today);
      if (error) {
        console.error('Error uncompleting habit:', error);
        return { success: false, error: error.message };
      }
    }
    revalidatePath('/habits');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in toggleHabitToday:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
