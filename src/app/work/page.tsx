import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getWorkExperiences } from '@/features/work/actions';
import { WorkList } from '@/features/work/components/work-list';
import { WorkDialog } from '@/features/work/components/work-dialog';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Work Experience',
  description: 'Workplaces, roles, and professional history.',
};

export default async function WorkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const work = await getWorkExperiences();

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Work Experience"
        description="Workplaces and roles over time. History stays intact when you leave."
        actions={
          <>
            <Link href="/">
              <Button variant="outline" size="sm">
                Home
              </Button>
            </Link>
            <WorkDialog />
          </>
        }
      />

      <section>
        <WorkList initialWork={work} />
      </section>
    </AppShell>
  );
}
