'use client';

import { useState } from 'react';
import { Capture, Note, Task, Project, TaskStatus, TaskPriority } from '@/types/database';
import { TaskItem } from './task-item';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';
import { SearchField } from '@/components/common/search-field';
import { matchesQuery } from '@/lib/search';

interface TaskListProps {
  initialTasks: Task[];
  projects: Project[];
  notes?: Note[];
  captures?: Capture[];
}

export function TaskList({ initialTasks, projects, notes = [], captures = [] }: TaskListProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [search, setSearch] = useState('');

  const projectsMap: Record<string, string> = {};
  projects.forEach((p) => {
    projectsMap[p.id] = p.name;
  });

  const notesMap: Record<string, string> = {};
  notes.forEach((n) => {
    notesMap[n.id] = n.title;
  });

  const capturesMap: Record<string, string> = {};
  captures.forEach((c) => {
    capturesMap[c.id] = c.raw_text.length > 40 ? `${c.raw_text.slice(0, 40)}…` : c.raw_text;
  });

  const filteredTasks = initialTasks.filter((task) => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    if (selectedProjectId !== 'all' && task.project_id !== selectedProjectId) return false;
    return matchesQuery([task.title, task.description], search);
  });

  if (initialTasks.length === 0) {
    return (
      <EmptyState
        title="All tasks complete!"
        description='Click "+ New Task" to add your next action item.'
      />
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

        {/* Priority, Project & Text Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <SearchField value={search} onChange={setSearch} placeholder="Search tasks…" />
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskPriority)}
            className="w-auto text-xs"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </Select>

          <Select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-auto text-xs"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                📁 {p.name}
              </option>
            ))}
          </Select>
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
              noteTitle={task.note_id ? notesMap[task.note_id] : null}
              sourceCaptureText={task.source_capture_id ? capturesMap[task.source_capture_id] : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
