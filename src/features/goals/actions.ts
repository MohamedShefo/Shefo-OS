'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Goal, GoalMilestone, GoalStatus, Habit, Note, Project, Task } from '@/types/database';

async function authedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return { supabase, user };
}

export interface CreateGoalPayload {
  title: string;
  description?: string | null;
  status?: GoalStatus;
  start_date?: string | null;
  target_date?: string | null;
  target_value?: number | null;
  current_value?: number | null;
}

export type UpdateGoalPayload = Partial<CreateGoalPayload>;

export async function getGoals(status?: GoalStatus | 'all'): Promise<Goal[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    let query = ctx.supabase
      .from('goals')
      .select('*')
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null);
    if (status && status !== 'all') query = query.eq('status', status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching goals:', error.message || error);
      return [];
    }
    return (data as Goal[]) || [];
  } catch (err) {
    console.error('Unexpected error in getGoals:', err);
    return [];
  }
}

export async function getGoalById(id: string): Promise<Goal | null> {
  try {
    const ctx = await authedUser();
    if (!ctx) return null;
    const { data, error } = await ctx.supabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null)
      .single();
    if (error) {
      console.error('Error fetching goal:', error.message || error);
      return null;
    }
    return (data as Goal) || null;
  } catch (err) {
    console.error('Unexpected error in getGoalById:', err);
    return null;
  }
}

export async function createGoal(
  payload: CreateGoalPayload
): Promise<{ success: boolean; error?: string; data?: Goal }> {
  try {
    const title = payload.title.trim();
    if (!title) return { success: false, error: 'Goal title is required' };
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { data, error } = await ctx.supabase
      .from('goals')
      .insert({
        user_id: ctx.user.id,
        title,
        description: payload.description?.trim() || null,
        status: payload.status || 'active',
        start_date: payload.start_date || null,
        target_date: payload.target_date || null,
        target_value: payload.target_value ?? null,
        current_value: payload.current_value ?? 0,
      })
      .select('*')
      .single();
    if (error) {
      console.error('Error creating goal:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/goals');
    revalidatePath('/');
    return { success: true, data: data as Goal };
  } catch (err) {
    console.error('Unexpected error in createGoal:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateGoal(
  id: string,
  payload: UpdateGoalPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const updateData: Record<string, unknown> = {};
    if (payload.title !== undefined) {
      if (!payload.title.trim()) return { success: false, error: 'Goal title is required' };
      updateData.title = payload.title.trim();
    }
    if (payload.description !== undefined) updateData.description = payload.description?.trim() || null;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.start_date !== undefined) updateData.start_date = payload.start_date || null;
    if (payload.target_date !== undefined) updateData.target_date = payload.target_date || null;
    if (payload.target_value !== undefined) updateData.target_value = payload.target_value;
    if (payload.current_value !== undefined) updateData.current_value = payload.current_value;
    if (Object.keys(updateData).length === 0) return { success: true };
    const { error } = await ctx.supabase
      .from('goals')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error updating goal:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/goals');
    revalidatePath(`/goals/${id}`);
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in updateGoal:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteGoal(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase
      .from('goals')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error soft-deleting goal:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/goals');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in deleteGoal:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export async function getGoalMilestones(goalId: string): Promise<GoalMilestone[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    const { data, error } = await ctx.supabase
      .from('goal_milestones')
      .select('*')
      .eq('user_id', ctx.user.id)
      .eq('goal_id', goalId)
      .order('position', { ascending: true });
    if (error) {
      console.error('Error fetching milestones:', error.message || error);
      return [];
    }
    return (data as GoalMilestone[]) || [];
  } catch (err) {
    console.error('Unexpected error in getGoalMilestones:', err);
    return [];
  }
}

export async function addMilestone(
  goalId: string,
  title: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmed = title.trim();
    if (!trimmed) return { success: false, error: 'Milestone title is required' };
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { data: existing } = await ctx.supabase
      .from('goal_milestones')
      .select('position')
      .eq('user_id', ctx.user.id)
      .eq('goal_id', goalId)
      .order('position', { ascending: false })
      .limit(1);
    const position = ((existing as Array<{ position: number }>)?.[0]?.position ?? -1) + 1;
    const { error } = await ctx.supabase.from('goal_milestones').insert({
      user_id: ctx.user.id,
      goal_id: goalId,
      title: trimmed,
      position,
    });
    if (error) {
      console.error('Error adding milestone:', error);
      return { success: false, error: error.message };
    }
    revalidatePath(`/goals/${goalId}`);
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in addMilestone:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function toggleMilestone(
  goalId: string,
  milestoneId: string,
  done: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase
      .from('goal_milestones')
      .update({ is_done: done })
      .eq('id', milestoneId)
      .eq('goal_id', goalId)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error toggling milestone:', error);
      return { success: false, error: error.message };
    }
    revalidatePath(`/goals/${goalId}`);
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in toggleMilestone:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteMilestone(
  goalId: string,
  milestoneId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase
      .from('goal_milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('goal_id', goalId)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error deleting milestone:', error);
      return { success: false, error: error.message };
    }
    revalidatePath(`/goals/${goalId}`);
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in deleteMilestone:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ---------------------------------------------------------------------------
// Goal relations (linked actionable entities live under the goal)
// ---------------------------------------------------------------------------

export interface GoalRelations {
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  habits: Habit[];
}

export async function getGoalRelations(goalId: string): Promise<GoalRelations> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { projects: [], tasks: [], notes: [], habits: [] };
    const scoped = (table: string) =>
      ctx.supabase
        .from(table)
        .select('*')
        .eq('user_id', ctx.user.id)
        .eq('goal_id', goalId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
    const [projects, tasks, notes, habits] = await Promise.all([
      scoped('projects'),
      scoped('tasks'),
      scoped('notes'),
      scoped('habits'),
    ]);
    return {
      projects: (projects.data as Project[]) || [],
      tasks: (tasks.data as Task[]) || [],
      notes: (notes.data as Note[]) || [],
      habits: (habits.data as Habit[]) || [],
    };
  } catch (err) {
    console.error('Unexpected error in getGoalRelations:', err);
    return { projects: [], tasks: [], notes: [], habits: [] };
  }
}
