'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { JournalEntry } from '@/types/database';

async function authedUser() {  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return { supabase, user };
}

export async function getJournalEntry(entryDate: string): Promise<JournalEntry | null> {
  try {
    const ctx = await authedUser();
    if (!ctx) return null;
    const { data, error } = await ctx.supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', ctx.user.id)
      .eq('entry_date', entryDate)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) {
      console.error('Error fetching journal entry:', error.message || error);
      return null;
    }
    return (data as JournalEntry) || null;
  } catch (err) {
    console.error('Unexpected error in getJournalEntry:', err);
    return null;
  }
}

export async function getRecentJournalEntries(limit = 14): Promise<JournalEntry[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    const { data, error } = await ctx.supabase
      .from('journal_entries')
      .select('id, entry_date, title, updated_at')
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null)
      .order('entry_date', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('Error fetching recent journal entries:', error.message || error);
      return [];
    }
    return (data as JournalEntry[]) || [];
  } catch (err) {
    console.error('Unexpected error in getRecentJournalEntries:', err);
    return [];
  }
}

export async function saveJournalEntry(
  entryDate: string,
  payload: { title?: string | null; content?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      return { success: false, error: 'Invalid date' };
    }
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };

    const existing = await getJournalEntry(entryDate);
    const row = {
      user_id: ctx.user.id,
      entry_date: entryDate,
      title: payload.title?.trim() || null,
      content: payload.content ?? '',
    };

    if (existing) {
      const { error } = await ctx.supabase
        .from('journal_entries')
        .update({ title: row.title, content: row.content })
        .eq('id', existing.id)
        .eq('user_id', ctx.user.id);
      if (error) {
        console.error('Error updating journal entry:', error);
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await ctx.supabase.from('journal_entries').insert(row);
      if (error) {
        console.error('Error creating journal entry:', error);
        return { success: false, error: error.message };
      }
    }
    revalidatePath('/journal');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in saveJournalEntry:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteJournalEntry(
  entryDate: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase
      .from('journal_entries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', ctx.user.id)
      .eq('entry_date', entryDate)
      .is('deleted_at', null);
    if (error) {
      console.error('Error deleting journal entry:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/journal');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in deleteJournalEntry:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
