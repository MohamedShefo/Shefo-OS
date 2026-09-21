'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { Capture } from '@/types/database';

export async function createCapture(rawText: string): Promise<{ success: boolean; error?: string; data?: Capture }> {
  try {
    const trimmed = rawText.trim();
    if (!trimmed) {
      return { success: false, error: 'Capture text cannot be empty' };
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
      .from('captures')
      .insert({
        user_id: user.id,
        raw_text: trimmed,
        status: 'unprocessed',
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting capture:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/capture');
    revalidatePath('/');
    return { success: true, data: data as Capture };
  } catch (err) {
    console.error('Unexpected error in createCapture:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getUnprocessedCaptures(): Promise<Capture[]> {
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
      .from('captures')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'unprocessed')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unprocessed captures:', error.message || error);
      return [];
    }

    return (data as Capture[]) || [];
  } catch (err) {
    console.error('Unexpected error in getUnprocessedCaptures:', err);
    return [];
  }
}

export async function deleteCapture(id: string): Promise<{ success: boolean; error?: string }> {
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
      .from('captures')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error soft-deleting capture:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/capture');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in deleteCapture:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
