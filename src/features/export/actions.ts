'use server';

import { createClient } from '@/utils/supabase/server';
import type { ExportBundle } from './format';
import type { Habit, HabitCompletion, Note, NoteBlock } from '@/types/database';

async function authedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return { supabase, user };
}

/** Full user-owned export bundle (personal scale — single pass, no pagination). */
export async function getExportBundle(): Promise<ExportBundle | null> {
  try {
    const ctx = await authedUser();
    if (!ctx) return null;
    const uid = ctx.user.id;

    const [projects, notes, blocks, links, tasks, captures, work, skills, journal, habits, completions] =
      await Promise.all([
        ctx.supabase.from('projects').select('*').eq('user_id', uid).is('deleted_at', null),
        ctx.supabase.from('notes').select('*').eq('user_id', uid).is('deleted_at', null),
        ctx.supabase.from('note_blocks').select('*').eq('user_id', uid),
        ctx.supabase.from('note_links').select('from_note_id, to_note_id').eq('user_id', uid),
        ctx.supabase.from('tasks').select('*').eq('user_id', uid).is('deleted_at', null),
        ctx.supabase.from('captures').select('*').eq('user_id', uid).is('deleted_at', null),
        ctx.supabase.from('work_experiences').select('*').eq('user_id', uid).is('deleted_at', null),
        ctx.supabase.from('skills').select('*').eq('user_id', uid).is('deleted_at', null),
        ctx.supabase.from('journal_entries').select('*').eq('user_id', uid).is('deleted_at', null),
        ctx.supabase.from('habits').select('*').eq('user_id', uid).is('deleted_at', null),
        ctx.supabase.from('habit_completions').select('*').eq('user_id', uid),
      ]);

    const errs = [projects, notes, blocks, links, tasks, captures, work, skills, journal, habits, completions]
      .map((r) => r.error)
      .filter(Boolean);
    if (errs.length > 0) {
      console.error('Error building export bundle:', errs);
      return null;
    }

    const blocksByNote = new Map<string, NoteBlock[]>();
    for (const b of (blocks.data as NoteBlock[]) || []) {
      const list = blocksByNote.get(b.note_id) ?? [];
      list.push(b);
      blocksByNote.set(b.note_id, list);
    }
    const titleById = new Map<string, string>();
    for (const n of (notes.data as Note[]) || []) titleById.set(n.id, n.title);
    const linksByFrom = new Map<string, string[]>();
    for (const l of (links.data as Array<{ from_note_id: string; to_note_id: string }>) || []) {
      const t = titleById.get(l.to_note_id);
      if (!t) continue;
      const list = linksByFrom.get(l.from_note_id) ?? [];
      list.push(t);
      linksByFrom.set(l.from_note_id, list);
    }
    const completionsByHabit = new Map<string, string[]>();
    for (const c of (completions.data as HabitCompletion[]) || []) {
      const list = completionsByHabit.get(c.habit_id) ?? [];
      list.push(c.completion_date);
      completionsByHabit.set(c.habit_id, list);
    }

    return {
      exportedAt: new Date().toISOString(),
      projects: projects.data ?? [],
      notes: ((notes.data as Note[]) || []).map((n) => ({
        ...n,
        blocks: blocksByNote.get(n.id) ?? [],
        linkedTitles: linksByFrom.get(n.id) ?? [],
      })),
      tasks: tasks.data ?? [],
      captures: captures.data ?? [],
      work: work.data ?? [],
      skills: skills.data ?? [],
      journal: journal.data ?? [],
      habits: ((habits.data as Habit[]) || []).map((h) => ({
        ...h,
        completions: completionsByHabit.get(h.id) ?? [],
      })),
    } as ExportBundle;
  } catch (err) {
    console.error('Unexpected error in getExportBundle:', err);
    return null;
  }
}
