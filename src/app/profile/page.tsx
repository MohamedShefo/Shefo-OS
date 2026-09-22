import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { ensureProfile } from '@/features/profile/actions';
import { ProfileEditor } from '@/features/profile/components/profile-editor';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Profile',
  description: 'Your account profile and avatar.',
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await ensureProfile();

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Profile"
        description="Your display name, username, and avatar. Nothing here is public."
        actions={
          <Link href="/">
            <Button variant="outline" size="sm">
              Home
            </Button>
          </Link>
        }
      />

      <section>
        <ProfileEditor profile={profile} email={user.email ?? null} />
      </section>
    </AppShell>
  );
}
