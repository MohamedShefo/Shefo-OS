-- ==============================================================================
-- SHEFO OS CROSS-MODULE LINKING LAYER (Phase: optional nullable relations)
-- ==============================================================================
-- Adds ONLY the missing optional cross-entity references.
-- All relations are nullable; project deletion never deletes linked entities.
-- Existing tables, columns, and 0000_schema.sql remain untouched.
-- NOTE: apply this file to the remote Supabase project (no local runtime here).
-- ------------------------------------------------------------------------------

-- 1. Capture → Project (optional)
ALTER TABLE captures
  ADD COLUMN project_id UUID NULL REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX idx_captures_project_id ON captures(project_id);

-- 2. Task → Source Capture (optional)
ALTER TABLE tasks
  ADD COLUMN source_capture_id UUID NULL REFERENCES captures(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_source_capture_id ON tasks(source_capture_id);
