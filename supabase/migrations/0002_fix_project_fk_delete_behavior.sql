-- ==============================================================================
-- SHEFO OS CORRECTIVE MIGRATION 0002
-- Fix project link delete behavior: NO ACTION -> SET NULL
-- ==============================================================================
-- The remote database carried notes_project_id_fkey and tasks_project_id_fkey
-- with ON DELETE NO ACTION, contradicting 0000_schema.sql (SET NULL).
-- This blocked permanent Project deletion whenever linked Notes/Tasks existed.
--
-- Scope is limited to dropping and recreating ONLY these two foreign keys.
-- No tables, data, RLS, indexes, or other constraints are touched.
-- ------------------------------------------------------------------------------

-- 1. Note → Project (optional)
ALTER TABLE notes
  DROP CONSTRAINT notes_project_id_fkey;

ALTER TABLE notes
  ADD CONSTRAINT notes_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- 2. Task → Project (optional)
ALTER TABLE tasks
  DROP CONSTRAINT tasks_project_id_fkey;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
