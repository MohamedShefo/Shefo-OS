import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getSessionInfo } from '@/features/security/account';
import { getSecurityEvents } from '@/features/security/events';
import { ensureDevice, getDevices } from '@/features/devices/actions';
import { MfaManager } from '@/features/security/components/mfa-manager';
import { PasswordForm } from '@/features/security/components/password-form';
import { DevicesManager } from '@/features/devices/components/devices-manager';
import { LocationConsent } from '@/features/activity/components/location-consent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Security',
  description: 'Sessions, devices, verification, and security activity.',
};

export default async function SecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [session, events, current, devices] = await Promise.all([
    getSessionInfo(),
    getSecurityEvents(30),
    ensureDevice(),
    getDevices(),
  ]);

  const currentTrusted = current?.device?.trusted ?? false;

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title="Security"
        description="Sessions, trusted devices, verification, and your security activity."
        actions={
          <Link href="/">
            <Button variant="outline" size="sm">
              Home
            </Button>
          </Link>
        }
      />

      <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Current Session</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </span>
          {session?.expiresAt && (
            <span>· expires {new Date(session.expiresAt * 1000).toLocaleString()}</span>
          )}
          {session?.assurance && (
            <Badge variant="secondary">Assurance: {session.assurance}</Badge>
          )}
        </div>
      </section>

      <section>
        <DevicesManager devices={devices} currentHashKnown={currentTrusted} />
      </section>

      <section>
        <MfaManager />
      </section>

      <section>
        <PasswordForm />
      </section>

      <section>
        <LocationConsent />
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Recent Security Activity
        </h2>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No security events recorded yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs"
              >
                <span className="font-mono text-foreground">{e.event_type}</span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
