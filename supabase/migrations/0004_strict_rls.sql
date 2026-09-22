-- ==============================================================================
-- SHEFO OS HARDENING MIGRATION 0004 — strict RLS protections
-- ==============================================================================
-- Remote audit found Row Level Security DISABLED on notes, projects, and tasks
-- (only captures had it enabled), rendering their policies decorative: any
-- holder of the anon key could read/write every row. This migration:
--
-- 1. Enables RLS on all four core tables (idempotent).
-- 2. Replaces the single Dashboard-template FOR ALL policy on each of
--    notes/projects/tasks with four explicit per-command ownership policies:
--      SELECT: USING (auth.uid() = user_id)
--      INSERT: WITH CHECK (auth.uid() = user_id)
--      UPDATE: USING (auth.uid() = user_id) + WITH CHECK (auth.uid() = user_id)
--      DELETE: USING (auth.uid() = user_id)
-- 3. Leaves the already-compliant captures policies untouched.
--
-- No tables, data, indexes, triggers, or other constraints are touched.
-- ------------------------------------------------------------------------------

-- 1. Enforce RLS on all core tables
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 2a. Projects: replace template ALL policy with explicit ownership policies
DROP POLICY IF EXISTS "Enable all actions for users based on user_id" ON projects;

CREATE POLICY "Users can SELECT their own projects"
  ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own projects"
  ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own projects"
  ON projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own projects"
  ON projects FOR DELETE USING (auth.uid() = user_id);

-- 2b. Notes: replace template ALL policy with explicit ownership policies
DROP POLICY IF EXISTS "Enable all actions for users based on user_id" ON notes;

CREATE POLICY "Users can SELECT their own notes"
  ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own notes"
  ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own notes"
  ON notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own notes"
  ON notes FOR DELETE USING (auth.uid() = user_id);

-- 2c. Tasks: replace template ALL policy with explicit ownership policies
DROP POLICY IF EXISTS "Enable all actions for users based on user_id" ON tasks;

CREATE POLICY "Users can SELECT their own tasks"
  ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can INSERT their own tasks"
  ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can UPDATE their own tasks"
  ON tasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can DELETE their own tasks"
  ON tasks FOR DELETE USING (auth.uid() = user_id);
