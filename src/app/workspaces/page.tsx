import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getMyWorkspaces } from '@/features/workspaces/actions';
import { WorkspaceList } from '@/features/workspaces/components/workspace-list';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Workspaces',
  description: 'Personal and shared workspaces.',
};

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const workspaces = await getMyWorkspaces();

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Workspaces"
        description="Your personal workspace plus any shared workspaces you belong to."
        actions={
          <Link href="/">
            <Button variant="outline" size="sm">
              Home
            </Button>
          </Link>
        }
      />

      <section>
        <WorkspaceList initialWorkspaces={workspaces} />
      </section>
    </AppShell>
  );
}
