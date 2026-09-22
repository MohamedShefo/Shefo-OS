'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { Note, Project, Skill, WorkExperience } from '@/types/database';

async function authedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return { supabase, user };
}

/** PostgREST to-one embeds may type as object-or-array; normalize to one row. */
function toOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function getSkills(): Promise<Skill[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    const { data, error } = await ctx.supabase
      .from('skills')
      .select('*')
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null)
      .order('name', { ascending: true });
    if (error) {
      console.error('Error fetching skills:', error.message || error);
      return [];
    }
    return (data as Skill[]) || [];
  } catch (err) {
    console.error('Unexpected error in getSkills:', err);
    return [];
  }
}

export async function createSkill(payload: {
  name: string;
  category?: string | null;
  description?: string | null;
}): Promise<{ success: boolean; error?: string; data?: Skill }> {
  try {
    const name = payload.name.trim();
    if (!name) return { success: false, error: 'Skill name is required' };
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { data, error } = await ctx.supabase
      .from('skills')
      .insert({
        user_id: ctx.user.id,
        name,
        category: payload.category?.trim() || null,
        description: payload.description?.trim() || null,
      })
      .select('*')
      .single();
    if (error) {
      console.error('Error creating skill:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/skills');
    return { success: true, data: data as Skill };
  } catch (err) {
    console.error('Unexpected error in createSkill:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteSkill(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase
      .from('skills')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error soft-deleting skill:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/skills');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in deleteSkill:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export interface SkillRelations {
  work: WorkExperience[];
  notes: Note[];
}

/** Where a skill is used (loaded only where displayed). */
export async function getSkillRelations(skillId: string): Promise<SkillRelations> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { work: [], notes: [] };
    const [workRes, notesRes] = await Promise.all([
      ctx.supabase
        .from('work_experience_skills')
        .select('work_experience_id, work_experiences(*)')
        .eq('user_id', ctx.user.id)
        .eq('skill_id', skillId),
      ctx.supabase
        .from('note_skills')
        .select('note_id, notes(*)')
        .eq('user_id', ctx.user.id)
        .eq('skill_id', skillId),
    ]);
    const work: WorkExperience[] = [];
    for (const row of (workRes.data as Array<{
      work_experiences: WorkExperience | WorkExperience[] | null;
    }>) || []) {
      const w = toOne(row.work_experiences);
      if (w && !w.deleted_at) work.push(w);
    }
    const notes: Note[] = [];
    for (const row of (notesRes.data as Array<{ notes: Note | Note[] | null }>) || []) {
      const n = toOne(row.notes);
      if (n && !n.deleted_at) notes.push(n);
    }
    return { work, notes };
  } catch (err) {
    console.error('Unexpected error in getSkillRelations:', err);
    return { work: [], notes: [] };
  }
}

/** Link a skill to a note (manual linking core). */
export async function linkNoteSkill(
  noteId: string,
  skillId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase.from('note_skills').insert({
      user_id: ctx.user.id,
      note_id: noteId,
      skill_id: skillId,
    });
    if (error) {
      console.error('Error linking note skill:', error);
      return { success: false, error: error.message };
    }
    revalidatePath(`/notes/${noteId}`);
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in linkNoteSkill:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function unlinkNoteSkill(
  noteId: string,
  skillId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase
      .from('note_skills')
      .delete()
      .eq('user_id', ctx.user.id)
      .eq('note_id', noteId)
      .eq('skill_id', skillId);
    if (error) {
      console.error('Error unlinking note skill:', error);
      return { success: false, error: error.message };
    }
    revalidatePath(`/notes/${noteId}`);
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in unlinkNoteSkill:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getNoteSkills(noteId: string): Promise<Skill[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    const { data, error } = await ctx.supabase
      .from('note_skills')
      .select('skill_id, skills(*)')
      .eq('user_id', ctx.user.id)
      .eq('note_id', noteId);
    if (error) {
      console.error('Error fetching note skills:', error.message || error);
      return [];
    }
    const skills: Skill[] = [];
    for (const row of (data as Array<{ skills: Skill | Skill[] | null }>) || []) {
      const s = toOne(row.skills);
      if (s && !s.deleted_at) skills.push(s);
    }
    return skills;
  } catch (err) {
    console.error('Unexpected error in getNoteSkills:', err);
    return [];
  }
}

export async function getProjectsByWork(workId: string): Promise<Project[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    const { data, error } = await ctx.supabase
      .from('projects')
      .select('*')
      .eq('user_id', ctx.user.id)
      .eq('work_experience_id', workId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching projects by work:', error.message || error);
      return [];
    }
    return (data as Project[]) || [];
  } catch (err) {
    console.error('Unexpected error in getProjectsByWork:', err);
    return [];
  }
}
