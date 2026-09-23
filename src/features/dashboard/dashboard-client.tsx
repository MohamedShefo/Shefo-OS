'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { CalendarEvent, Capture, Goal, JournalEntry, Note, Project, Task } from '@/types/database';
import type { HabitWithProgress } from '@/features/habits/actions';
import type { MonthSummary } from '@/features/finance/actions';
import {
  saveDashboardPrefs,
  type DashboardPrefs,
  type DashboardWidgetId,
} from '@/features/dashboard/actions';
import { DASHBOARD_WIDGET_IDS } from '@/features/dashboard/config';
import {
  ActivityWidget,
  CapturesWidget,
  FinanceWidget,
  GoalsWidget,
  HabitsWidget,
  JournalWidget,
  NotesWidget,
  ProjectsWidget,
  TasksWidget,
  TimerInlineWidget,
} from '@/features/dashboard/widgets';
import { CaptureInput } from '@/features/captures/components/capture-input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/page-header';

interface DashboardData {
  captures: Capture[];
  projects: Project[];
  notes: Note[];
  tasks: Task[];
  habits: HabitWithProgress[];
  journal: JournalEntry[];
  goals: Goal[];
  goalProgressById: Record<string, number>;
  upcoming: CalendarEvent[];
  financeSummary: MonthSummary;
  financeMonth: string;
  activity: { captures: number; tasksDone: number; tasksTotal: number; notes: number; activeProjects: number };
}

const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  tasks: 'Tasks',
  projects: 'Projects',
  notes: 'Recent Notes',
  captures: 'Captures',
  habits: 'Habits',
  journal: 'Journal',
  timer: 'Timer',
  goals: 'Goals',
  finance: 'Finance summary',
  activity: 'Activity summary',
};

/** Full-bleed minimal mode: capture + current work + timer, nothing else. */
const FOCUS_WIDGETS: DashboardWidgetId[] = ['captures', 'tasks', 'timer', 'habits'];

export function DashboardClient({
  email,
  data,
  initialPrefs,
}: {
  email: string | null;
  data: DashboardData;
  initialPrefs: DashboardPrefs;
}) {
  const [mode, setMode] = useState(initialPrefs.mode);
  const [widgets, setWidgets] = useState<DashboardWidgetId[]>(initialPrefs.widgets);
  const [customizing, setCustomizing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const persist = (nextMode: DashboardPrefs['mode'], nextWidgets: DashboardWidgetId[]) => {
    startTransition(async () => {
      await saveDashboardPrefs({ mode: nextMode, widgets: nextWidgets });
    });
  };

  const switchMode = (next: DashboardPrefs['mode']) => {
    setMode(next);
    persist(next, widgets);
  };

  const toggleWidget = (id: DashboardWidgetId) => {
    const next = widgets.includes(id) ? widgets.filter((w) => w !== id) : [...widgets, id];
    const ordered = DASHBOARD_WIDGET_IDS.filter((w) => next.includes(w));
    const finalWidgets = ordered.length > 0 ? ordered : [...DASHBOARD_WIDGET_IDS];
    setWidgets(finalWidgets);
    persist(mode, finalWidgets);
  };

  const moveWidget = (id: DashboardWidgetId, dir: -1 | 1) => {
    const next = [...widgets];
    const i = next.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setWidgets(next);
    persist(mode, next);
  };

  const resetLayout = () => {
    const next = [...DASHBOARD_WIDGET_IDS];
    setWidgets(next);
    persist(mode, next);
  };

  const renderWidget = (id: DashboardWidgetId) => {
    switch (id) {
      case 'tasks':
        return <TasksWidget tasks={data.tasks} />;
      case 'projects':
        return <ProjectsWidget projects={data.projects} />;
      case 'notes':
        return <NotesWidget notes={data.notes} />;
      case 'captures':
        return <CapturesWidget captures={data.captures} />;
      case 'habits':
        return <HabitsWidget habits={data.habits} />;
      case 'journal':
        return <JournalWidget entries={data.journal} />;
      case 'timer':
        return <TimerInlineWidget />;
      case 'goals':
        return <GoalsWidget goals={data.goals} progressByGoal={data.goalProgressById} />;
      case 'finance':
        return <FinanceWidget summary={data.financeSummary} month={data.financeMonth} />;
      case 'activity':
        return <ActivityWidget stats={data.activity} upcoming={data.upcoming} />;
    }
  };

  const focus = mode === 'focus';
  const visibleWidgets = focus ? FOCUS_WIDGETS.filter((w) => widgets.includes(w)) : widgets;

  return (
    <>
      <PageHeader
        title={focus ? 'Focus' : 'Shefo OS Command Center'}
        description={focus ? 'Less noise. Current work, capture, timer.' : `Welcome back, ${email}`}
        actions={
          <>
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5" role="tablist" aria-label="Dashboard mode">
              {(['normal', 'focus'] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchMode(m)}
                  disabled={isPending}
                  className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${
                    mode === m
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {!focus && (
              <Button variant="outline" size="sm" onClick={() => setCustomizing((v) => !v)}>
                {customizing ? 'Done' : 'Customize'}
              </Button>
            )}
          </>
        }
      />

      {customizing && !focus && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Widgets</h2>
            <button onClick={resetLayout} className="text-[11px] text-muted-foreground hover:text-foreground">
              Reset layout
            </button>
          </div>
          <div className="space-y-1.5">
            {DASHBOARD_WIDGET_IDS.map((id) => {
              const on = widgets.includes(id);
              const idx = widgets.indexOf(id);
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleWidget(id)}
                    aria-label={`Show ${WIDGET_LABELS[id]} widget`}
                    className="h-4 w-4 rounded border-border cursor-pointer"
                  />
                  <span className={`flex-1 font-medium ${on ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {WIDGET_LABELS[id]}
                  </span>
                  <button
                    onClick={() => moveWidget(id, -1)}
                    disabled={!on || idx <= 0}
                    aria-label={`Move ${WIDGET_LABELS[id]} up`}
                    className="px-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveWidget(id, 1)}
                    disabled={!on || idx < 0 || idx >= widgets.length - 1}
                    aria-label={`Move ${WIDGET_LABELS[id]} down`}
                    className="px-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {focus ? (
        <div className="max-w-2xl mx-auto w-full space-y-6">
          <section className="p-6 rounded-xl border border-border bg-card shadow-xs space-y-3">
            <h2 className="text-base font-semibold tracking-tight">Instant Thought Capture</h2>
            <CaptureInput />
          </section>
          <div className="grid grid-cols-1 gap-6">
            {visibleWidgets.map((id) => (
              <div key={id}>{renderWidget(id)}</div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 text-xs">
            <Link href="/tasks" className="text-primary hover:underline font-medium">Tasks →</Link>
            <Link href="/capture" className="text-primary hover:underline font-medium">Capture →</Link>
            <Link href="/reports" className="text-primary hover:underline font-medium">Reports →</Link>
          </div>
        </div>
      ) : (
        <>
          <section className="p-6 rounded-xl border border-border bg-card shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">Instant Thought Capture</h2>
              <span className="text-xs text-muted-foreground">Press Enter ↵ to capture</span>
            </div>
            <CaptureInput />
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleWidgets.map((id) => (
              <div key={id}>{renderWidget(id)}</div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
