import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getNotes, getNoteTags } from '@/features/notes/actions';
import { getProjects } from '@/features/projects/actions';
import { getWorkExperiences } from '@/features/work/actions';
import { getCurrentWorkspaceId } from '@/features/workspaces/actions';
import { NoteList } from '@/features/notes/components/note-list';
import { CreateNoteDialog } from '@/features/notes/components/create-note-dialog';
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

      {/* Note List / Grid */}
      <section>
        <NoteList initialNotes={notes} projects={projects} works={works} tags={tags} />
      </section>
    </AppShell>
  );
}
