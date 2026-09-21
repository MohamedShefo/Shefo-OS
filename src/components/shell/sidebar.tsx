'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/config/navigation';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/auth-actions';

interface SidebarProps {
  userEmail?: string | null;
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col justify-between hidden md:flex shrink-0 min-h-screen p-4 sticky top-0 h-screen">
      <div className="space-y-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-2 py-1">
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

        {/* Navigation Items */}
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
      </div>

      {/* User Footer & Logout */}
      <div className="border-t border-border pt-4 space-y-3">
        {userEmail && (
          <div className="px-2">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Logged in as</p>
            <p className="text-xs font-semibold text-foreground truncate">{userEmail}</p>
          </div>
        )}
        <form action={logout}>
          <Button
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
