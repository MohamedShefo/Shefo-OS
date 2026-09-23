'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { Task, TaskStatus, TaskPriority } from '@/types/database';

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority | null;
  due_date?: string | null;
  project_id?: string | null;
  note_id?: string | null;
  source_capture_id?: string | null;
  reminder_at?: string | null;
  recurrence?: string | null;
}

export async function getTasks(): Promise<Task[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return [];
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error.message || error);
      return [];
    }

    return (data as Task[]) || [];
  } catch (err) {
    console.error('Unexpected error in getTasks:', err);
    return [];
  }
}

export async function createTask(
  payload: CreateTaskPayload
): Promise<{ success: boolean; error?: string; data?: Task }> {
  try {
    const title = payload.title.trim();
    if (!title) {
      return { success: false, error: 'Task title is required' };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'User is not authenticated' };
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
        description: payload.description?.trim() || null,
        status: payload.status || 'todo',
        priority: payload.priority || null,
        due_date: payload.due_date || null,
        project_id: payload.project_id || null,
        note_id: payload.note_id || null,
        source_capture_id: payload.source_capture_id || null,
        reminder_at: payload.reminder_at || null,
        recurrence: payload.recurrence || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/tasks');
    revalidatePath('/');
    return { success: true, data: data as Task };
  } catch (err) {
    console.error('Unexpected error in createTask:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'User is not authenticated' };
    }

    const { error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating task status:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/tasks');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in updateTaskStatus:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteTask(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'User is not authenticated' };
    }

    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error soft-deleting task:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/tasks');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in deleteTask:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

const RECURRENCE_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

function advanceDate(iso: string | null, days: number): string | null {
  const base = iso ? new Date(iso).getTime() : Date.now();
  if (Number.isNaN(base)) return null;
  return new Date(base + days * 86400000).toISOString();
}

/**
 * Complete a task occurrence. For recurring tasks this marks the current
 * occurrence done AND spawns the next open occurrence (same fields, dates
 * advanced) — but only when no live child occurrence exists, so toggling or
 * retries can never duplicate the series or corrupt the rule.
 */
export async function completeTaskOccurrence(
  id: string
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
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();
    if (fetchError || !task) {
      return { success: false, error: 'Task not found' };
    }
    const current = task as Task;

    const { error: doneError } = await supabase
      .from('tasks')
      .update({ status: 'done' })
      .eq('id', id)
      .eq('user_id', user.id);
    if (doneError) {
      console.error('Error completing task:', doneError);
      return { success: false, error: doneError.message };
    }

    const intervalDays = current.recurrence ? RECURRENCE_DAYS[current.recurrence] : undefined;
    if (intervalDays) {
      const { data: children } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', user.id)
        .eq('parent_task_id', id)
        .is('deleted_at', null)
        .limit(1);
      if (!children || children.length === 0) {
        const { error: spawnError } = await supabase.from('tasks').insert({
          user_id: user.id,
          title: current.title,
          description: current.description,
          status: 'todo',
          priority: current.priority,
          due_date: advanceDate(current.due_date, intervalDays),
          project_id: current.project_id,
          note_id: current.note_id,
          source_capture_id: current.source_capture_id,
          goal_id: current.goal_id,
          reminder_at: current.reminder_at ? advanceDate(current.reminder_at, intervalDays) : null,
          recurrence: current.recurrence,
          parent_task_id: id,
        });
        if (spawnError) {
          console.error('Error spawning next occurrence:', spawnError);
        }
      }
    }

    revalidatePath('/tasks');
    revalidatePath('/today');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in completeTaskOccurrence:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export interface TaskImportRow {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
}

const IMPORT_STATUSES = new Set(['todo', 'in_progress', 'done']);
const IMPORT_PRIORITIES = new Set(['low', 'medium', 'high']);

/**
 * Bounded CSV-row import (tasks only). Every row is validated; invalid rows
 * are skipped and counted. Inserts are always owned by the caller.
 */
export async function importTasks(
  rows: TaskImportRow[]
): Promise<{ success: boolean; error?: string; imported?: number; skipped?: number }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'User is not authenticated' };
    const ctx = { supabase, user };
    const sliced = rows.slice(0, 500);
    const valid: Array<{
      user_id: string;
      title: string;
      description: string | null;
      status: TaskStatus;
      priority: TaskPriority | null;
      due_date: string | null;
    }> = [];
    let skipped = 0;
    for (const row of sliced) {
      const title = (row.title ?? '').trim();
      if (!title) {
        skipped += 1;
        continue;
      }
      const status = (row.status ?? 'todo').trim().toLowerCase().replace(/[\s-]+/g, '_');
      const priorityRaw = (row.priority ?? '').trim().toLowerCase();
      let due: string | null = null;
      if ((row.due_date ?? '').trim()) {
        const parsed = new Date(row.due_date!.trim());
        if (Number.isNaN(parsed.getTime())) {
          skipped += 1;
          continue;
        }
        due = parsed.toISOString();
      }
      valid.push({
        user_id: ctx.user.id,
        title,
        description: (row.description ?? '').trim() || null,
        status: (IMPORT_STATUSES.has(status) ? status : 'todo') as TaskStatus,
        priority: (IMPORT_PRIORITIES.has(priorityRaw) ? priorityRaw : null) as TaskPriority | null,
        due_date: due,
      });
    }
    if (valid.length > 0) {
      const { error } = await ctx.supabase.from('tasks').insert(valid);
      if (error) {
        console.error('Error importing tasks:', error);
        return { success: false, error: error.message };
      }
    }
    revalidatePath('/tasks');
    revalidatePath('/');
    return { success: true, imported: valid.length, skipped };
  } catch (err) {
    console.error('Unexpected error in importTasks:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateTaskGoal(
  id: string,
  goalId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'User is not authenticated' };
    }
    const { error } = await supabase
      .from('tasks')
      .update({ goal_id: goalId })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      console.error('Error updating task goal link:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/tasks');
    revalidatePath('/goals');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in updateTaskGoal:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getTasksByNote(noteId: string): Promise<Task[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return [];
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('note_id', noteId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching tasks by note:', error.message || error);
      return [];
    }
    return (data as Task[]) || [];
  } catch (err) {
    console.error('Unexpected error in getTasksByNote:', err);
    return [];
  }
}

export async function getTasksByProject(projectId: string): Promise<Task[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return [];
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks by project:', error.message || error);
      return [];
    }

    return (data as Task[]) || [];
  } catch (err) {
    console.error('Unexpected error in getTasksByProject:', err);
    return [];
  }
}
