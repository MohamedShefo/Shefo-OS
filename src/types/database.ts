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
  work_experience_id: string | null;
  workspace_id: string | null;
  goal_id: string | null;
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
  work_experience_id: string | null;
  note_type: string | null;
  workspace_id: string | null;
  goal_id: string | null;
  is_pinned: boolean;
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
  goal_id: string | null;
  reminder_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WorkExperience {
  id: string;
  user_id: string;
  organization: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  responsibilities: string | null;
  key_people: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  entry_date: string;
  title: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency: string;
  is_active: boolean;
  goal_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface HabitCompletion {
  id: string;
  user_id: string;
  habit_id: string;
  completion_date: string;
  created_at: string;
}

export type NoteBlockType = 'text' | 'heading' | 'list';

export interface NoteBlock {
  id: string;
  user_id: string;
  note_id: string;
  block_type: string;
  content: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface NoteLink {
  id: string;
  user_id: string;
  from_note_id: string;
  to_note_id: string;
  created_at: string;
}

export interface WorkExperienceSkill {
  id: string;
  user_id: string;
  work_experience_id: string;
  skill_id: string;
  created_at: string;
}

export interface NoteSkill {
  id: string;
  user_id: string;
  note_id: string;
  skill_id: string;
  created_at: string;
}

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  start_date: string | null;
  target_date: string | null;
  target_value: number | null;
  current_value: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface GoalMilestone {
  id: string;
  user_id: string;
  goal_id: string;
  title: string;
  is_done: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export type FinanceType = 'income' | 'expense';

export interface FinanceTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  transaction_date: string;
  category: string | null;
  description: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type DashboardMode = 'normal' | 'focus';

export interface DashboardState {
  id: string;
  user_id: string;
  mode: string;
  widgets: string[];
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Membership {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface TrustedDevice {
  id: string;
  user_id: string;
  device_label: string | null;
  device_hash: string;
  trusted: boolean;
  created_at: string;
  last_seen_at: string;
}

export interface SecurityEvent {
  id: string;
  user_id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WorkspaceActivity {
  id: string;
  workspace_id: string;
  user_id: string;
  last_seen_at: string;
  city_label: string | null;
  device_label: string | null;
  share_location: boolean;
  latitude: number | null;
  longitude: number | null;
  location_precision: string | null;
  location_consent_at: string | null;
  location_updated_at: string | null;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link_href: string | null;
  ref_key: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  is_all_day: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type AttachmentEntity = 'project' | 'note' | 'task' | 'capture';

export interface Attachment {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
}
