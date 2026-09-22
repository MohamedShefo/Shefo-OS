export type CaptureStatus = 'unprocessed' | 'processed';
export type ProjectStatus = 'active' | 'paused' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Capture {
  id: string;
  user_id: string;
  raw_text: string;
  status: CaptureStatus;
  suggested_type: string | null;
  processed_at: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  tags: string[] | null;
  source_capture_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  due_date: string | null;
  project_id: string | null;
  note_id: string | null;
  source_capture_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
