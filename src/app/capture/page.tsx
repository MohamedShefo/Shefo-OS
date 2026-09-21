import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getUnprocessedCaptures } from '@/features/captures/actions';
import { CaptureInput } from '@/features/captures/components/capture-input';
import { CaptureList } from '@/features/captures/components/capture-list';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Quick Capture',
  description: 'Quick distraction-free thought capture inbox.',
};

export default async function CapturePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const captures = await getUnprocessedCaptures();

  return (
    <AppShell userEmail={user.email}>
      {/* Page Header */}
      <PageHeader
        title="Quick Capture"
        description="Externalize your thoughts immediately. Process them later."
        actions={
          <Link href="/">
            <Button variant="outline" size="sm">
              Home
            </Button>
          </Link>
        }
      />

      {/* Input Section */}
      <section>
        <CaptureInput />
      </section>

      {/* Unprocessed Inbox List */}
      <section>
        <CaptureList initialCaptures={captures} />
      </section>
    </AppShell>
  );
}
