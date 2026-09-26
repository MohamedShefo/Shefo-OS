import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getNotes, getNoteTags } from '@/features/notes/actions';
import { getProjects } from '@/features/projects/actions';
import { getWorkExperiences } from '@/features/work/actions';
import { getCurrentWorkspaceId } from '@/features/workspaces/actions';
import { NoteList } from '@/features/notes/components/note-list';
import { CreateNoteDialog } from '@/features/notes/components/create-note-dialog';
import { NoteGraph } from '@/features/notes/components/note-graph';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Notes & Concepts',
  description: 'Structured knowledge items and notes management.',
};

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const workspaceId = await getCurrentWorkspaceId();
  const [notes, projects, works, tags] = await Promise.all([
    getNotes(workspaceId),
    getProjects(),
    getWorkExperiences(),
    getNoteTags(),
  ]);

  const graphNeighbors = [...notes]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 8)
    .map((n) => ({
      key: `note-${n.id}`,
      label: n.title,
      kind: 'note' as const,
      href: `/notes/${n.id}`,
    }));

  return (
    <AppShell userEmail={user.email}>
      {/* Header */}
      <PageHeader
        title="Notes & Concepts"
        description="Externalize knowledge, meeting notes, and core concepts."
        actions={
          <>
            <Link href="/">
              <Button variant="outline" size="sm">
                Home
              </Button>
            </Link>
            <CreateNoteDialog projects={projects} works={works} workspaceId={workspaceId} />
          </>
        }
      />

      {/* Note List / Grid + Knowledge Graph split (stacks on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
        <section className="min-w-0">
          <NoteList initialNotes={notes} projects={projects} works={works} tags={tags} />
        </section>
        <aside aria-label="Knowledge graph" className="min-w-0 lg:sticky lg:top-4 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Graph
          </h2>
          <NoteGraph centerLabel="Notes" neighbors={graphNeighbors} />
        </aside>
      </div>
    </AppShell>
  );
}
