'use client';

import { useState, useTransition, FormEvent } from 'react';
import { createEvent, deleteEvent, updateEvent } from '../actions';
import type { CalendarEvent } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20';

function fmtWhen(e: CalendarEvent): string {
  const start = new Date(e.starts_at);
  if (e.is_all_day) return `${start.toLocaleDateString()} · All day`;
  const s = `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (!e.ends_at) return s;
  const end = new Date(e.ends_at);
  return `${s} → ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface EventDialogProps {
  event?: CalendarEvent | null;
  defaultDate?: string | null;
  buttonLabel?: string;
  onSuccess?: () => void;
}

export function EventDialog({ event = null, defaultDate = null, buttonLabel, onSuccess }: EventDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [startsAt, setStartsAt] = useState(
    event ? toLocalInput(event.starts_at) : defaultDate ? `${defaultDate}T09:00` : ''
  );
  const [endsAt, setEndsAt] = useState(event?.ends_at ? toLocalInput(event.ends_at) : '');
  const [allDay, setAllDay] = useState(event?.is_all_day ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startsAt || isPending) return;
    setError(null);
    const payload = {
      title,
      description: description || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: allDay ? null : endsAt ? new Date(endsAt).toISOString() : null,
      is_all_day: allDay,
    };
    startTransition(async () => {
      const res = event ? await updateEvent(event.id, payload) : await createEvent(payload);
      if (res.success) {
        if (!event) {
          setTitle('');
          setDescription('');
          setStartsAt('');
          setEndsAt('');
          setAllDay(false);
        }
        setIsOpen(false);
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Failed to save event');
      }
    });
  };

  const handleDelete = () => {
    if (!event || isPending) return;
    startTransition(async () => {
      await deleteEvent(event.id);
    });
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="font-medium" size={event ? 'sm' : 'default'}>
        {buttonLabel ?? (event ? 'Edit' : '+ New Event')}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-lg font-semibold tracking-tight">{event ? 'Edit Event' : 'New Event'}</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground text-sm font-bold"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isPending}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={isPending}
              className={`${inputClass} resize-y`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Starts *</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                disabled={isPending}
                className={`${inputClass} text-xs`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Ends</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                disabled={isPending || allDay}
                className={`${inputClass} text-xs`}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded border-border cursor-pointer"
            />
            All-day event
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span>
              {event && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Delete
                </Button>
              )}
            </span>
            <span className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || !startsAt || isPending}>
                {isPending ? 'Saving…' : event ? 'Save Changes' : 'Create Event'}
              </Button>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EventList({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No events in view."
        description="Create an event to see it on your calendar."
      />
    );
  }
  return (
    <div className="space-y-2">
      {events.map((e) => (
        <div
          key={e.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3.5 text-xs shadow-xs"
        >
          <div className="min-w-0 space-y-1">
            <p className="font-semibold text-sm text-foreground truncate">{e.title}</p>
            <p className="text-[11px] text-muted-foreground">{fmtWhen(e)}</p>
            {e.description && <p className="text-muted-foreground line-clamp-2">{e.description}</p>}
          </div>
          <span className="flex items-center gap-1.5 shrink-0">
            {e.is_all_day && <Badge variant="secondary">All day</Badge>}
            <EventDialog event={e} buttonLabel="Edit" />
          </span>
        </div>
      ))}
    </div>
  );
}
