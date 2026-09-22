import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getProjects } from '@/features/projects/actions';
import { ProjectList } from '@/features/projects/components/project-list';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';
import { classifyPara } from '@/types/para';

export const metadata = {
  title: 'Archives',
  description: 'Paused and completed work kept for reference.',
};

export default async function ArchivesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const projects = await getProjects();
  const archived = projects.filter((p) => classifyPara('project', p.status, p.deleted_at) === 'archives');

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Archives"
        description="Paused and completed projects, kept for reference. Archive is not Trash — items here are intact and restorable."
        actions={
          <Link href="/projects">
            <Button variant="outline" size="sm">
              All Projects
            </Button>
          </Link>
        }
      />

      <section>
        <ProjectList
          initialProjects={archived}
          heading="Archived Projects"
          emptyTitle="Nothing archived."
          emptyDescription="Pause or complete a project and it will rest here — separate from Trash."
        />
      </section>
    </AppShell>
  );
}
