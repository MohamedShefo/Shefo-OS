import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getTasks } from '@/features/tasks/actions';
import { getProjects } from '@/features/projects/actions';
import { TaskList } from '@/features/tasks/components/task-list';
import { CreateTaskDialog } from '@/features/tasks/components/create-task-dialog';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Tasks',
  description: 'Actionable task tracking and priority management.',
};

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [tasks, projects] = await Promise.all([getTasks(), getProjects()]);

  return (
    <AppShell userEmail={user.email}>
      {/* Header */}
      <PageHeader
        title="Tasks"
        description="Manage your action items, due dates, and task priorities."
        actions={
          <>
            <Link href="/">
              <Button variant="outline" size="sm">
                Home
              </Button>
            </Link>
            <CreateTaskDialog projects={projects} />
          </>
        }
      />

      {/* Task List / Filter View */}
      <section>
        <TaskList initialTasks={tasks} projects={projects} />
      </section>
    </AppShell>
  );
}
