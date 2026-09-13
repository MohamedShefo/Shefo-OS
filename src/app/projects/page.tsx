import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getProjects } from '@/features/projects/actions';
import { ProjectList } from '@/features/projects/components/project-list';
import { CreateProjectDialog } from '@/features/projects/components/create-project-dialog';
import { Button } from '@/components/ui/button';

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

  const projects = await getProjects();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Track your initiatives, goals, and active outcomes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm">
                Home
              </Button>
            </Link>
            <CreateProjectDialog />
          </div>
        </div>

        {/* Project List / Grid */}
        <section>
          <ProjectList initialProjects={projects} />
        </section>
      </div>
    </div>
  );
}
