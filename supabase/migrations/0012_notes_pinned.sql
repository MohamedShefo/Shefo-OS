-- ==============================================================================
-- SHEFO OS PHASE 8 — pinned notes flag
-- ==============================================================================
-- Single additive nullable-safe column for knowledge organization.
-- No RLS/policy changes (existing note ownership rules already cover it).
-- ------------------------------------------------------------------------------

ALTER TABLE notes
  ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_notes_pinned ON notes(user_id, is_pinned) WHERE deleted_at IS NULL;
