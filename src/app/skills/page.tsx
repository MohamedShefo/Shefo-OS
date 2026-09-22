import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getSkills, getSkillRelations } from '@/features/skills/actions';
import { SkillList } from '@/features/skills/components/skill-list';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Skills',
  description: 'Lightweight skill inventory linked to work and notes.',
};

export default async function SkillsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const skills = await getSkills();
  const relations = await Promise.all(skills.map((s) => getSkillRelations(s.id)));
  const usageCounts: Record<string, { work: number; notes: number }> = {};
  skills.forEach((s, i) => {
    usageCounts[s.id] = { work: relations[i].work.length, notes: relations[i].notes.length };
  });

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Skills"
        description="A simple inventory of what you know. Link skills to workplaces and notes."
        actions={
          <Link href="/">
            <Button variant="outline" size="sm">
              Home
            </Button>
          </Link>
        }
      />

      <section>
        <SkillList initialSkills={skills} usageCounts={usageCounts} />
      </section>
    </AppShell>
  );
}
