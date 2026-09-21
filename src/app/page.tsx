import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { logout } from './auth-actions';
import { getUnprocessedCaptures } from '@/features/captures/actions';
import { getProjects } from '@/features/projects/actions';
import { getNotes } from '@/features/notes/actions';
import { getTasks } from '@/features/tasks/actions';
import { CaptureInput } from '@/features/captures/components/capture-input';
import { Button } from '@/components/ui/button';
import { normalizeTags } from '@/lib/utils';

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

  // Authenticated user data fetching
  const [captures, projects, notes, tasks] = await Promise.all([
    getUnprocessedCaptures(),
    getProjects(),
    getNotes(),
    getTasks(),
  ]);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const pendingTasks = tasks.filter((t) => t.status !== 'done');
  const topCaptures = captures.slice(0, 3);
  const topNotes = notes.slice(0, 3);
  const topTasks = pendingTasks.slice(0, 4);
  const topProjects = activeProjects.slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Shefo OS Command Center</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, <span className="font-semibold text-foreground">{user.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/capture">
              <Button size="sm" variant="default">⚡ Capture</Button>
            </Link>
            <Link href="/projects">
              <Button size="sm" variant="secondary">📁 Projects</Button>
            </Link>
            <Link href="/notes">
              <Button size="sm" variant="outline">📝 Notes</Button>
            </Link>
            <Link href="/tasks">
              <Button size="sm" variant="outline">✅ Tasks</Button>
            </Link>
            <form action={logout}>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive">
                Sign Out
              </Button>
            </form>
          </div>
        </div>

        {/* Stats Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Unprocessed Inbox</p>
            <p className="text-2xl font-bold">{captures.length}</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Pending Tasks</p>
            <p className="text-2xl font-bold">{pendingTasks.length}</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Active Projects</p>
            <p className="text-2xl font-bold">{activeProjects.length}</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Total Notes</p>
            <p className="text-2xl font-bold">{notes.length}</p>
          </div>
        </div>

        {/* Inline Fast Capture Section */}
        <div className="p-6 rounded-xl border border-border bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">Instant Thought Capture</h2>
            <span className="text-xs text-muted-foreground">Press Enter ↵ to capture</span>
          </div>
          <CaptureInput />
        </div>

        {/* 2x2 Command Center Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Urgent & Pending Tasks */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  ✅ Pending Tasks ({pendingTasks.length})
                </h3>
                <Link href="/tasks" className="text-xs text-primary hover:underline font-medium">
                  View All →
                </Link>
              </div>

              {topTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No pending tasks.</p>
              ) : (
                <div className="space-y-2">
                  {topTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 text-xs border border-border/50">
                      <span className="font-medium text-foreground truncate max-w-[200px]">{t.title}</span>
                      <div className="flex items-center gap-2">
                        {t.priority && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-primary/10 text-primary">
                            {t.priority}
                          </span>
                        )}
                        <span className="capitalize text-[10px] text-muted-foreground">{t.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Active Projects */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  📁 Active Projects ({activeProjects.length})
                </h3>
                <Link href="/projects" className="text-xs text-primary hover:underline font-medium">
                  View All →
                </Link>
              </div>

              {topProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No active projects.</p>
              ) : (
                <div className="space-y-2">
                  {topProjects.map((p) => (
                    <div key={p.id} className="p-2.5 rounded-md bg-muted/40 text-xs border border-border/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{p.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 capitalize">
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
            </div>
          </div>

          {/* Card 3: Recent Notes */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  📝 Recent Notes & Concepts ({notes.length})
                </h3>
                <Link href="/notes" className="text-xs text-primary hover:underline font-medium">
                  View All →
                </Link>
              </div>

              {topNotes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No notes created yet.</p>
              ) : (
                <div className="space-y-2">
                  {topNotes.map((n) => {
                    const tags = normalizeTags(n.tags);
                    return (
                      <div key={n.id} className="p-2.5 rounded-md bg-muted/40 text-xs border border-border/50 space-y-1">
                        <span className="font-semibold text-foreground block">{n.title}</span>
                        {tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {tags.map((tag) => (
                              <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Unprocessed Captures */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  📥 Unprocessed Inbox ({captures.length})
                </h3>
                <Link href="/capture" className="text-xs text-primary hover:underline font-medium">
                  Process Inbox →
                </Link>
              </div>

              {topCaptures.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Inbox is empty.</p>
              ) : (
                <div className="space-y-2">
                  {topCaptures.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-md bg-muted/40 text-xs border border-border/50 text-muted-foreground truncate">
                      {c.raw_text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
