import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getTrashedItems } from '@/features/trash/actions';
import { TrashList } from '@/features/trash/components/trash-list';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';
import { TRASH_RETENTION_DAYS } from '@/types/lifecycle';

export const metadata = {
  title: 'Trash',
  description: 'Soft-deleted items awaiting permanent deletion.',
};

export default async function TrashPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const items = await getTrashedItems();

  return (
    <AppShell userEmail={user.email}>
      {/* Header */}
      <PageHeader
        title="Trash"
        description={`Restore soft-deleted items or delete them permanently. Items are retained for ${TRASH_RETENTION_DAYS} days.`}
        actions={
          <>
            <Link href="/">
              <Button variant="outline" size="sm">
                Home
              </Button>
            </Link>
          </>
        }
      />

      {/* Trash List / Grid */}
      <section>
        <TrashList initialItems={items} />
      </section>
    </AppShell>
  );
}
