'use server';

import { createClient } from '@/utils/supabase/server';

export interface ReportRange {
  from: string;
  to: string;
}

export interface DayPoint {
  date: string;
  value: number;
}

export interface ReportData {
  from: string;
  to: string;
  tasks: { created: number; done: number; total: number; byStatus: Array<{ status: string; count: number }>; perDay: DayPoint[] };
  projects: { created: number; active: number; total: number };
  captures: { created: number; unprocessed: number };
  notes: { created: number; total: number };
  journal: { activeDays: number; entries: number };
  habits: { completions: number; activeHabits: number; perDay: DayPoint[] };
  goals: { created: number; completed: number; active: number };
  finance: { income: number; expenses: number; net: number; perDay: DayPoint[] };
}

const MAX_RANGE_DAYS = 93;

function clampRange(from: string, to: string): ReportRange | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  if (from > to) return null;
  const days = Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400000
  );
  if (days < 0 || days > MAX_RANGE_DAYS) return null;
  return { from, to };
}

function emptyReport(from: string, to: string): ReportData {
  return {
    from,
    to,
    tasks: { created: 0, done: 0, total: 0, byStatus: [], perDay: [] },
    projects: { created: 0, active: 0, total: 0 },
    captures: { created: 0, unprocessed: 0 },
    notes: { created: 0, total: 0 },
    journal: { activeDays: 0, entries: 0 },
    habits: { completions: 0, activeHabits: 0, perDay: [] },
    goals: { created: 0, completed: 0, active: 0 },
    finance: { income: 0, expenses: 0, net: 0, perDay: [] },
  };
}

function dayKeys(from: string, to: string): string[] {
  const keys: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

/**
 * Modular period report. Every metric is computed server-side from
 * date-bounded queries. Metrics the schema cannot support (e.g. exact task
 * completion dates — tasks carry no completed_at) are deliberately omitted
 * rather than approximated.
 */
export async function getReport(from: string, to: string): Promise<ReportData | null> {
  const range = clampRange(from, to);
  if (!range) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return null;
    const uid = user.id;
    const fromTs = `${range.from}T00:00:00Z`;
    const toTs = `${range.to}T23:59:59Z`;

    const [tasks, projects, captures, notes, journal, completions, habits, goals, finance] =
      await Promise.all([
        supabase.from('tasks').select('status, created_at').eq('user_id', uid).is('deleted_at', null),
        supabase.from('projects').select('status, created_at').eq('user_id', uid).is('deleted_at', null),
        supabase.from('captures').select('status, created_at').eq('user_id', uid).is('deleted_at', null),
        supabase.from('notes').select('created_at').eq('user_id', uid).is('deleted_at', null),
        supabase.from('journal_entries').select('entry_date').eq('user_id', uid).is('deleted_at', null).gte('entry_date', range.from).lte('entry_date', range.to),
        supabase.from('habit_completions').select('completion_date').eq('user_id', uid).gte('completion_date', range.from).lte('completion_date', range.to),
        supabase.from('habits').select('is_active').eq('user_id', uid).is('deleted_at', null),
        supabase.from('goals').select('status, created_at').eq('user_id', uid).is('deleted_at', null),
        supabase.from('finance_transactions').select('type, amount, transaction_date').eq('user_id', uid).is('deleted_at', null).gte('transaction_date', range.from).lte('transaction_date', range.to),
      ]);

    const report = emptyReport(range.from, range.to);
    const inRange = (ts: string) => ts >= fromTs && ts <= toTs;
    const keys = dayKeys(range.from, range.to);
    const zeroSeries = (): DayPoint[] => keys.map((date) => ({ date, value: 0 }));
    const bump = (series: DayPoint[], iso: string) => {
      const day = iso.slice(0, 10);
      const point = series.find((p) => p.date === day);
      if (point) point.value += 1;
    };

    // Tasks (snapshot statuses + created-in-range; no completed_at exists).
    const taskRows = (tasks.data as Array<{ status: string; created_at: string }>) || [];
    const taskStatus = new Map<string, number>();
    const taskSeries = zeroSeries();
    for (const t of taskRows) {
      taskStatus.set(t.status, (taskStatus.get(t.status) ?? 0) + 1);
      if (inRange(t.created_at)) {
        report.tasks.created += 1;
        bump(taskSeries, t.created_at);
      }
    }
    report.tasks.total = taskRows.length;
    report.tasks.done = taskStatus.get('done') ?? 0;
    report.tasks.byStatus = [...taskStatus.entries()].map(([status, count]) => ({ status, count }));
    report.tasks.perDay = taskSeries;

    const projectRows = (projects.data as Array<{ status: string; created_at: string }>) || [];
    report.projects.total = projectRows.length;
    for (const p of projectRows) {
      if (p.status === 'active') report.projects.active += 1;
      if (inRange(p.created_at)) report.projects.created += 1;
    }

    const captureRows = (captures.data as Array<{ status: string; created_at: string }>) || [];
    for (const c of captureRows) {
      if (c.status === 'unprocessed') report.captures.unprocessed += 1;
      if (inRange(c.created_at)) report.captures.created += 1;
    }

    const noteRows = (notes.data as Array<{ created_at: string }>) || [];
    report.notes.total = noteRows.length;
    for (const n of noteRows) {
      if (inRange(n.created_at)) report.notes.created += 1;
    }

    const journalRows = (journal.data as Array<{ entry_date: string }>) || [];
    report.journal.entries = journalRows.length;
    report.journal.activeDays = new Set(journalRows.map((j) => j.entry_date)).size;

    const habitSeries = zeroSeries();
    for (const c of (completions.data as Array<{ completion_date: string }>) || []) {
      report.habits.completions += 1;
      const point = habitSeries.find((p) => p.date === c.completion_date);
      if (point) point.value += 1;
    }
    report.habits.perDay = habitSeries;
    report.habits.activeHabits = (
      (habits.data as Array<{ is_active: boolean }>) || []
    ).filter((h) => h.is_active).length;

    const goalRows = (goals.data as Array<{ status: string; created_at: string }>) || [];
    for (const g of goalRows) {
      if (g.status === 'completed') report.goals.completed += 1;
      if (g.status === 'active') report.goals.active += 1;
      if (inRange(g.created_at)) report.goals.created += 1;
    }

    const financeSeries = zeroSeries();
    for (const f of (finance.data as Array<{ type: string; amount: number; transaction_date: string }>) || []) {
      const amt = Number(f.amount) || 0;
      if (f.type === 'income') report.finance.income += amt;
      else report.finance.expenses += amt;
      const point = financeSeries.find((p) => p.date === f.transaction_date);
      if (point) point.value += f.type === 'income' ? amt : -amt;
    }
    report.finance.net = report.finance.income - report.finance.expenses;
    report.finance.perDay = financeSeries;

    return report;
  } catch (err) {
    console.error('Unexpected error in getReport:', err);
    return null;
  }
}
