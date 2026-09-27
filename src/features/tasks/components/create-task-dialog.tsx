'use client';

import { useState, useTransition, FormEvent } from 'react';
import { createTask, updateTask } from '../actions';
import { Capture, Note, Project, Task, TaskPriority, TaskStatus } from '@/types/database';
import { Button } from '@/components/ui/button';

interface CreateTaskDialogProps {
  projects: Project[];
  notes?: Note[];
  captures?: Capture[];
  task?: Task | null;
  buttonLabel?: string;
  dialogTitle?: string;
  onSuccess?: () => void;
}

export function CreateTaskDialog({ projects, notes = [], captures = [], task = null, buttonLabel, dialogTitle, onSuccess }: CreateTaskDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [priority, setPriority] = useState<TaskPriority | ''>((task?.priority as TaskPriority | '') ?? 'medium');
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.slice(0, 10) : '');
  const [reminderAt, setReminderAt] = useState(task?.reminder_at ? task.reminder_at.slice(0, 16) : '');
  const [recurrence, setRecurrence] = useState(task?.recurrence ?? '');
  const [projectId, setProjectId] = useState<string>(task?.project_id ?? '');
  const [noteId, setNoteId] = useState<string>(task?.note_id ?? '');
  const [sourceCaptureId, setSourceCaptureId] = useState<string>(task?.source_capture_id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isPending) return;
    setError(null);

    const payload = {
      title,
      description,
      status,
      priority: priority ? (priority as TaskPriority) : null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      project_id: projectId || null,
      note_id: noteId || null,
      source_capture_id: sourceCaptureId || null,
      reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
      recurrence: recurrence || null,
    };

    startTransition(async () => {
      const res = task ? await updateTask(task.id, payload) : await createTask(payload);

      if (res.success) {
        if (!task) {
          setTitle('');
          setDescription('');
          setStatus('todo');
          setPriority('medium');
          setDueDate('');
          setReminderAt('');
          setRecurrence('');
          setProjectId('');
          setNoteId('');
          setSourceCaptureId('');
        }
        setIsOpen(false);
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Failed to save task');
      }
    });
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="font-medium" size={task ? 'sm' : 'default'}>
        {buttonLabel ?? (task ? 'Edit' : '+ New Task')}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-lg font-semibold tracking-tight">
            {dialogTitle ?? (task ? 'Edit Task' : 'Create Task')}
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Write migration script, Review pull request..."
              required
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional task details or instructions..."
              rows={3}
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority | '')}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Reminder (Optional)</label>
              <input
                type="datetime-local"
                value={reminderAt}
                onChange={(e) => setReminderAt(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Repeats</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Link Note (Optional)</label>
              <select
                value={noteId}
                onChange={(e) => setNoteId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">No Note Linked</option>
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Source Capture (Optional)
              </label>
              <select
                value={sourceCaptureId}
                onChange={(e) => setSourceCaptureId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">No Capture Linked</option>
                {captures.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.raw_text.length > 40 ? `${c.raw_text.slice(0, 40)}…` : c.raw_text}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isPending}>
              {isPending ? 'Saving…' : task ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
