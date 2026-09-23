-- ==============================================================================
-- SHEFO OS PHASE 7 COMPLETION — notification dedupe key
-- ==============================================================================
-- Optional stable reference for idempotent producers (e.g. task reminders):
-- one live notification per (user, ref_key). NULL means "no dedupe".
-- Partial index keeps soft-deleted rows out of the uniqueness scope.
-- ------------------------------------------------------------------------------

ALTER TABLE notifications
  ADD COLUMN ref_key TEXT NULL;

CREATE UNIQUE INDEX uq_notification_ref
  ON notifications(user_id, ref_key)
  WHERE ref_key IS NOT NULL AND deleted_at IS NULL;
