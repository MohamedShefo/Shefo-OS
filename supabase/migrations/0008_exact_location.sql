-- ==============================================================================
-- SHEFO OS PHASE 6 CORRECTION — exact workspace location support
-- ==============================================================================
-- Extends workspace_activity (created in 0006) with precise coordinates and
-- consent bookkeeping. Additive nullable columns only. No RLS/policy changes
-- (existing owner/admin-or-self visibility rules already cover the new
-- columns). Location remains presence-only: never used for authentication.
-- ------------------------------------------------------------------------------

ALTER TABLE workspace_activity
  ADD COLUMN latitude DOUBLE PRECISION NULL,
  ADD COLUMN longitude DOUBLE PRECISION NULL,
  ADD COLUMN location_precision TEXT NULL,
  ADD COLUMN location_consent_at TIMESTAMPTZ NULL,
  ADD COLUMN location_updated_at TIMESTAMPTZ NULL;

ALTER TABLE workspace_activity
  ADD CONSTRAINT chk_location_precision
  CHECK (location_precision IS NULL OR location_precision IN ('approximate', 'exact'));

ALTER TABLE workspace_activity
  ADD CONSTRAINT chk_location_pair
  CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude IS NOT NULL AND longitude IS NOT NULL)
  );
