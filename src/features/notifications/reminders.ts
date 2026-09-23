'use server';

import { createClient } from '@/utils/supabase/server';
import type { Task } from '@/types/database';

/**
 * Lazy reminder materialization (no cron/automation engine).
 *
 * Called at most once per shell load: finds tasks whose reminder time has
 * passed and creates one notification per (task, reminder_at) pair.
 * Duplicates are prevented by checking for an existing unread reminder
 * notification for the same pair before inserting.
 */
export async function checkReminders(): Promise<number> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return 0;

    const now = new Date().toISOString();
    const { data: due, error } = await supabase
      .from('tasks')
      .select('id, title, reminder_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .neq('status', 'done')
      .not('reminder_at', 'is', null)
      .lte('reminder_at', now)
      .limit(20);
    if (error || !due || due.length === 0) return 0;

    let created = 0;
    for (const task of due as Task[]) {
      const refKey = `task:${task.id}@${task.reminder_at}`;
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'task_reminder')
        .eq('ref_key', refKey)
        .is('read_at', null)
        .is('deleted_at', null)
        .limit(1);
      if (existing && existing.length > 0) continue;

      const { error: insertError } = await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'task_reminder',
        title: `Reminder: ${task.title}`,
        body: task.reminder_at
          ? `Reminder set for ${new Date(task.reminder_at).toLocaleString()}`
          : null,
        link_href: '/tasks',
        ref_key: refKey,
      });
      // Unique-violation races resolve to "already exists" — not an error.
      if (!insertError) created += 1;
    }
    return created;
  } catch (err) {
    console.error('Unexpected error in checkReminders:', err);
    return 0;
  }
}
