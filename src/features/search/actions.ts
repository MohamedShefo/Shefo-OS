'use server';

import { createClient } from '@/utils/supabase/server';
import type { EntityType } from '@/types/domain';

export type SearchResultEntity =
  | Extract<EntityType, 'capture' | 'note' | 'project' | 'task'>
  | 'work'
  | 'skill'
  | 'journal'
  | 'habit'
  | 'goal'
  | 'finance';

export interface SearchResult {
  entityType: SearchResultEntity;
  id: string;
  title: string;
  snippet: string | null;
  href: string;
  updatedAt: string;
}

const PER_TYPE_LIMIT = 6;
const MIN_QUERY_LENGTH = 2;

function snippetOf(text: string | null, max = 120): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return [];
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return [];
    }

    const pattern = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
    // PostgREST `or=` treats `,`/`(`/`)` as syntax — strip them there so a
    // query containing those characters degrades to a simpler match, not an error.
    const orPattern = `%${q.replace(/[%_\\]/g, '\\$&').replace(/[,()]/g, '')}%`;

    const [captures, notes, projects, tasks, work, skills, journal, habits, goals, finance] = await Promise.all([
      supabase
        .from('captures')
        .select('id, raw_text, updated_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .ilike('raw_text', pattern)
        .order('updated_at', { ascending: false })
        .limit(PER_TYPE_LIMIT),
      supabase
        .from('notes')
        .select('id, title, content, updated_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .or(`title.ilike.${orPattern},content.ilike.${orPattern}`)
        .order('updated_at', { ascending: false })
        .limit(PER_TYPE_LIMIT),
      supabase
        .from('projects')
        .select('id, name, description, updated_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .or(`name.ilike.${orPattern},description.ilike.${orPattern}`)
        .order('updated_at', { ascending: false })
        .limit(PER_TYPE_LIMIT),
      supabase
        .from('tasks')
        .select('id, title, description, updated_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .or(`title.ilike.${orPattern},description.ilike.${orPattern}`)
        .order('updated_at', { ascending: false })
        .limit(PER_TYPE_LIMIT),
      supabase
        .from('work_experiences')
        .select('id, organization, role, updated_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .or(`organization.ilike.${orPattern},role.ilike.${orPattern}`)
        .order('updated_at', { ascending: false })
        .limit(4),
      supabase
        .from('skills')
        .select('id, name, category, updated_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .or(`name.ilike.${orPattern},category.ilike.${orPattern}`)
        .order('updated_at', { ascending: false })
        .limit(4),
      supabase
        .from('journal_entries')
        .select('id, entry_date, title, content, updated_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .or(`title.ilike.${orPattern},content.ilike.${orPattern}`)
        .order('entry_date', { ascending: false })
        .limit(4),
      supabase
        .from('habits')
        .select('id, name, description, updated_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .ilike('name', pattern)
        .order('updated_at', { ascending: false })
        .limit(4),
      supabase
        .from('goals')
        .select('id, title, description, updated_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .or(`title.ilike.${orPattern},description.ilike.${orPattern}`)
        .order('updated_at', { ascending: false })
        .limit(4),
      supabase
        .from('finance_transactions')
        .select('id, description, category, updated_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .or(`description.ilike.${orPattern},category.ilike.${orPattern}`)
        .order('updated_at', { ascending: false })
        .limit(4),
    ]);

    const results: SearchResult[] = [];

    for (const c of captures.data ?? []) {
      results.push({
        entityType: 'capture',
        id: c.id,
        title: snippetOf(c.raw_text, 80) ?? 'Untitled capture',
        snippet: null,
        href: '/capture',
        updatedAt: c.updated_at,
      });
    }
    for (const n of notes.data ?? []) {
      results.push({
        entityType: 'note',
        id: n.id,
        title: n.title,
        snippet: snippetOf(n.content),
        href: '/notes',
        updatedAt: n.updated_at,
      });
    }
    for (const p of projects.data ?? []) {
      results.push({
        entityType: 'project',
        id: p.id,
        title: p.name,
        snippet: snippetOf(p.description),
        href: `/projects/${p.id}`,
        updatedAt: p.updated_at,
      });
    }
    for (const t of tasks.data ?? []) {
      results.push({
        entityType: 'task',
        id: t.id,
        title: t.title,
        snippet: snippetOf(t.description),
        href: '/tasks',
        updatedAt: t.updated_at,
      });
    }
    for (const w of work.data ?? []) {
      results.push({
        entityType: 'work',
        id: w.id,
        title: w.organization,
        snippet: w.role,
        href: `/work/${w.id}`,
        updatedAt: w.updated_at,
      });
    }
    for (const s of skills.data ?? []) {
      results.push({
        entityType: 'skill',
        id: s.id,
        title: s.name,
        snippet: s.category,
        href: '/skills',
        updatedAt: s.updated_at,
      });
    }
    for (const j of journal.data ?? []) {
      results.push({
        entityType: 'journal',
        id: j.id,
        title: j.title || j.entry_date,
        snippet: snippetOf(j.content),
        href: `/journal?date=${j.entry_date}`,
        updatedAt: j.updated_at,
      });
    }
    for (const h of habits.data ?? []) {
      results.push({
        entityType: 'habit',
        id: h.id,
        title: h.name,
        snippet: snippetOf(h.description),
        href: '/habits',
        updatedAt: h.updated_at,
      });
    }
    for (const g of goals.data ?? []) {
      results.push({
        entityType: 'goal',
        id: g.id,
        title: g.title,
        snippet: snippetOf(g.description),
        href: `/goals/${g.id}`,
        updatedAt: g.updated_at,
      });
    }
    for (const f of finance.data ?? []) {
      results.push({
        entityType: 'finance',
        id: f.id,
        title: f.description || f.category || 'Transaction',
        snippet: null,
        href: '/finance',
        updatedAt: f.updated_at,
      });
    }

    return results.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  } catch (err) {
    console.error('Unexpected error in globalSearch:', err);
    return [];
  }
}
