import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getJournalEntry, getRecentJournalEntries } from '@/features/journal/actions';
import { shiftDateISO, todayISO } from '@/lib/date';
import { JournalEditor } from '@/features/journal/components/journal-editor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Daily Journal',
  description: 'Text-first daily log of work, events, and flow.',
};

interface JournalPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const rawDate = params.date ?? todayISO();
  const entryDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayISO();

  const [entry, recent] = await Promise.all([
    getJournalEntry(entryDate),
    getRecentJournalEntries(14),
  ]);

  const pretty = new Date(`${entryDate}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Daily Journal"
        description={pretty}
        actions={
          <>
            <Link href="/journal">
              <Button variant="outline" size="sm">
                Today
              </Button>
            </Link>
            <div className="flex items-center gap-1">
              <Link href={`/journal?date=${shiftDateISO(entryDate, -1)}`}>
                <Button variant="outline" size="sm" className="h-8 px-2.5" aria-label="Previous day">
                  ←
                </Button>
              </Link>
              <Link href={`/journal?date=${shiftDateISO(entryDate, 1)}`}>
                <Button variant="outline" size="sm" className="h-8 px-2.5" aria-label="Next day">
                  →
                </Button>
              </Link>
            </div>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6 items-start">
        <section>
          <JournalEditor key={entryDate} entryDate={entryDate} entry={entry} />
        </section>

        <aside className="space-y-3">
          <form action="/journal" method="get" className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={entryDate}
              max={shiftDateISO(todayISO(), 365)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
              aria-label="Jump to date"
            />
            <Button type="submit" variant="outline" size="sm" className="h-8 shrink-0">
              Go
            </Button>
          </form>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2">
            <h3 className="text-xs font-semibold tracking-tight text-foreground">Recent</h3>
            {recent.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No entries yet.</p>
            ) : (
              <div className="space-y-1">
                {recent.map((r) => (
                  <Link
                    key={r.id}
                    href={`/journal?date=${r.entry_date}`}
                    className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                      r.entry_date === entryDate
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span className="truncate">{r.title || r.entry_date}</span>
                    {r.entry_date === todayISO() && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        Today
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
