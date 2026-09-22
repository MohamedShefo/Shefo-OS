'use client';

import { useTransition } from 'react';
import { Task, TaskPriority, TaskStatus } from '@/types/database';
import { updateTaskStatus, deleteTask } from '../actions';
import { Button } from '@/components/ui/button';

interface TaskItemProps {
  task: Task;
  projectName?: string | null;
  noteTitle?: string | null;
  sourceCaptureText?: string | null;
}

const priorityColors: Record<TaskPriority, string> = {
  high: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  low: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
};

export function TaskItem({ task, projectName, noteTitle, sourceCaptureText }: TaskItemProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggleDone = () => {
    const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    startTransition(async () => {
      await updateTaskStatus(task.id, nextStatus);
    });
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    startTransition(async () => {
      await updateTaskStatus(task.id, newStatus);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTask(task.id);
    });
  };

  return (
    <div
      className={`group relative flex items-start justify-between p-4 rounded-xl border border-border bg-card shadow-xs hover:border-ring/40 transition-all ${
        task.status === 'done' ? 'opacity-60 bg-muted/30' : ''
      }`}
    >
      <div className="flex items-start gap-3 flex-1 pr-4">
        <input
          type="checkbox"
          checked={task.status === 'done'}
          onChange={handleToggleDone}
          disabled={isPending}
          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-ring/20 cursor-pointer"
        />

        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`font-medium text-sm leading-tight text-foreground ${
                task.status === 'done' ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {task.title}
            </h4>

            {task.priority && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${
                  priorityColors[task.priority]
                }`}
              >
                {task.priority}
              </span>
            )}

            {projectName && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                📁 {projectName}
              </span>
            )}

            {noteTitle && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                📝 {noteTitle}
              </span>
            )}

            {sourceCaptureText && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                📥 {sourceCaptureText}
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {task.description}
            </p>
          )}

          {task.due_date && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              📅 Due {new Date(task.due_date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <select
          value={task.status}
          onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
          disabled={isPending}
          className="rounded bg-muted px-2 py-1 text-[11px] font-medium outline-none cursor-pointer border border-border/50 capitalize"
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
          className="opacity-0 group-hover:opacity-100 h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive transition-all"
        >
          Archive
        </Button>
      </div>
    </div>
  );
}
