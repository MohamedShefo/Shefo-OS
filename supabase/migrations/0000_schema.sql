-- ==============================================================================
-- SHEFO OS V0 DATABASE SCHEMA
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PostgreSQL ENUMs
-- ------------------------------------------------------------------------------

CREATE TYPE capture_status AS ENUM ('unprocessed', 'processed');
CREATE TYPE project_status AS ENUM ('active', 'paused', 'archived');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- ------------------------------------------------------------------------------
-- 2. Timestamp Trigger Function
-- ------------------------------------------------------------------------------

-- Generic function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. Core Tables
-- ------------------------------------------------------------------------------

-- A. Captures
CREATE TABLE captures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    status capture_status DEFAULT 'unprocessed',
    suggested_type TEXT NULL,
    processed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- B. Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NULL,
    status project_status DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- C. Notes
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NULL, -- Content is optional or Markdown
    tags TEXT[] NULL DEFAULT '{}',
    source_capture_id UUID NULL REFERENCES captures(id) ON DELETE SET NULL,
    project_id UUID NULL REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- D. Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NULL,
    status task_status DEFAULT 'todo',
    priority task_priority NULL,
    due_date TIMESTAMPTZ NULL,
    project_id UUID NULL REFERENCES projects(id) ON DELETE SET NULL,
    note_id UUID NULL REFERENCES notes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- ------------------------------------------------------------------------------
-- 4. Triggers for updated_at
-- ------------------------------------------------------------------------------

CREATE TRIGGER set_captures_updated_at
BEFORE UPDATE ON captures
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 5. Indexes
-- ------------------------------------------------------------------------------

-- User ID Indexes (crucial for RLS / isolated querying)
CREATE INDEX idx_captures_user_id ON captures(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);

-- Foreign Key Indexes
CREATE INDEX idx_notes_project_id ON notes(project_id);
CREATE INDEX idx_notes_source_capture_id ON notes(source_capture_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_note_id ON tasks(note_id);

-- Status & Soft Delete Indexes
CREATE INDEX idx_captures_status ON captures(status);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_captures_deleted_at ON captures(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_deleted_at ON notes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NULL;

-- Query-specific Indexes
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- ------------------------------------------------------------------------------
-- 6. Row Level Security (RLS)
-- ------------------------------------------------------------------------------

ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Captures Policies
CREATE POLICY "Users can SELECT their own captures" ON captures FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own captures" ON captures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own captures" ON captures FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own captures" ON captures FOR DELETE USING (auth.uid() = user_id);

-- Projects Policies
CREATE POLICY "Users can SELECT their own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- Notes Policies
CREATE POLICY "Users can SELECT their own notes" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own notes" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own notes" ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own notes" ON notes FOR DELETE USING (auth.uid() = user_id);

-- Tasks Policies
CREATE POLICY "Users can SELECT their own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);
