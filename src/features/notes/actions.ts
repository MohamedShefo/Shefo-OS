'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { normalizeTags } from '@/lib/utils';
import { Note, NoteBlock, NoteLink } from '@/types/database';

export interface CreateNotePayload {
  title: string;
  content?: string;
  tags?: string[];
  project_id?: string | null;
  source_capture_id?: string | null;
  work_experience_id?: string | null;
  note_type?: string | null;
  workspace_id?: string | null;
}

export interface UpdateNotePayload {
  title?: string;
  content?: string;
  tags?: string[];
  project_id?: string | null;
  work_experience_id?: string | null;
  note_type?: string | null;
  goal_id?: string | null;
  is_pinned?: boolean;
}

export async function getNotes(workspaceId?: string | null): Promise<Note[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return [];
    }

    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null);
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

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
        work_experience_id: payload.work_experience_id || null,
        note_type: payload.note_type?.trim() || null,
        workspace_id: payload.workspace_id || null,
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
    if (payload.work_experience_id !== undefined)
      updateData.work_experience_id = payload.work_experience_id;
    if (payload.note_type !== undefined) updateData.note_type = payload.note_type?.trim() || null;
    if (payload.goal_id !== undefined) updateData.goal_id = payload.goal_id;
    if (payload.is_pinned !== undefined) updateData.is_pinned = payload.is_pinned;

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

/** Distinct tags across the user's live notes (bounded, for filtering). */
export async function getNoteTags(limit = 100): Promise<string[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return [];
    const { data, error } = await supabase
      .from('notes')
      .select('tags')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .not('tags', 'is', null)
      .limit(500);
    if (error) {
      console.error('Error fetching note tags:', error.message || error);
      return [];
    }
    const set = new Set<string>();
    for (const row of (data as Array<{ tags: string[] | string | null }>) || []) {
      for (const t of normalizeTags(row.tags)) {
        const tag = t.toLowerCase();
        if (tag) set.add(tag);
        if (set.size >= limit) break;
      }
      if (set.size >= limit) break;
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  } catch (err) {
    console.error('Unexpected error in getNoteTags:', err);
    return [];
  }
}

/**
 * Deterministic "related notes": same project first, then shared tags,
 * then directly linked notes. Excludes self and trashed notes.
 */
export async function getRelatedNotes(noteId: string, limit = 6): Promise<Note[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return [];
    const source = await getNoteById(noteId);
    if (!source) return [];

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .neq('id', noteId)
      .order('updated_at', { ascending: false })
      .limit(60);
    if (error) {
      console.error('Error fetching related notes:', error.message || error);
      return [];
    }
    const candidates = (data as Note[]) || [];
    const sourceTags = new Set(normalizeTags(source.tags).map((t) => t.toLowerCase()));
    const [outgoing, incoming] = await Promise.all([
      getOutgoingNoteLinks(noteId),
      getIncomingNoteLinks(noteId),
    ]);
    const linkedIds = new Set([...outgoing, ...incoming].map((l) => l.note.id));

    const scored = candidates.map((n) => {
      let score = 0;
      if (source.project_id && n.project_id === source.project_id) score += 3;
      const shared = normalizeTags(n.tags).filter((t) =>
        sourceTags.has(t.toLowerCase())
      ).length;
      score += Math.min(2, shared);
      if (linkedIds.has(n.id)) score += 4;
      if (n.is_pinned) score += 1;
      return { note: n, score };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.note);
  } catch (err) {
    console.error('Unexpected error in getRelatedNotes:', err);
    return [];
  }
}

export async function getNoteById(id: string): Promise<Note | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return null;
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();
    if (error) {
      console.error('Error fetching note:', error.message || error);
      return null;
    }
    return (data as Note) || null;
  } catch (err) {
    console.error('Unexpected error in getNoteById:', err);
    return null;
  }
}

export async function getNotesByWork(workId: string): Promise<Note[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return [];
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('work_experience_id', workId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching notes by work:', error.message || error);
      return [];
    }
    return (data as Note[]) || [];
  } catch (err) {
    console.error('Unexpected error in getNotesByWork:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Layer B — ordered blocks (note.content stays as plain-text fallback)
// ---------------------------------------------------------------------------

export async function getNoteBlocks(noteId: string): Promise<NoteBlock[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return [];
    const { data, error } = await supabase
      .from('note_blocks')
      .select('*')
      .eq('user_id', user.id)
      .eq('note_id', noteId)
      .order('position', { ascending: true });
    if (error) {
      console.error('Error fetching note blocks:', error.message || error);
      return [];
    }
    return (data as NoteBlock[]) || [];
  } catch (err) {
    console.error('Unexpected error in getNoteBlocks:', err);
    return [];
  }
}

export interface NoteBlockInput {
  id?: string;
  block_type: string;
  content: string;
}

const ALLOWED_BLOCK_TYPES = new Set(['text', 'heading', 'list']);

/** Replace all blocks of a note (owned-note guard first). */
export async function saveNoteBlocks(
  noteId: string,
  blocks: NoteBlockInput[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'User is not authenticated' };

    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();
    if (noteError || !note) {
      return { success: false, error: 'Note not found' };
    }

    const clean = blocks
      .filter((b) => b.content.trim().length > 0 || b.block_type === 'text')
      .map((b, i) => ({
        user_id: user.id,
        note_id: noteId,
        block_type: ALLOWED_BLOCK_TYPES.has(b.block_type) ? b.block_type : 'text',
        content: b.content,
        position: i,
      }));

    const { error: deleteError } = await supabase
      .from('note_blocks')
      .delete()
      .eq('user_id', user.id)
      .eq('note_id', noteId);
    if (deleteError) {
      console.error('Error clearing note blocks:', deleteError);
      return { success: false, error: deleteError.message };
    }
    if (clean.length > 0) {
      const { error: insertError } = await supabase.from('note_blocks').insert(clean);
      if (insertError) {
        console.error('Error inserting note blocks:', insertError);
        return { success: false, error: insertError.message };
      }
    }

    // Keep note.content as a plain-text fallback/export source.
    const plainText = clean.map((b) => b.content).join('\n\n');
    await supabase
      .from('notes')
      .update({ content: plainText || null })
      .eq('id', noteId)
      .eq('user_id', user.id);

    revalidatePath(`/notes/${noteId}`);
    revalidatePath('/notes');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in saveNoteBlocks:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ---------------------------------------------------------------------------
// Manual note↔note links (directed; graph + Layer C read from these)
// ---------------------------------------------------------------------------

export interface LinkedNote {
  linkId: string;
  note: Note;
}

/** PostgREST to-one embeds may type as object-or-array; normalize to one row. */
function toOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function getOutgoingNoteLinks(noteId: string): Promise<LinkedNote[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return [];
    const { data, error } = await supabase
      .from('note_links')
      .select('id, to_note_id, notes!note_links_to_note_id_fkey(*)')
      .eq('user_id', user.id)
      .eq('from_note_id', noteId);
    if (error) {
      console.error('Error fetching outgoing note links:', error.message || error);
      return [];
    }
    const out: LinkedNote[] = [];
    for (const row of (data as Array<{ id: string; notes: Note | Note[] | null }>) || []) {
      const note = toOne(row.notes);
      if (note && !note.deleted_at) out.push({ linkId: row.id, note });
    }
    return out;
  } catch (err) {
    console.error('Unexpected error in getOutgoingNoteLinks:', err);
    return [];
  }
}

export async function getIncomingNoteLinks(noteId: string): Promise<LinkedNote[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return [];
    const { data, error } = await supabase
      .from('note_links')
      .select('id, from_note_id, notes!note_links_from_note_id_fkey(*)')
      .eq('user_id', user.id)
      .eq('to_note_id', noteId);
    if (error) {
      console.error('Error fetching incoming note links:', error.message || error);
      return [];
    }
    const out: LinkedNote[] = [];
    for (const row of (data as Array<{ id: string; notes: Note | Note[] | null }>) || []) {
      const note = toOne(row.notes);
      if (note && !note.deleted_at) out.push({ linkId: row.id, note });
    }
    return out;
  } catch (err) {
    console.error('Unexpected error in getIncomingNoteLinks:', err);
    return [];
  }
}

export async function linkNotes(
  fromNoteId: string,
  toNoteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (fromNoteId === toNoteId) {
      return { success: false, error: 'A note cannot link to itself' };
    }
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'User is not authenticated' };

    // Both notes must belong to the user.
    const { data: owned, error: ownedError } = await supabase
      .from('notes')
      .select('id')
      .eq('user_id', user.id)
      .in('id', [fromNoteId, toNoteId])
      .is('deleted_at', null);
    if (ownedError || (owned || []).length !== 2) {
      return { success: false, error: 'Both notes must exist and belong to you' };
    }

    const { error } = await supabase.from('note_links').insert({
      user_id: user.id,
      from_note_id: fromNoteId,
      to_note_id: toNoteId,
    });
    if (error) {
      console.error('Error linking notes:', error);
      return { success: false, error: error.message };
    }
    revalidatePath(`/notes/${fromNoteId}`);
    revalidatePath(`/notes/${toNoteId}`);
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in linkNotes:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function unlinkNotes(linkId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'User is not authenticated' };
    const { data: link } = await supabase
      .from('note_links')
      .select('from_note_id, to_note_id')
      .eq('id', linkId)
      .eq('user_id', user.id)
      .single();
    const { error } = await supabase
      .from('note_links')
      .delete()
      .eq('id', linkId)
      .eq('user_id', user.id);
    if (error) {
      console.error('Error unlinking notes:', error);
      return { success: false, error: error.message };
    }
    const row = link as unknown as { from_note_id: string; to_note_id: string } | null;
    if (row) {
      revalidatePath(`/notes/${row.from_note_id}`);
      revalidatePath(`/notes/${row.to_note_id}`);
    }
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in unlinkNotes:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getNoteLinkRows(noteId: string): Promise<NoteLink[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return [];
    const { data, error } = await supabase
      .from('note_links')
      .select('*')
      .eq('user_id', user.id)
      .or(`from_note_id.eq.${noteId},to_note_id.eq.${noteId}`);
    if (error) {
      console.error('Error fetching note link rows:', error.message || error);
      return [];
    }
    return (data as NoteLink[]) || [];
  } catch (err) {
    console.error('Unexpected error in getNoteLinkRows:', err);
    return [];
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
