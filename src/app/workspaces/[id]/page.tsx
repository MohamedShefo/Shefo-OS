import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getWorkspaceById, getWorkspaceMembers } from '@/features/workspaces/actions';
import { getWorkspaceActivity } from '@/features/activity/actions';
import { MemberManager, WorkspaceSettings } from '@/features/workspaces/components/member-manager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/common/page-header';

export const metadata = {
  title: 'Workspace Details',
  description: 'Workspace settings, members, and activity.',
};

interface WorkspaceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkspaceDetailPage({ params }: WorkspaceDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const workspace = await getWorkspaceById(id);
  if (!workspace) {
    notFound();
  }

  const [members, activity] = await Promise.all([
    getWorkspaceMembers(id),
    getWorkspaceActivity(id),
  ]);

  const isOwner = workspace.role === 'owner';

  return (
    <AppShell userEmail={user.email}>
      <PageHeader
        title={`${workspace.type === 'personal' ? '👤' : '🏢'} ${workspace.name}`}
        description={`Your role: ${workspace.role}. Activity below is presence only — never used for security decisions.`}
        actions={
          <>
            <Link href="/workspaces">
              <Button variant="outline" size="sm">
                All Workspaces
              </Button>
            </Link>
            <Badge variant="secondary" className="capitalize">
              {workspace.role}
            </Badge>
          </>
        }
      />

      <section>
        <WorkspaceSettings workspaceId={workspace.id} name={workspace.name} isOwner={isOwner} />
      </section>

      <section>
        <MemberManager
          workspaceId={workspace.id}
          members={members}
          myRole={workspace.role}
          myUserId={user.id}
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          Member Activity
          <Badge variant="secondary">{activity.length}</Badge>
        </h2>
        {activity.length === 0 ? (
          <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {activity.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {a.displayName || 'Member'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Last seen {new Date(a.last_seen_at).toLocaleString()}
                    {a.city_label ? ` · ≈ ${a.city_label}` : ''}
                  </p>
                </div>
                {a.device_label && (
                  <span className="text-[11px] text-muted-foreground shrink-0">{a.device_label}</span>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Location appears only when a member explicitly opts in. Owners and admins can view it;
          other members see their own row only.
        </p>
      </section>
    </AppShell>
  );
}
