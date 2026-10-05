'use client';

import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  deleteNotification,
  getRecentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../actions';
import type { Notification } from '@/types/database';
import { Button } from '@/components/ui/button';

interface PanelPos {
  top: number;
  left: number;
}

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close on route change (adjust state during render — React-recommended pattern)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Compute panel position from bell's bounding rect, clamped to viewport
  const computePos = useCallback((): PanelPos | null => {
    const el = bellRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    const panelW = Math.min(320, window.innerWidth - margin * 2);
    const panelH = Math.min(window.innerHeight * 0.8, 500);
    // Prefer below the bell; if not enough space, place above
    let top = rect.bottom + 8;
    if (top + panelH > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - panelH - 8);
    }
    // Align panel's right edge with bell's right edge, clamped
    let left = rect.right - panelW;
    left = Math.max(margin, Math.min(left, window.innerWidth - panelW - margin));
    return { top, left };
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setPanelPos(computePos());
      if (items === null) {
        setLoading(true);
        startTransition(async () => {
          const list = await getRecentNotifications();
          setItems(list);
          setUnread(list.filter((n) => !n.read_at).length);
          setLoading(false);
        });
      }
    }
  };

  // Re-clamp on resize while open
  useEffect(() => {
    if (!open) return;
    const onResize = () => setPanelPos(computePos());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open, computePos]);

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

  const remove = (id: string, wasUnread: boolean) => {
    startTransition(async () => {
      await deleteNotification(id);
      setItems((prev) => (prev === null ? prev : prev.filter((n) => n.id !== id)));
      if (wasUnread) setUnread((u) => Math.max(0, u - 1));
    });
  };

  return (
    <div className="relative">
      <button
        ref={bellRef}
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

      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              className="fixed z-[71] w-80 max-w-[calc(100vw-16px)] rounded-xl border border-border bg-card p-3 shadow-lg animate-in fade-in zoom-in-95 duration-150 max-h-[80vh] overflow-y-auto"
              style={
                panelPos
                  ? { top: panelPos.top, left: panelPos.left }
                  : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
              }
            >
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
                    const dismiss = (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(n.id, !n.read_at);
                        }}
                        aria-label={`Dismiss ${n.title}`}
                        className="shrink-0 rounded px-1 text-[11px] text-muted-foreground hover:text-destructive"
                      >
                        ✕
                      </button>
                    );
                    const body = (
                      <span className="block min-w-0 flex-1">
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
                      <div
                        key={n.id}
                        className="flex items-start gap-1 rounded-lg border border-border/60 px-2.5 py-2 transition-colors hover:bg-muted/40"
                      >
                        <Link
                          href={n.link_href}
                          onClick={() => {
                            openItem(n.id);
                            setOpen(false);
                          }}
                          className="block min-w-0 flex-1"
                        >
                          {body}
                        </Link>
                        {dismiss}
                      </div>
                    ) : (
                      <div
                        key={n.id}
                        className="flex items-start gap-1 rounded-lg border border-border/60 px-2.5 py-2 transition-colors hover:bg-muted/40"
                      >
                        <button
                          onClick={() => openItem(n.id)}
                          className="block min-w-0 flex-1 text-start"
                        >
                          {body}
                        </button>
                        {dismiss}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
