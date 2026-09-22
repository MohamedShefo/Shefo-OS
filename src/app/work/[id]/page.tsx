import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getWorkExperienceById, getWorkRelations } from '@/features/work/actions';
import { getProjects } from '@/features/projects/actions';
import { getSkills } from '@/features/skills/actions';
import { getNotesByWork } from '@/features/notes/actions';
import { WorkDialog } from '@/features/work/components/work-dialog';
import { WorkProjectManager, WorkSkillManager } from '@/features/work/components/work-link-managers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Workplace Details',
  description: 'Workplace hub with related projects, skills, and notes.',
};

interface WorkDetailPageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(d: string | null): string | null {
  if (!d) return null;
  return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
}

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const work = await getWorkExperienceById(id);
  if (!work) {
    notFound();
  }

  const [{ projects: linkedProjects, skills: linkedSkills }, notes, allProjects, allSkills] =
    await Promise.all([
      getWorkRelations(id),
      getNotesByWork(id),
      getProjects(),
      getSkills(),
    ]);

  const start = fmtDate(work.start_date);
  const end = work.is_current ? 'Present' : (fmtDate(work.end_date) ?? '—');

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title={work.organization}
        description={
          [work.role, start ? `${start} → ${end}` : null].filter(Boolean).join(' · ') ||
          'Workplace hub.'
        }
        actions={
          <>
            <Link href="/work">
              <Button variant="outline" size="sm">
                All Workplaces
              </Button>
            </Link>
            {work.is_current && <Badge variant="secondary">Current</Badge>}
            <WorkDialog work={work} buttonLabel="Edit" dialogTitle="Edit Workplace" />
          </>
        }
      />

      {(work.description || work.responsibilities || work.key_people) && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
          {work.description && (
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {work.description}
            </p>
          )}
          {work.responsibilities && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Responsibilities
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {work.responsibilities}
              </p>
            </div>
          )}
          {work.key_people && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Key People
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {work.key_people}
              </p>
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground px-1 flex items-center gap-2">
          Linked Projects
          <Badge variant="secondary">{linkedProjects.length}</Badge>
        </h2>
        <WorkProjectManager workId={work.id} linkedProjects={linkedProjects} allProjects={allProjects} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground px-1 flex items-center gap-2">
          Linked Skills
          <Badge variant="secondary">{linkedSkills.length}</Badge>
        </h2>
        <WorkSkillManager workId={work.id} linkedSkills={linkedSkills} allSkills={allSkills} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground px-1 flex items-center gap-2">
          Linked Notes
          <Badge variant="secondary">{notes.length}</Badge>
        </h2>
        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">
            No notes linked to this workplace yet. Link them from a note.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notes.map((n) => (
              <Link
                key={n.id}
                href={`/notes/${n.id}`}
                className="rounded-lg border border-border bg-card p-4 text-xs shadow-xs transition-all hover:border-ring/40"
              >
                <p className="font-semibold text-sm text-foreground truncate">{n.title}</p>
                {n.content && (
                  <p className="mt-1 text-muted-foreground line-clamp-2">{n.content}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
