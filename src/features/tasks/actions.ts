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
