import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getGoalById, getGoalMilestones, getGoalRelations } from '@/features/goals/actions';
import { goalProgress, ProgressBar } from '@/features/goals/progress';
import { GoalDialog } from '@/features/goals/components/goal-dialog';
import { MilestonesManager } from '@/features/goals/components/milestones-manager';
import { GoalAttach, toAttachRows } from '@/features/goals/components/goal-attach';
import { GoalProgressEditor } from '@/features/goals/components/goal-progress-editor';
import { getProjects } from '@/features/projects/actions';
import { getTasks } from '@/features/tasks/actions';
import { getNotes } from '@/features/notes/actions';
import { getHabits } from '@/features/habits/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Goal Details',
  description: 'Goal progress, milestones, and linked work.',
};

interface GoalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function GoalDetailPage({ params }: GoalDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const goal = await getGoalById(id);
  if (!goal) {
    notFound();
  }

  const [milestones, relations, allProjects, allTasks, allNotes, allHabits] = await Promise.all([
    getGoalMilestones(id),
    getGoalRelations(id),
    getProjects(),
    getTasks(),
    getNotes(),
    getHabits(),
  ]);

  const pct = goalProgress(goal, milestones);
  const projectRows = toAttachRows(allProjects, id, (p) => p.name, (p) => `/projects/${p.id}`);
  const taskRows = toAttachRows(allTasks, id, (t) => t.title, () => '/tasks');
  const noteRows = toAttachRows(allNotes, id, (n) => n.title, (n) => `/notes/${n.id}`);
  const habitRows = toAttachRows(allHabits, id, (h) => h.name, () => '/habits');

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title={goal.title}
        description={goal.description || 'Goal workspace — progress, milestones, linked work.'}
        actions={
          <>
            <Link href="/goals">
              <Button variant="outline" size="sm">
                All Goals
              </Button>
            </Link>
            <Badge variant="secondary" className="capitalize">
              {goal.status}
            </Badge>
            <GoalDialog goal={goal} buttonLabel="Edit" dialogTitle="Edit Goal" />
          </>
        }
      />

      <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Progress</h2>
          <span className="text-sm font-bold tabular-nums">{pct}%</span>
        </div>
        <ProgressBar value={pct} label={`Goal progress ${pct} percent`} />
        <GoalProgressEditor goal={goal} milestoneCount={milestones.filter((m) => m.is_done).length} milestoneTotal={milestones.length} />
        {(goal.target_date || goal.start_date) && (
          <p className="text-[11px] text-muted-foreground">
            {[goal.start_date, goal.target_date].filter(Boolean).join(' → ')}
            {goal.target_value !== null && goal.target_value !== undefined
              ? ` · target ${goal.target_value}`
              : ''}
          </p>
        )}
      </section>

      <section>
        <MilestonesManager goalId={goal.id} initialMilestones={milestones} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <GoalAttach goalId={goal.id} kind="project" linked={projectRows.linked} candidates={projectRows.candidates} />
        <GoalAttach goalId={goal.id} kind="task" linked={taskRows.linked} candidates={taskRows.candidates} />
        <GoalAttach goalId={goal.id} kind="note" linked={noteRows.linked} candidates={noteRows.candidates} />
        <GoalAttach goalId={goal.id} kind="habit" linked={habitRows.linked} candidates={habitRows.candidates} />
      </div>

      {(relations.projects.length > 0 || relations.tasks.length > 0) && (
        <p className="text-[11px] text-muted-foreground px-1">
          Linked work stays in its own module — goals only reference it. Deleting this goal never
          deletes linked items (links are nullable with SET NULL).
        </p>
      )}
    </AppShell>
  );
}
