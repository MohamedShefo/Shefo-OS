'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { Project, ProjectStatus } from '@/types/database';

export interface CreateProjectPayload {
  name: string;
  description?: string;
  status?: ProjectStatus;
}

export async function getProjects(): Promise<Project[]> {
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
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error.message || error);
      return [];
    }

    return (data as Project[]) || [];
  } catch (err) {
    console.error('Unexpected error in getProjects:', err);
    return [];
  }
}

export async function createProject(
  payload: CreateProjectPayload
): Promise<{ success: boolean; error?: string; data?: Project }> {
  try {
    const name = payload.name.trim();
    if (!name) {
      return { success: false, error: 'Project name is required' };
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
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        description: payload.description?.trim() || null,
        status: payload.status || 'active',
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/projects');
    revalidatePath('/');
    return { success: true, data: data as Project };
  } catch (err) {
    console.error('Unexpected error in createProject:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus
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
      .from('projects')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating project status:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/projects');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in updateProjectStatus:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteProject(
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
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error soft-deleting project:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/projects');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in deleteProject:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateProjectWork(
  id: string,
  workExperienceId: string | null
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
      .from('projects')
      .update({ work_experience_id: workExperienceId })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      console.error('Error updating project work link:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/projects');
    revalidatePath(`/projects/${id}`);
    revalidatePath('/work');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in updateProjectWork:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('Error fetching project:', error.message || error);
      return null;
    }

    return (data as Project) || null;
  } catch (err) {
    console.error('Unexpected error in getProjectById:', err);
    return null;
  }
}
