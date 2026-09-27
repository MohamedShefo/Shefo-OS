-- ==============================================================================
-- Goal Target Value becomes free-form text (e.g. "5000", "10 chapters",
-- "Complete 80%"). The existing column is widened in place — no new field —
-- and existing numeric values are preserved via a safe cast.
-- ------------------------------------------------------------------------------

ALTER TABLE public.goals
  ALTER COLUMN target_value TYPE TEXT USING target_value::text;
