'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/config/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { openCommandPalette } from '@/components/command-palette';
import { WorkspaceSwitcher } from '@/features/workspaces/components/workspace-switcher';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import type { WorkspaceWithRole } from '@/features/workspaces/actions';

interface HeaderProps {
  userEmail?: string | null;
  workspaces?: WorkspaceWithRole[];
  currentWorkspaceId?: string | null;
  unreadCount?: number;
}

export function Header({ userEmail, workspaces = [], currentWorkspaceId = null, unreadCount = 0 }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="md:hidden border-b border-border bg-card px-4 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
            S
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground">Shefo OS</span>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="h-8 px-2.5 text-xs font-semibold"
        >
          {mobileMenuOpen ? '✕ Close' : '☰ Menu'}
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={openCommandPalette}
          className="flex flex-1 items-center gap-2 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        >
          <span aria-hidden="true">🔍</span>
          <span className="truncate">Search or command…</span>
        </button>
        {userEmail && <NotificationBell initialUnread={unreadCount} />}
        <ThemeToggle />
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="pt-4 pb-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 border-t border-border mt-3 max-h-[70vh] overflow-y-auto">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {userEmail && (
            <div className="px-3 pt-2 text-[11px] text-muted-foreground border-t border-border/50 space-y-2">
              <div>
                User: <span className="font-medium text-foreground">{userEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                {workspaces.length > 0 && (
                  <div className="flex-1">
                    <WorkspaceSwitcher workspaces={workspaces} currentId={currentWorkspaceId} />
                  </div>
                )}
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground shrink-0"
                >
                  👤 Profile
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
