'use server';

import { createClient } from '@/utils/supabase/server';
import type { DashboardMode } from '@/types/database';
import { DASHBOARD_WIDGET_IDS, type DashboardWidgetId } from './config';

export type { DashboardWidgetId };

export interface DashboardPrefs {
  mode: DashboardMode;
  widgets: DashboardWidgetId[];
}

const DEFAULT_WIDGETS: DashboardWidgetId[] = [...DASHBOARD_WIDGET_IDS];

function sanitizeWidgets(input: unknown): DashboardWidgetId[] {
  if (!Array.isArray(input)) return [...DEFAULT_WIDGETS];
  const allowed = new Set<string>(DASHBOARD_WIDGET_IDS);
  const seen = new Set<string>();
  const out: DashboardWidgetId[] = [];
  for (const w of input) {
    if (typeof w === 'string' && allowed.has(w) && !seen.has(w)) {
      seen.add(w);
      out.push(w as DashboardWidgetId);
    }
  }
  return out.length > 0 ? out : [...DEFAULT_WIDGETS];
}

export async function getDashboardPrefs(): Promise<DashboardPrefs> {
  const fallback: DashboardPrefs = { mode: 'normal', widgets: [...DEFAULT_WIDGETS] };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fallback;
    const { data } = await supabase
      .from('dashboard_state')
      .select('mode, widgets')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!data) return fallback;
    const row = data as { mode: string; widgets: unknown };
    return {
      mode: row.mode === 'focus' ? 'focus' : 'normal',
      widgets: sanitizeWidgets(row.widgets),
    };
  } catch (err) {
    console.error('Unexpected error in getDashboardPrefs:', err);
    return fallback;
  }
}

export async function saveDashboardPrefs(
  prefs: DashboardPrefs
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'User is not authenticated' };
    const { error } = await supabase.from('dashboard_state').upsert(
      {
        user_id: user.id,
        mode: prefs.mode === 'focus' ? 'focus' : 'normal',
        widgets: sanitizeWidgets(prefs.widgets),
      },
      { onConflict: 'user_id' }
    );
    if (error) {
      console.error('Error saving dashboard prefs:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in saveDashboardPrefs:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
