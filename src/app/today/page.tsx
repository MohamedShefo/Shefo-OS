import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getTasks } from '@/features/tasks/actions';
import { getUpcomingEvents } from '@/features/calendar/actions';
import { getUnreadCount, getRecentNotifications } from '@/features/notifications/actions';
import { getUnprocessedCaptures } from '@/features/captures/actions';
import { getNotes } from '@/features/notes/actions';
import { getHabits } from '@/features/habits/actions';
import { getJournalEntry } from '@/features/journal/actions';
import { todayISO } from '@/lib/date';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Today',
  description: 'Deterministic daily overview from your own data.',
};

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const today = todayISO();
  const [tasks, events, unread, notifications, captures, notes, journal, habits] = await Promise.all([
    getTasks(),
    getUpcomingEvents(2, 10),
    getUnreadCount(),
    getRecentNotifications(5),
    getUnprocessedCaptures(),
    getNotes(),
    getJournalEntry(today),
    getHabits(),
  ]);

  const pendingHabits = habits.filter((h) => h.is_active && !h.doneToday);

  const overdue = tasks.filter((t) => t.due_date && t.due_date.slice(0, 10) < today && t.status !== 'done');
  const dueToday = tasks.filter((t) => t.due_date && t.due_date.slice(0, 10) === today && t.status !== 'done');
  const remindersDue = tasks.filter(
    (t) => t.reminder_at && t.reminder_at <= new Date().toISOString() && t.status !== 'done'
  );

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Today"
        description={new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        actions={
          <Link href="/journal">
            <Button variant="outline" size="sm">
              📔 Journal
            </Button>
          </Link>
        }
      />

      {(overdue.length > 0 || remindersDue.length > 0) && (
        <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 shadow-xs space-y-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Needs attention</h2>
          {overdue.map((t) => (
            <p key={t.id} className="text-xs text-foreground">
              🔴 Overdue:{' '}
              <Link href="/tasks" className="font-medium hover:underline">
                {t.title}
              </Link>{' '}
              <span className="text-muted-foreground">
                (due {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'})
              </span>
            </p>
          ))}
          {remindersDue.map((t) => (
            <p key={t.id} className="text-xs text-foreground">
              ⏰ Reminder:{' '}
              <Link href="/tasks" className="font-medium hover:underline">
                {t.title}
              </Link>
            </p>
          ))}
        </section>
      )}

      <section className="flex flex-wrap items-center gap-2">
        <Link href="/tasks">
          <Button size="sm">+ New Task</Button>
        </Link>
        <Link href="/capture">
          <Button size="sm" variant="secondary">
            ⚡ Capture
          </Button>
        </Link>
        <Link href="/calendar">
          <Button size="sm" variant="outline">
            📅 Calendar
          </Button>
        </Link>
        <Link href="/journal">
          <Button size="sm" variant="outline">
            📔 Journal
          </Button>
        </Link>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            ✅ Due Today
            <Badge variant="secondary">{dueToday.length}</Badge>
          </h2>
          {dueToday.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing due today.</p>
          ) : (
            dueToday.slice(0, 5).map((t) => (
              <Link
                key={t.id}
                href="/tasks"
                className="block text-xs text-foreground truncate hover:underline"
              >
                · {t.title}
              </Link>
            ))
          )}
          <Link href="/tasks" className="block text-xs text-primary hover:underline font-medium">
            All tasks →
          </Link>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            📅 Upcoming Events
            <Badge variant="secondary">{events.length}</Badge>
          </h2>
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground">No events in the next 2 days.</p>
          ) : (
            events.slice(0, 5).map((e) => (
              <p key={e.id} className="text-xs text-foreground truncate">
                · {e.title}{' '}
                <span className="text-muted-foreground">
                  {new Date(e.starts_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </p>
            ))
          )}
          <Link href="/calendar" className="block text-xs text-primary hover:underline font-medium">
            Calendar →
          </Link>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            🔔 Notifications
            <Badge variant="secondary">{unread}</Badge>
          </h2>
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground">All caught up.</p>
          ) : (
            notifications.slice(0, 4).map((n) => (
              <p key={n.id} className="text-xs text-foreground truncate">
                {!n.read_at && <span aria-hidden="true" className="me-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />}
                {n.title}
              </p>
            ))
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">📥 Inbox & Notes</h2>
          <p className="text-xs text-muted-foreground">
            {captures.length} unprocessed capture{captures.length === 1 ? '' : 's'} ·{' '}
            {notes.length} note{notes.length === 1 ? '' : 's'} total
          </p>
          {captures.slice(0, 3).map((c) => (
            <p key={c.id} className="text-xs text-muted-foreground truncate">
              · {c.raw_text}
            </p>
          ))}
          <span className="flex gap-3">
            <Link href="/capture" className="text-xs text-primary hover:underline font-medium">
              Capture →
            </Link>
            <Link href="/notes" className="text-xs text-primary hover:underline font-medium">
              Notes →
            </Link>
          </span>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            🔁 Habits Left Today
            <Badge variant="secondary">{pendingHabits.length}</Badge>
          </h2>
          {pendingHabits.length === 0 ? (
            <p className="text-xs text-muted-foreground">All habits done — or none active.</p>
          ) : (
            pendingHabits.slice(0, 5).map((h) => (
              <p key={h.id} className="text-xs text-foreground truncate">
                ○ {h.name}
                {h.streak > 0 && (
                  <span className="text-muted-foreground"> · 🔥 {h.streak}</span>
                )}
              </p>
            ))
          )}
          <Link href="/habits" className="block text-xs text-primary hover:underline font-medium">
            Check off habits →
          </Link>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2 md:col-span-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">📔 Today&apos;s Journal</h2>
          {journal ? (
            <p className="text-xs text-foreground truncate">
              {journal.title || 'Untitled entry'} —{' '}
              <span className="text-muted-foreground">
                {(journal.content ?? '').slice(0, 120) || 'Empty entry'}
              </span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No entry yet today.</p>
          )}
          <Link href="/journal" className="block text-xs text-primary hover:underline font-medium">
            {journal ? 'Continue writing →' : 'Start today’s entry →'}
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
