import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getGoals, getGoalMilestones } from '@/features/goals/actions';
import { goalProgress } from '@/features/goals/progress';
import { GoalList } from '@/features/goals/components/goal-list';
import { GoalDialog } from '@/features/goals/components/goal-dialog';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Goals',
  description: 'Manually tracked outcomes with milestones.',
};

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const goals = await getGoals();
  const milestones = await Promise.all(goals.map((g) => getGoalMilestones(g.id)));
  const progressByGoal: Record<string, number> = {};
  goals.forEach((g, i) => {
    progressByGoal[g.id] = goalProgress(g, milestones[i]);
  });

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Goals"
        description="Outcomes you track by hand — milestones, measurable targets, linked work."
        actions={
          <>
            <Link href="/">
              <Button variant="outline" size="sm">
                Home
              </Button>
            </Link>
            <GoalDialog />
          </>
        }
      />

      <section>
        <GoalList initialGoals={goals} progressByGoal={progressByGoal} />
      </section>
    </AppShell>
  );
}
