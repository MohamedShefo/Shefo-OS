'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/config/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { openCommandPalette } from '@/components/command-palette';
import { WorkspaceSwitcher } from '@/features/workspaces/components/workspace-switcher';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import type { WorkspaceWithRole } from '@/features/workspaces/actions';
import { logout } from '@/app/auth-actions';

interface SidebarProps {
  userEmail?: string | null;
  workspaces?: WorkspaceWithRole[];
  currentWorkspaceId?: string | null;
  unreadCount?: number;
}

export function Sidebar({ userEmail, workspaces = [], currentWorkspaceId = null, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [showFade, setShowFade] = useState(false);

  // Subtle affordance when navigation continues below the fold.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const update = () => {
      setShowFade(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [workspaces.length]);

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex shrink-0 p-4 pb-3 sticky top-0 h-screen">
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-2 py-1 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-xs">
            S
          </div>
          <div>
            <h2 className="font-extrabold text-base tracking-tight text-foreground leading-none">
              Shefo OS
            </h2>
            <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
              Cognitive Cortex
            </span>
          </div>
        </div>

        {/* Navigation Items (scrolls independently; footer stays reachable) */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <nav ref={navRef} aria-label="Primary" className="flex-1 min-h-0 overflow-y-auto space-y-1 pe-1 sidebar-scroll">
            <button
              onClick={openCommandPalette}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all text-muted-foreground hover:bg-muted hover:text-foreground border border-dashed border-border"
            >
              <span className="text-sm">🔍</span>
              <span className="truncate flex-1 text-start">Search or command…</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
            </button>
            {userEmail && workspaces.length > 0 && (
              <div className="px-0 py-1">
                <WorkspaceSwitcher workspaces={workspaces} currentId={currentWorkspaceId} />
              </div>
            )}
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          {showFade && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent"
            />
          )}
        </div>
      </div>

      {/* User Footer & Logout (always reachable) */}
      <div className="border-t border-border pt-3 mt-3 space-y-3 shrink-0">
        {userEmail && (
          <div className="px-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Logged in as</p>
              <p className="text-xs font-semibold text-foreground truncate">{userEmail}</p>
            </div>
            <span className="flex items-center gap-1 shrink-0">
              <NotificationBell initialUnread={unreadCount} />
              <ThemeToggle />
            </span>
          </div>
        )}
        {!userEmail && (
          <div className="px-2 flex justify-end">
            <ThemeToggle />
          </div>
        )}
        {userEmail && (
          <Link
            href="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="text-sm">👤</span>
            <span className="truncate">Profile</span>
          </Link>
        )}
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-muted-foreground hover:text-destructive"
          >
            Sign Out
          </Button>
        </form>
      </div>
    </aside>
  );
}
