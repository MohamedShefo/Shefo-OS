import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getProjects } from '@/features/projects/actions';
import { getCurrentWorkspaceId } from '@/features/workspaces/actions';
import { ProjectList } from '@/features/projects/components/project-list';
import { CreateProjectDialog } from '@/features/projects/components/create-project-dialog';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Projects',
  description: 'Outcome-oriented project tracking and management.',
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const workspaceId = await getCurrentWorkspaceId();
  const projects = await getProjects(workspaceId);

  return (
    <AppShell userEmail={user.email}>
      {/* Header */}
      <PageHeader
        title="Projects"
        description="Track your initiatives, goals, and active outcomes."
        actions={
          <>
            <Link href="/">
              <Button variant="outline" size="sm">
                Home
              </Button>
            </Link>
            <CreateProjectDialog workspaceId={workspaceId} />
          </>
        }
      />

      {/* Project List / Grid */}
      <section>
        <ProjectList initialProjects={projects} />
      </section>
    </AppShell>
  );
}
