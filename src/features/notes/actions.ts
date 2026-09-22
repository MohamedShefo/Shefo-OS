'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { Note } from '@/types/database';

export interface CreateNotePayload {
  title: string;
  content?: string;
  tags?: string[];
  project_id?: string | null;
  source_capture_id?: string | null;
}

export interface UpdateNotePayload {
  title?: string;
  content?: string;
  tags?: string[];
  project_id?: string | null;
}

export async function getNotes(): Promise<Note[]> {
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
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error.message || error);
      return [];
    }

    return (data as Note[]) || [];
  } catch (err) {
    console.error('Unexpected error in getNotes:', err);
    return [];
  }
}

export async function createNote(
  payload: CreateNotePayload
): Promise<{ success: boolean; error?: string; data?: Note }> {
  try {
    const title = payload.title.trim();
    if (!title) {
      return { success: false, error: 'Note title is required' };
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
      .from('notes')
      .insert({
        user_id: user.id,
        title,
        content: payload.content?.trim() || null,
        tags: payload.tags || [],
        project_id: payload.project_id || null,
        source_capture_id: payload.source_capture_id || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/notes');
    revalidatePath('/');
    return { success: true, data: data as Note };
  } catch (err) {
    console.error('Unexpected error in createNote:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateNote(
  id: string,
  payload: UpdateNotePayload
): Promise<{ success: boolean; error?: string; data?: Note }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'User is not authenticated' };
    }

    const updateData: Record<string, unknown> = {};
    if (payload.title !== undefined) updateData.title = payload.title.trim();
    if (payload.content !== undefined) updateData.content = payload.content.trim() || null;
    if (payload.tags !== undefined) updateData.tags = payload.tags;
    if (payload.project_id !== undefined) updateData.project_id = payload.project_id;

    const { data, error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating note:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/notes');
    revalidatePath('/');
    return { success: true, data: data as Note };
  } catch (err) {
    console.error('Unexpected error in updateNote:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteNote(
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
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error soft-deleting note:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/notes');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in deleteNote:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getNotesByProject(projectId: string): Promise<Note[]> {
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
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes by project:', error.message || error);
      return [];
    }

    return (data as Note[]) || [];
  } catch (err) {
    console.error('Unexpected error in getNotesByProject:', err);
    return [];
  }
}
