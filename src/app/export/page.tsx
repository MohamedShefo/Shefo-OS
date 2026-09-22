import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { ExportPanel } from '@/features/export/components/export-panel';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Export',
  description: 'Download your data in standard formats.',
};

export default async function ExportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Export"
        description="Your data, in standard formats. Spreadsheets, documents, and full backups."
        actions={
          <Link href="/">
            <Button variant="outline" size="sm">
              Home
            </Button>
          </Link>
        }
      />

      <section>
        <ExportPanel />
      </section>
    </AppShell>
  );
}
