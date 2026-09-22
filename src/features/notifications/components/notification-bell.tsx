'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  getRecentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../actions';
import type { Notification } from '@/types/database';
import { Button } from '@/components/ui/button';

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && items === null) {
      setLoading(true);
      startTransition(async () => {
        const list = await getRecentNotifications();
        setItems(list);
        setUnread(list.filter((n) => !n.read_at).length);
        setLoading(false);
      });
    }
  };

  const openItem = (id: string) => {
    startTransition(async () => {
      await markNotificationRead(id);
      setItems((prev) =>
        prev === null
          ? prev
          : prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnread((u) => Math.max(0, u - 1));
    });
  };

  const markAll = () => {
    startTransition(async () => {
      await markAllNotificationsRead();
      setItems((prev) =>
        prev === null
          ? prev
          : prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      );
      setUnread(0);
    });
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
        title="Notifications"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
      >
        <span aria-hidden="true">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute end-0 top-10 z-[71] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-3 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-xs font-semibold text-foreground">Notifications</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={markAll}
                disabled={isPending || unread === 0}
                className="h-6 px-2 text-[11px]"
              >
                Mark all read
              </Button>
            </div>
            {loading ? (
              <p className="px-1 py-4 text-center text-xs text-muted-foreground animate-pulse">
                Loading…
              </p>
            ) : !items || items.length === 0 ? (
              <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                You are all caught up. Future reminders and updates will appear here.
              </p>
            ) : (
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {items.map((n) => {
                  const body = (
                    <span className="block min-w-0">
                      <span className={`block truncate text-xs font-medium ${n.read_at ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {!n.read_at && <span aria-hidden="true" className="me-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />}
                        {n.title}
                      </span>
                      {n.body && (
                        <span className="block truncate text-[11px] text-muted-foreground">{n.body}</span>
                      )}
                      <span className="block text-[10px] text-muted-foreground/70">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </span>
                  );
                  return n.link_href ? (
                    <Link
                      key={n.id}
                      href={n.link_href}
                      onClick={() => {
                        openItem(n.id);
                        setOpen(false);
                      }}
                      className="block rounded-lg border border-border/60 px-2.5 py-2 transition-colors hover:bg-muted/40"
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      key={n.id}
                      onClick={() => openItem(n.id)}
                      className="block w-full rounded-lg border border-border/60 px-2.5 py-2 text-start transition-colors hover:bg-muted/40"
                    >
                      {body}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
