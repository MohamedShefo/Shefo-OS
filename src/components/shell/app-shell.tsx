import * as React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { CommandPalette } from '@/components/command-palette';
import { FloatingCapture } from '@/components/floating-capture';
import { TimerWidget } from '@/components/timer-widget';
import { ShellTrackers } from '@/components/shell-trackers';
import { getMyWorkspaces, getCurrentWorkspaceId } from '@/features/workspaces/actions';
import { getUnreadCount } from '@/features/notifications/actions';
import { getProfile } from '@/features/profile/actions';

export interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string | null;
}

export async function AppShell({ children, userEmail }: AppShellProps) {
  // Workspace context for the switcher + presence reporting. When nobody is
  // signed in (public landing), skip workspace loading entirely.
  let workspaces: Awaited<ReturnType<typeof getMyWorkspaces>> = [];
  let currentWorkspaceId: string | null = null;
  let unreadCount = 0;
  let avatarUrl: string | null = null;
  let displayName: string | null = null;
  let profile: Awaited<ReturnType<typeof getProfile>> = null;
  if (userEmail) {
    [workspaces, currentWorkspaceId, unreadCount, profile] = await Promise.all([
      getMyWorkspaces(),
      getCurrentWorkspaceId(),
      getUnreadCount(),
      getProfile(),
    ]);
    if (currentWorkspaceId && !workspaces.some((w) => w.id === currentWorkspaceId)) {
      currentWorkspaceId = null;
    }
    avatarUrl = profile?.avatar_url ?? null;
    displayName = profile?.display_name ?? null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row w-full">
      <Sidebar userEmail={userEmail} workspaces={workspaces} currentWorkspaceId={currentWorkspaceId} unreadCount={unreadCount} avatarUrl={avatarUrl} displayName={displayName} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header userEmail={userEmail} workspaces={workspaces} currentWorkspaceId={currentWorkspaceId} unreadCount={unreadCount} avatarUrl={avatarUrl} displayName={displayName} />
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>
      {/* Global shell overlays: palette, capture, timer */}
      <CommandPalette />
      <FloatingCapture />
      <TimerWidget />
      {userEmail && <ShellTrackers workspaceId={currentWorkspaceId} />}
    </div>
  );
}
