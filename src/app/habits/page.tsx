import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getHabits } from '@/features/habits/actions';
import { HabitList } from '@/features/habits/components/habit-list';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Habits',
  description: 'Manual daily habit tracking with streaks.',
};

export default async function HabitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const habits = await getHabits();

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Habits"
        description="Check off each day manually. Streaks build from your own completions."
        actions={
          <Link href="/">
            <Button variant="outline" size="sm">
              Home
            </Button>
          </Link>
        }
      />

      <section>
        <HabitList initialHabits={habits} />
      </section>
    </AppShell>
  );
}
