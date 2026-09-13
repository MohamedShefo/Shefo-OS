import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getTasks } from '@/features/tasks/actions';
import { getProjects } from '@/features/projects/actions';
import { TaskList } from '@/features/tasks/components/task-list';
import { CreateTaskDialog } from '@/features/tasks/components/create-task-dialog';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
            <p className="text-sm text-muted-foreground">
              Manage your action items, due dates, and task priorities.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm">
                Home
              </Button>
            </Link>
            <CreateTaskDialog projects={projects} />
          </div>
        </div>

        {/* Task List / Filter View */}
        <section>
          <TaskList initialTasks={tasks} projects={projects} />
        </section>
      </div>
    </div>
  );
}
