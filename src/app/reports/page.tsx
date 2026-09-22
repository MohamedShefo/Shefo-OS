import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getReport } from '@/features/reports/actions';
import { BarChart, DonutChart, formatMoney } from '@/components/common/charts';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Reports',
  description: 'Weekly, monthly, and custom period summaries.',
};

interface ReportsPageProps {
  searchParams: Promise<{ days?: string }>;
}

const PRESETS = [7, 14, 30, 90] as const;

function rangeFor(days: number): { from: string; to: string } {
  const to = new Date().toISOString().slice(0, 10);
  const d = new Date(`${to}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return { from: d.toISOString().slice(0, 10), to };
}

function shortLabel(dateISO: string): string {
  return dateISO.slice(5).replace('-', '/');
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const parsed = Number(params.days);
  const days = (PRESETS as readonly number[]).includes(parsed) ? parsed : 30;
  const { from, to } = rangeFor(days);
  const report = await getReport(from, to);

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Reports"
        description={report ? `Last ${days} days · ${from} → ${to}` : 'Pick a period.'}
        actions={
          <>
            <div className="flex items-center gap-1">
              {PRESETS.map((d) => (
                <Link key={d} href={`/reports?days=${d}`}>
                  <Button
                    variant={d === days ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 px-2.5"
                  >
                    {d}d
                  </Button>
                </Link>
              ))}
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">
                Home
              </Button>
            </Link>
          </>
        }
      />

      {!report ? (
        <p className="text-xs text-destructive">Could not build this report. Try again.</p>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Tasks Created</p>
              <p className="text-2xl font-bold tabular-nums">{report.tasks.created}</p>
              <p className="text-[11px] text-muted-foreground">
                {report.tasks.done} done overall · {report.tasks.total} total
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Captures</p>
              <p className="text-2xl font-bold tabular-nums">{report.captures.created}</p>
              <p className="text-[11px] text-muted-foreground">
                {report.captures.unprocessed} unprocessed
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Habit Completions</p>
              <p className="text-2xl font-bold tabular-nums">{report.habits.completions}</p>
              <p className="text-[11px] text-muted-foreground">
                {report.habits.activeHabits} active habits
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Net Finance</p>
              <p className={`text-2xl font-bold tabular-nums ${report.finance.net < 0 ? 'text-destructive' : ''}`}>
                {formatMoney(report.finance.net)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                +{formatMoney(report.finance.income)} / −{formatMoney(report.finance.expenses)}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Notes · Projects</p>
              <p className="text-2xl font-bold tabular-nums">
                {report.notes.created} <span className="text-sm font-medium text-muted-foreground">/ {report.projects.created}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {report.projects.active} active projects
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Journal</p>
              <p className="text-2xl font-bold tabular-nums">{report.journal.activeDays}</p>
              <p className="text-[11px] text-muted-foreground">
                active days · {report.journal.entries} entries
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Goals</p>
              <p className="text-2xl font-bold tabular-nums">{report.goals.active}</p>
              <p className="text-[11px] text-muted-foreground">
                {report.goals.completed} completed · {report.goals.created} new
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Tasks Created per Day</h2>
              <BarChart
                data={report.tasks.perDay.map((p) => ({ label: shortLabel(p.date), value: p.value }))}
                ariaLabel="Tasks created per day"
              />
            </section>
            <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Habit Completions per Day</h2>
              <BarChart
                data={report.habits.perDay.map((p) => ({ label: shortLabel(p.date), value: p.value }))}
                ariaLabel="Habit completions per day"
              />
            </section>
            <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Daily Net Finance</h2>
              <BarChart
                data={report.finance.perDay.map((p) => ({ label: shortLabel(p.date), value: Math.round(p.value * 100) / 100 }))}
                ariaLabel="Daily net finance"
              />
            </section>
            <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Tasks by Status</h2>
              <DonutChart
                data={report.tasks.byStatus.map((s) => ({ label: s.status.replace('_', ' '), value: s.count }))}
                ariaLabel="Tasks by status"
              />
            </section>
          </div>

          <p className="text-[11px] text-muted-foreground px-1">
            Task completion is reported as a current snapshot because tasks carry no completion
            timestamp — only creation dates feed the trends.
          </p>
        </>
      )}
    </AppShell>
  );
}
