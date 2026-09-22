import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { logout } from './auth-actions';
import { getUnprocessedCaptures } from '@/features/captures/actions';
import { getProjects } from '@/features/projects/actions';
import { getNotes } from '@/features/notes/actions';
import { getTasks } from '@/features/tasks/actions';
import { getHabits } from '@/features/habits/actions';
import { getRecentJournalEntries } from '@/features/journal/actions';
import { getGoals } from '@/features/goals/actions';
import { getMonthSummary } from '@/features/finance/actions';
import { getDashboardPrefs } from '@/features/dashboard/actions';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { DashboardClient } from '@/features/dashboard/dashboard-client';

export const metadata = {
  title: 'Dashboard',
  description: 'Personal Operating System & External Cognitive Cortex',
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground text-center">
        <div className="max-w-md space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight">Shefo OS</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your Personal Operating System & External Cognitive Cortex. Externalize your thoughts, projects, notes, and tasks.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <Link href="/login">
              <Button size="lg" className="font-medium px-6">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="font-medium px-6">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated dashboard data (bounded lists; widgets narrow further).
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [captures, projects, notes, tasks, habits, journal, goals, financeSummary, prefs] =
    await Promise.all([
      getUnprocessedCaptures(),
      getProjects(),
      getNotes(),
      getTasks(),
      getHabits(),
      getRecentJournalEntries(3),
      getGoals('active'),
      getMonthSummary(month),
      getDashboardPrefs(),
    ]);

  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <AppShell userEmail={user.email}>
      <DashboardClient
        email={user.email ?? null}
        data={{
          captures: captures.slice(0, 20),
          projects,
          notes: notes.slice(0, 20),
          tasks,
          habits,
          journal,
          goals,
          financeSummary,
          financeMonth: month,
          activity: {
            captures: captures.length,
            tasksDone: doneTasks.length,
            tasksTotal: tasks.length,
            notes: notes.length,
            activeProjects: projects.filter((p) => p.status === 'active').length,
          },
        }}
        initialPrefs={prefs}
      />
      <form action={logout} className="flex justify-end px-1">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive">
          Sign Out
        </Button>
      </form>
    </AppShell>
  );
}
