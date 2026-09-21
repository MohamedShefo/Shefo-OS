'use client';

import { useState } from 'react';
import { Task, Project, TaskStatus, TaskPriority } from '@/types/database';
import { TaskItem } from './task-item';

interface TaskListProps {
  initialTasks: Task[];
  projects: Project[];
}

export function TaskList({ initialTasks, projects }: TaskListProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  const projectsMap: Record<string, string> = {};
  projects.forEach((p) => {
    projectsMap[p.id] = p.name;
  });

  const filteredTasks = initialTasks.filter((task) => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    if (selectedProjectId !== 'all' && task.project_id !== selectedProjectId) return false;
    return true;
  });

  if (initialTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-card/50">
        <p className="text-sm font-medium text-muted-foreground">All tasks complete!</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Click &quot;+ New Task&quot; to add your next action item.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1">
          {(['all', 'todo', 'in_progress', 'done'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Priority & Project Selectors */}
        <div className="flex items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskPriority)}
            className="rounded-md border border-input bg-background px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                📁 {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          No tasks match the selected filters.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              projectName={task.project_id ? projectsMap[task.project_id] : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
