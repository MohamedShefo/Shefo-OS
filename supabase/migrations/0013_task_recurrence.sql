-- ==============================================================================
-- SHEFO OS PHASE 9 — recurring tasks
-- ==============================================================================
-- Two additive nullable columns on tasks only. Recurrence is a simple rule
-- label (daily/weekly/monthly); occurrence lineage is tracked through
-- parent_task_id so completing an occurrence never corrupts or duplicates
-- the series. No RLS/policy changes (existing task ownership rules cover it).
-- ------------------------------------------------------------------------------

ALTER TABLE tasks
  ADD COLUMN recurrence TEXT NULL;
ALTER TABLE tasks
  ADD COLUMN parent_task_id UUID NULL REFERENCES tasks(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD CONSTRAINT chk_task_recurrence
  CHECK (recurrence IS NULL OR recurrence IN ('daily', 'weekly', 'monthly'));

CREATE INDEX idx_tasks_recurrence ON tasks(user_id, recurrence) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
