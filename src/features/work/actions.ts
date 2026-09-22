'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { Project, Skill, WorkExperience } from '@/types/database';

export interface CreateWorkPayload {
  organization: string;
  role?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
  responsibilities?: string | null;
  key_people?: string | null;
}

export type UpdateWorkPayload = Partial<CreateWorkPayload>;

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

export async function getWorkExperiences(): Promise<WorkExperience[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    const { data, error } = await ctx.supabase
      .from('work_experiences')
      .select('*')
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null)
      .order('is_current', { ascending: false })
      .order('start_date', { ascending: false, nullsFirst: false });
    if (error) {
      console.error('Error fetching work experiences:', error.message || error);
      return [];
    }
    return (data as WorkExperience[]) || [];
  } catch (err) {
    console.error('Unexpected error in getWorkExperiences:', err);
    return [];
  }
}

export async function getWorkExperienceById(id: string): Promise<WorkExperience | null> {
  try {
    const ctx = await authedUser();
    if (!ctx) return null;
    const { data, error } = await ctx.supabase
      .from('work_experiences')
      .select('*')
      .eq('id', id)
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null)
      .single();
    if (error) {
      console.error('Error fetching work experience:', error.message || error);
      return null;
    }
    return (data as WorkExperience) || null;
  } catch (err) {
    console.error('Unexpected error in getWorkExperienceById:', err);
    return null;
  }
}

export async function createWorkExperience(
  payload: CreateWorkPayload
): Promise<{ success: boolean; error?: string; data?: WorkExperience }> {
  try {
    const organization = payload.organization.trim();
    if (!organization) {
      return { success: false, error: 'Organization name is required' };
    }
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };

    const { data, error } = await ctx.supabase
      .from('work_experiences')
      .insert({
        user_id: ctx.user.id,
        organization,
        role: payload.role?.trim() || null,
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        is_current: payload.is_current ?? false,
        description: payload.description?.trim() || null,
        responsibilities: payload.responsibilities?.trim() || null,
        key_people: payload.key_people?.trim() || null,
      })
      .select('*')
      .single();
    if (error) {
      console.error('Error creating work experience:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/work');
    revalidatePath('/');
    return { success: true, data: data as WorkExperience };
  } catch (err) {
    console.error('Unexpected error in createWorkExperience:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateWorkExperience(
  id: string,
  payload: UpdateWorkPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const updateData: Record<string, unknown> = {};
    if (payload.organization !== undefined) updateData.organization = payload.organization.trim();
    if (payload.role !== undefined) updateData.role = payload.role?.trim() || null;
    if (payload.start_date !== undefined) updateData.start_date = payload.start_date || null;
    if (payload.end_date !== undefined) updateData.end_date = payload.end_date || null;
    if (payload.is_current !== undefined) updateData.is_current = payload.is_current;
    if (payload.description !== undefined) updateData.description = payload.description?.trim() || null;
    if (payload.responsibilities !== undefined)
      updateData.responsibilities = payload.responsibilities?.trim() || null;
    if (payload.key_people !== undefined) updateData.key_people = payload.key_people?.trim() || null;
    if (Object.keys(updateData).length === 0) return { success: true };

    const { error } = await ctx.supabase
      .from('work_experiences')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error updating work experience:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/work');
    revalidatePath(`/work/${id}`);
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in updateWorkExperience:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteWorkExperience(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase
      .from('work_experiences')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error soft-deleting work experience:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/work');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in deleteWorkExperience:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/** Related entities for the work hub (loaded only on the detail page). */
export async function getWorkRelations(workId: string): Promise<{
  projects: Project[];
  skills: Skill[];
}> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { projects: [], skills: [] };
    const [projectsRes, skillsRes] = await Promise.all([
      ctx.supabase
        .from('projects')
        .select('*')
        .eq('user_id', ctx.user.id)
        .eq('work_experience_id', workId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      ctx.supabase
        .from('work_experience_skills')
        .select('skill_id, skills(*)')
        .eq('user_id', ctx.user.id)
        .eq('work_experience_id', workId),
    ]);
    const projects = (projectsRes.data as Project[]) || [];
    const skills: Skill[] = [];
    for (const row of (skillsRes.data as Array<{ skills: Skill | Skill[] | null }>) || []) {
      const s = toOne(row.skills);
      if (s && !s.deleted_at) skills.push(s);
    }
    return { projects, skills };
  } catch (err) {
    console.error('Unexpected error in getWorkRelations:', err);
    return { projects: [], skills: [] };
  }
}

export async function linkWorkSkill(
  workId: string,
  skillId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase.from('work_experience_skills').insert({
      user_id: ctx.user.id,
      work_experience_id: workId,
      skill_id: skillId,
    });
    if (error) {
      console.error('Error linking work skill:', error);
      return { success: false, error: error.message };
    }
    revalidatePath(`/work/${workId}`);
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in linkWorkSkill:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function unlinkWorkSkill(
  workId: string,
  skillId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { error } = await ctx.supabase
      .from('work_experience_skills')
      .delete()
      .eq('user_id', ctx.user.id)
      .eq('work_experience_id', workId)
      .eq('skill_id', skillId);
    if (error) {
      console.error('Error unlinking work skill:', error);
      return { success: false, error: error.message };
    }
    revalidatePath(`/work/${workId}`);
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in unlinkWorkSkill:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
