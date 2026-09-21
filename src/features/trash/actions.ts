'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { Capture, Note, Project, Task } from '@/types/database';

export type TrashEntityType = 'capture' | 'note' | 'project' | 'task';

export type TrashedItem =
  | { entityType: 'capture'; item: Capture }
  | { entityType: 'note'; item: Note }
  | { entityType: 'project'; item: Project }
  | { entityType: 'task'; item: Task };

const TRASH_TABLES: Record<TrashEntityType, 'captures' | 'notes' | 'projects' | 'tasks'> = {
  capture: 'captures',
  note: 'notes',
  project: 'projects',
  task: 'tasks',
};

export async function getTrashedItems(): Promise<TrashedItem[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return [];
    }

    const [captures, notes, projects, tasks] = await Promise.all([
      supabase
        .from('captures')
        .select('*')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
    ]);

    const errors = [captures.error, notes.error, projects.error, tasks.error].filter(Boolean);
    if (errors.length > 0) {
      console.error('Error fetching trashed items:', errors);
      return [];
    }

    const items: TrashedItem[] = [
      ...((captures.data as Capture[]) || []).map((item) => ({
        entityType: 'capture' as const,
        item,
      })),
      ...((notes.data as Note[]) || []).map((item) => ({
        entityType: 'note' as const,
        item,
      })),
      ...((projects.data as Project[]) || []).map((item) => ({
        entityType: 'project' as const,
        item,
      })),
      ...((tasks.data as Task[]) || []).map((item) => ({
        entityType: 'task' as const,
        item,
      })),
    ];

    return items.sort((a, b) => {
      const aTime = a.item.deleted_at ? new Date(a.item.deleted_at).getTime() : 0;
      const bTime = b.item.deleted_at ? new Date(b.item.deleted_at).getTime() : 0;
      return bTime - aTime;
    });
  } catch (err) {
    console.error('Unexpected error in getTrashedItems:', err);
    return [];
  }
}

export async function restoreItem(
  entityType: TrashEntityType,
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
      .from(TRASH_TABLES[entityType])
      .update({ deleted_at: null })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error(`Error restoring ${entityType}:`, error);
      return { success: false, error: error.message };
    }

    revalidatePath('/trash');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in restoreItem:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function permanentlyDeleteItem(
  entityType: TrashEntityType,
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
      .from(TRASH_TABLES[entityType])
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null);

    if (error) {
      console.error(`Error permanently deleting ${entityType}:`, error);
      return { success: false, error: error.message };
    }

    revalidatePath('/trash');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in permanentlyDeleteItem:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
