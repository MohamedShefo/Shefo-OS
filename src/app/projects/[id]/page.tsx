import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getProjectById } from '@/features/projects/actions';
import { getCapturesByProject } from '@/features/captures/actions';
import { getNotesByProject } from '@/features/notes/actions';
import { getTasksByProject } from '@/features/tasks/actions';
import { CaptureList } from '@/features/captures/components/capture-list';
import { NoteList } from '@/features/notes/components/note-list';
import { TaskList } from '@/features/tasks/components/task-list';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Project Details',
  description: 'Project hub with related captures, notes, and tasks.',
};

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  const [captures, notes, tasks] = await Promise.all([
    getCapturesByProject(id),
    getNotesByProject(id),
    getTasksByProject(id),
  ]);

  return (
    <AppShell userEmail={user.email}>
      {/* Header */}
      <PageHeader
        title={project.name}
        description={project.description || 'Project hub — related captures, notes, and tasks.'}
        actions={
          <>
            <Link href="/projects">
              <Button variant="outline" size="sm">
                All Projects
              </Button>
            </Link>
            <Badge variant="secondary" className="capitalize">
              {project.status}
            </Badge>
          </>
        }
      />

      {/* Related Captures */}
      <section>
        <CaptureList
          initialCaptures={captures}
          projects={[project]}
          heading="Linked Captures"
          emptyTitle="No captures linked."
          emptyDescription="Link captures to this project from Quick Capture."
        />
      </section>

      {/* Related Notes */}
      <section>
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            Linked Notes
            <Badge variant="secondary">{notes.length}</Badge>
          </h2>
        </div>
        <NoteList initialNotes={notes} projects={[project]} />
      </section>

      {/* Related Tasks */}
      <section>
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            Linked Tasks
            <Badge variant="secondary">{tasks.length}</Badge>
          </h2>
        </div>
        <TaskList initialTasks={tasks} projects={[project]} notes={notes} captures={captures} />
      </section>
    </AppShell>
  );
}
