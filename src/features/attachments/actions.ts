'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Attachment, AttachmentEntity } from '@/types/database';

async function authedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return { supabase, user };
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const BLOCKED_TYPES = new Set([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-sh',
  'application/x-executable',
  'application/x-mach-binary',
]);

const ATTACHMENT_ENTITIES: AttachmentEntity[] = ['project', 'note', 'task', 'capture'];

async function assertEntityOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityType: string,
  entityId: string,
  userId: string
): Promise<boolean> {
  const table =
    entityType === 'project'
      ? 'projects'
      : entityType === 'note'
        ? 'notes'
        : entityType === 'task'
          ? 'tasks'
          : 'captures';
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', entityId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  return !error && !!data;
}

export async function getAttachments(
  entityType: AttachmentEntity,
  entityId: string
): Promise<Attachment[]> {
  try {
    const ctx = await authedUser();
    if (!ctx) return [];
    const { data, error } = await ctx.supabase
      .from('attachments')
      .select('*')
      .eq('user_id', ctx.user.id)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching attachments:', error.message || error);
      return [];
    }
    return (data as Attachment[]) || [];
  } catch (err) {
    console.error('Unexpected error in getAttachments:', err);
    return [];
  }
}

export async function uploadAttachment(
  entityType: string,
  entityId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!ATTACHMENT_ENTITIES.includes(entityType as AttachmentEntity)) {
      return { success: false, error: 'Unsupported entity type' };
    }
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    if (!(await assertEntityOwned(ctx.supabase, entityType, entityId, ctx.user.id))) {
      return { success: false, error: 'Target not found' };
    }
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: 'Choose a file first' };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { success: false, error: 'File must be smaller than 5 MB' };
    }
    if (BLOCKED_TYPES.has(file.type)) {
      return { success: false, error: 'Executable files are not allowed' };
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'file';
    const path = `${ctx.user.id}/${entityType}/${entityId}/${Date.now()}_${safeName}`;
    const { error: uploadError } = await ctx.supabase.storage
      .from('attachments')
      .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (uploadError) {
      console.error('Error uploading attachment:', uploadError);
      return { success: false, error: uploadError.message };
    }
    const { error: rowError } = await ctx.supabase.from('attachments').insert({
      user_id: ctx.user.id,
      entity_type: entityType,
      entity_id: entityId,
      file_path: path,
      file_name: file.name.slice(0, 200),
      mime_type: file.type || null,
      size_bytes: file.size,
    });
    if (rowError) {
      await ctx.supabase.storage.from('attachments').remove([path]);
      console.error('Error recording attachment:', rowError);
      return { success: false, error: rowError.message };
    }
    revalidatePath('/projects');
    revalidatePath('/notes');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in uploadAttachment:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getAttachmentDownloadUrl(
  id: string
): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { data, error } = await ctx.supabase
      .from('attachments')
      .select('file_path')
      .eq('id', id)
      .eq('user_id', ctx.user.id)
      .single();
    if (error || !data) {
      return { success: false, error: 'Attachment not found' };
    }
    const { data: signed, error: signError } = await ctx.supabase.storage
      .from('attachments')
      .createSignedUrl((data as { file_path: string }).file_path, 300);
    if (signError || !signed) {
      console.error('Error signing attachment URL:', signError);
      return { success: false, error: 'Could not prepare download' };
    }
    return { success: true, url: signed.signedUrl };
  } catch (err) {
    console.error('Unexpected error in getAttachmentDownloadUrl:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteAttachment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await authedUser();
    if (!ctx) return { success: false, error: 'User is not authenticated' };
    const { data, error: fetchError } = await ctx.supabase
      .from('attachments')
      .select('file_path')
      .eq('id', id)
      .eq('user_id', ctx.user.id)
      .single();
    if (fetchError || !data) {
      return { success: false, error: 'Attachment not found' };
    }
    await ctx.supabase.storage
      .from('attachments')
      .remove([(data as { file_path: string }).file_path]);
    const { error } = await ctx.supabase
      .from('attachments')
      .delete()
      .eq('id', id)
      .eq('user_id', ctx.user.id);
    if (error) {
      console.error('Error deleting attachment:', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/projects');
    revalidatePath('/notes');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in deleteAttachment:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
