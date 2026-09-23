'use client';

import Link from 'next/link';
import type { CalendarEvent, Capture, Goal, JournalEntry, Note, Project, Task } from '@/types/database';
import type { HabitWithProgress } from '@/features/habits/actions';
import type { MonthSummary } from '@/features/finance/actions';
import { formatTimer, useTimer } from '@/features/timer/use-timer';
import { ProgressBar } from '@/features/goals/progress';
import { formatMoney } from '@/lib/format';
import { todayISO } from '@/lib/date';
import { normalizeTags } from '@/lib/utils';

function Card({
  title,
  count,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  count?: number;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            {title}
            {count !== undefined && (
              <span className="text-muted-foreground font-medium">({count})</span>
            )}
          </h3>
          <Link href={href} className="text-xs text-primary hover:underline font-medium">
            {hrefLabel} →
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TasksWidget({ tasks }: { tasks: Task[] }) {
  const pending = tasks.filter((t) => t.status !== 'done');
  const overdue = pending.filter((t) => t.due_date && t.due_date.slice(0, 10) < todayISO());
  const top = [...pending]
    .sort((a, b) => {
      const aOver = a.due_date && a.due_date.slice(0, 10) < todayISO() ? 0 : 1;
      const bOver = b.due_date && b.due_date.slice(0, 10) < todayISO() ? 0 : 1;
      return aOver - bOver;
    })
    .slice(0, 4);
  return (
    <Card title="✅ Pending Tasks" count={pending.length} href="/tasks" hrefLabel="View All">
      {overdue.length > 0 && (
        <p className="text-[11px] font-medium text-destructive">
          🔴 {overdue.length} overdue
        </p>
      )}
      {top.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No pending tasks.</p>
      ) : (
        <div className="space-y-2">
          {top.map((t) => {
            const isOver = !!t.due_date && t.due_date.slice(0, 10) < todayISO();
            return (
              <div key={t.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 text-xs border border-border/50">
                <span className="font-medium text-foreground truncate max-w-[200px]">{t.title}</span>
                <span className={`capitalize text-[10px] shrink-0 ${isOver ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                  {isOver ? 'overdue' : t.status.replace('_', ' ')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function ProjectsWidget({ projects }: { projects: Project[] }) {
  const active = projects.filter((p) => p.status === 'active').slice(0, 3);
  return (
    <Card title="📁 Active Projects" count={projects.filter((p) => p.status === 'active').length} href="/projects" hrefLabel="View All">
      {active.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No active projects.</p>
      ) : (
        <div className="space-y-2">
          {active.map((p) => (
            <div key={p.id} className="p-2.5 rounded-md bg-muted/40 text-xs border border-border/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground truncate">{p.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 capitalize shrink-0">
                  {p.status}
                </span>
              </div>
              {p.description && (
                <p className="text-[11px] text-muted-foreground line-clamp-1">{p.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function NotesWidget({ notes }: { notes: Note[] }) {
  const top = notes.slice(0, 3);
  return (
    <Card title="📝 Recent Notes" count={notes.length} href="/notes" hrefLabel="View All">
      {top.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No notes created yet.</p>
      ) : (
        <div className="space-y-2">
          {top.map((n) => {
            const tags = normalizeTags(n.tags);
            return (
              <div key={n.id} className="p-2.5 rounded-md bg-muted/40 text-xs border border-border/50 space-y-1">
                <span className="font-semibold text-foreground block truncate">{n.title}</span>
                {tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function CapturesWidget({ captures }: { captures: Capture[] }) {
  const top = captures.slice(0, 3);
  return (
    <Card title="📥 Unprocessed Inbox" count={captures.length} href="/capture" hrefLabel="Process Inbox">
      {top.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Inbox is empty.</p>
      ) : (
        <div className="space-y-2">
          {top.map((c) => (
            <div key={c.id} className="p-2.5 rounded-md bg-muted/40 text-xs border border-border/50 text-muted-foreground truncate">
              {c.raw_text}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function HabitsWidget({ habits }: { habits: HabitWithProgress[] }) {
  const active = habits.filter((h) => h.is_active);
  return (
    <Card title="🔁 Habits Today" count={active.filter((h) => h.doneToday).length} href="/habits" hrefLabel="Open Habits">
      {active.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No active habits.</p>
      ) : (
        <div className="space-y-2">
          {active.slice(0, 4).map((h) => (
            <div key={h.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 text-xs border border-border/50">
              <span className={`font-medium truncate ${h.doneToday ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {h.name}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {h.doneToday ? '✓ done' : h.streak > 0 ? `🔥 ${h.streak}` : '○ today'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function JournalWidget({ entries }: { entries: JournalEntry[] }) {
  return (
    <Card title="📔 Journal" count={entries.length} href="/journal" hrefLabel="Open Journal">
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No entries yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.slice(0, 3).map((e) => (
            <Link
              key={e.id}
              href={`/journal?date=${e.entry_date}`}
              className="block p-2.5 rounded-md bg-muted/40 text-xs border border-border/50 hover:border-ring/40 transition-all"
            >
              <span className="font-semibold text-foreground block truncate">
                {e.title || e.entry_date}
              </span>
              <span className="text-[10px] text-muted-foreground">{e.entry_date}</span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

export function GoalsWidget({ goals, progressByGoal }: { goals: Goal[]; progressByGoal: Record<string, number> }) {
  const active = goals.filter((g) => g.status === 'active').slice(0, 3);
  return (
    <Card title="🎯 Active Goals" count={goals.filter((g) => g.status === 'active').length} href="/goals" hrefLabel="View All">
      {active.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No active goals.</p>
      ) : (
        <div className="space-y-3">
          {active.map((g) => {
            const pct = progressByGoal[g.id] ?? 0;
            return (
              <div key={g.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <Link href={`/goals/${g.id}`} className="font-medium text-foreground truncate hover:underline">
                    {g.title}
                  </Link>
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {pct}%
                  </span>
                </div>
                <ProgressBar value={pct} label={`Goal ${g.title} progress`} />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function FinanceWidget({ summary, month }: { summary: MonthSummary; month: string }) {
  return (
    <Card title={`💰 Finance · ${month.slice(5)}`} href="/finance" hrefLabel="Open Finance">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">In</p>
          <p className="text-sm font-bold tabular-nums">+{formatMoney(summary.income)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Out</p>
          <p className="text-sm font-bold tabular-nums text-destructive">−{formatMoney(summary.expenses)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Net</p>
          <p className={`text-sm font-bold tabular-nums ${summary.net < 0 ? 'text-destructive' : ''}`}>
            {formatMoney(summary.net)}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        {summary.transactionCount} transaction{summary.transactionCount === 1 ? '' : 's'} this month
      </p>
    </Card>
  );
}

export function ActivityWidget({
  stats,
  upcoming,
}: {
  stats: { captures: number; tasksDone: number; tasksTotal: number; notes: number; activeProjects: number };
  upcoming: CalendarEvent[];
}) {
  const rows: Array<[string, string]> = [
    ['Unprocessed inbox', String(stats.captures)],
    ['Tasks done', `${stats.tasksDone}/${stats.tasksTotal}`],
    ['Notes total', String(stats.notes)],
    ['Active projects', String(stats.activeProjects)],
  ];
  return (
    <Card title="⚡ Activity" href="/reports" hrefLabel="Reports">
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-bold tabular-nums">{value}</span>
          </div>
        ))}
      </div>
      {upcoming.length > 0 && (
        <div className="space-y-1.5 border-t border-border/50 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Up next
          </p>
          {upcoming.slice(0, 2).map((e) => (
            <Link
              key={e.id}
              href="/calendar"
              className="block truncate text-xs text-foreground hover:underline"
            >
              📅 {e.title}{' '}
              <span className="text-muted-foreground">
                {new Date(e.starts_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

export function TimerInlineWidget() {
  const { remainingMs, phase, start, pause, reset } = useTimer(25);
  return (
    <div className="p-5 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-3">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <h3 className="font-semibold text-sm">⏱ Focus Timer</h3>
        <span className="text-[10px] text-muted-foreground capitalize">{phase}</span>
      </div>
      <p className="text-center text-3xl font-bold tabular-nums tracking-tight" role="timer" aria-live="polite">
        {phase === 'done' ? 'Done!' : formatTimer(remainingMs)}
      </p>
      <div className="flex items-center gap-2">
        {phase === 'running' ? (
          <button
            onClick={pause}
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            Pause
          </button>
        ) : (
          <button
            onClick={() => start(25)}
            className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {phase === 'paused' ? 'Restart 25m' : 'Start 25m'}
          </button>
        )}
        <button
          onClick={reset}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset
        </button>
      </div>
      <Link href="/tasks" className="text-xs text-primary hover:underline font-medium text-center">
        What are you focusing on? →
      </Link>
    </div>
  );
}
