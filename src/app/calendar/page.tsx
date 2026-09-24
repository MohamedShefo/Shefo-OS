import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getEvents } from '@/features/calendar/actions';
import { EventDialog, EventList } from '@/features/calendar/components/event-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Calendar',
  description: 'Internal events and schedule.',
};

interface CalendarPageProps {
  searchParams: Promise<{ month?: string; q?: string }>;
}

function monthRange(month: string): { from: string; to: string; label: string } {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));
  return {
    from: start.toISOString(),
    to: end.toISOString(),
    label: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  };
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = /^\d{4}-\d{2}$/.test(params.month ?? '') ? (params.month as string) : defaultMonth;
  const searchQuery = (params.q ?? '').trim();
  const { from, to, label } = monthRange(month);
  const events = await getEvents(from, to, searchQuery || undefined);

  const daysWithEvents = new Set(events.map((e) => new Date(e.starts_at).toISOString().slice(0, 10)));
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const cells: Array<string | null> = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Calendar"
        description={`${label} · ${events.length} event${events.length === 1 ? '' : 's'}`}
        actions={
          <>
            <span className="flex items-center gap-1">
              <Link href={`/calendar?month=${shiftMonth(month, -1)}`}>
                <Button variant="outline" size="sm" className="h-8 px-2.5" aria-label="Previous month">
                  ←
                </Button>
              </Link>
              <Link href="/calendar">
                <Button variant="outline" size="sm" className="h-8">
                  Today
                </Button>
              </Link>
              <Link href={`/calendar?month=${shiftMonth(month, 1)}`}>
                <Button variant="outline" size="sm" className="h-8 px-2.5" aria-label="Next month">
                  →
                </Button>
              </Link>
            </span>
            <EventDialog />
          </>
        }
      />

      <section className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => (
            <div
              key={i}
              className={`flex min-h-10 items-center justify-center rounded-md text-xs ${
                day === null
                  ? ''
                  : day === todayISO
                    ? 'bg-primary font-bold text-primary-foreground'
                    : daysWithEvents.has(day)
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {day ? Number(day.slice(8)) : ''}
              {day && daysWithEvents.has(day) && day !== todayISO && (
                <span aria-hidden="true" className="ms-0.5 inline-block h-1 w-1 rounded-full bg-primary" />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 px-1 text-sm font-semibold tracking-tight text-foreground">
            Events
            <Badge variant="secondary">{events.length}</Badge>
          </h2>
          <form action="/calendar" method="get" className="flex items-center gap-2">
            <input type="hidden" name="month" value={month} />
            <input
              type="search"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search events…"
              aria-label="Search events"
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20 w-full sm:w-56"
            />
            <Button type="submit" variant="outline" size="sm" className="h-8 shrink-0">
              Search
            </Button>
            {searchQuery && (
              <Link
                href={`/calendar?month=${month}`}
                className="text-[11px] text-muted-foreground hover:text-foreground shrink-0"
              >
                Clear
              </Link>
            )}
          </form>
        </div>
        <EventList events={events} />
      </section>
    </AppShell>
  );
}
