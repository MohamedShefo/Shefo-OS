import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { globalSearch, type SearchResult } from '@/features/search/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Search',
  description: 'Search across captures, notes, projects, tasks, and more.',
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

const ENTITY_ICON: Record<SearchResult['entityType'], string> = {
  capture: '📥',
  note: '📝',
  project: '📁',
  task: '✅',
  work: '💼',
  skill: '🧠',
  journal: '📔',
  habit: '🔁',
  goal: '🎯',
  finance: '💰',
};

const ENTITY_LABEL: Record<SearchResult['entityType'], string> = {
  capture: 'Capture',
  note: 'Note',
  project: 'Project',
  task: 'Task',
  work: 'Work',
  skill: 'Skill',
  journal: 'Journal',
  habit: 'Habit',
  goal: 'Goal',
  finance: 'Finance',
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const results = q.length >= 2 ? await globalSearch(q) : [];

  const grouped = new Map<SearchResult['entityType'], SearchResult[]>();
  for (const r of results) {
    const list = grouped.get(r.entityType) ?? [];
    list.push(r);
    grouped.set(r.entityType, list);
  }

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Search"
        description="One query across your captures, notes, projects, tasks, and more."
        actions={
          <Link href="/">
            <Button variant="outline" size="sm">
              Home
            </Button>
          </Link>
        }
      />

      <section>
        <form action="/search" method="get" className="flex items-center gap-2">
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search everything… (min 2 characters)"
            aria-label="Search everything"
            className="flex-1"
          />
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>
        <p className="mt-2 px-1 text-[11px] text-muted-foreground">
          Tip: press <kbd className="rounded bg-muted px-1 font-mono">⌘K</kbd> anywhere for instant
          search without leaving the page.
        </p>
      </section>

      {q && (
        <section className="space-y-5">
          {results.length === 0 ? (
            <EmptyState
              title={q.length < 2 ? 'Type at least 2 characters.' : `No results for “${q}”.`}
              description="Try different keywords, or capture the thought for later."
            />
          ) : (
            <>
              <p className="px-1 text-xs text-muted-foreground">
                {results.length} result{results.length === 1 ? '' : 's'} for “{q}”.
              </p>
              {[...grouped.entries()].map(([entity, items]) => (
                <div key={entity} className="space-y-2">
                  <h2 className="flex items-center gap-2 px-1 text-sm font-semibold tracking-tight text-foreground">
                    {ENTITY_ICON[entity]} {ENTITY_LABEL[entity]}
                    <Badge variant="secondary">{items.length}</Badge>
                  </h2>
                  <div className="space-y-2">
                    {items.map((r) => (
                      <Link
                        key={`${r.entityType}-${r.id}`}
                        href={r.href}
                        className="block rounded-lg border border-border bg-card p-3.5 text-xs shadow-xs transition-all hover:border-ring/40"
                      >
                        <p className="font-medium text-sm text-foreground">{r.title}</p>
                        {r.snippet && (
                          <p className="mt-0.5 text-muted-foreground line-clamp-2">{r.snippet}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      )}
    </AppShell>
  );
}
